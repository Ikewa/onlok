const axios = require('axios');
const crypto = require('crypto');
const pool = require('../config/db');
const paystackPlanService = require('../utils/paystackPlanService');
const { generateVendorId } = require('../utils/generateId');
const { generateQRCode } = require('../utils/qrCodeGenerator');
const { sendEmail } = require('../utils/emailService');

// @desc    Initialize a 3-Tier subscription payment session
// @route   POST /api/payments/initialize
// @access  Private
const initializePayment = async (req, res) => {
    try {
        const { email, amount, plan, billingCycle, referrerId } = req.body; 
        const userId = req.user.id;
        const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

        if (!PAYSTACK_SECRET) {
            console.error('Initialize Payment Error: PAYSTACK_SECRET_KEY is missing in server environment');
            return res.status(500).json({ message: 'Paystack secret key is missing in server environment' });
        }

        // Tier Eligibility Check
        const [userRows] = await pool.query(`
            SELECT u.badge_type, v.assigned_tier 
            FROM users u 
            LEFT JOIN verifications v ON v.user_id = u.id 
            WHERE u.id = ?
            ORDER BY v.id DESC LIMIT 1
        `, [userId]);
        
        const userInfo = userRows[0] || {};
        const minEligibleTier = (userInfo.badge_type || userInfo.assigned_tier || 'bronze').toLowerCase();
        
        const reqConfig = paystackPlanService.resolveTierConfig(plan || minEligibleTier, billingCycle);
        const minConfig = paystackPlanService.resolveTierConfig(minEligibleTier, billingCycle);
        
        const tiers = ['bronze', 'silver', 'gold'];
        if (tiers.indexOf(reqConfig.tier) < tiers.indexOf(minConfig.tier)) {
            return res.status(400).json({ message: `You are not eligible to subscribe to a tier lower than your assigned tier (${minConfig.tier}).` });
        }

        // Get or create Paystack plan_code for the requested tier & billing cycle
        let planCode = null;
        let tierConfig = null;
        try {
            const planResult = await paystackPlanService.getOrCreatePlanCode(reqConfig.tier, billingCycle || 'annually');
            planCode = planResult.plan_code;
            tierConfig = planResult.config;
        } catch (planErr) {
            console.warn('Initialize Payment Warning: Could not retrieve Paystack plan_code, proceeding with direct charge:', planErr.message);
        }

        const finalAmount = tierConfig ? tierConfig.amount : (amount || 10000);
        const amountInKobo = Math.round(finalAmount * 100);

        const metadata = {
            user_id: userId,
            plan: tierConfig ? tierConfig.plan_name : (plan || 'Verified Vendor'),
            tier: tierConfig ? tierConfig.tier : 'bronze',
            billing_cycle: tierConfig ? tierConfig.interval : (billingCycle || 'annually'),
            amount: finalAmount,
            referrer_id: referrerId || null
        };

        const payload = {
            email: email || req.user.email,
            amount: amountInKobo,
            metadata,
            callback_url: `${process.env.CORS_ORIGIN || 'https://onlok.net'}/payment-success`
        };

        if (planCode) {
            payload.plan = planCode;
        }

        const response = await axios.post(
            'https://api.paystack.co/transaction/initialize',
            payload,
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.status(200).json({
            status: true,
            message: 'Payment initialized successfully',
            data: response.data.data
        });
    } catch (error) {
        console.error('Initialize Payment Error:', error.response?.data || error.message);
        const errorMsg = error.response?.data?.message || error.message || 'Failed to initialize payment';
        res.status(500).json({ message: 'Failed to initialize payment', error: errorMsg, details: error.response?.data });
    }
};

// @desc    Verify payment & provision subscription
// @route   GET /api/payments/verify/:reference
// @access  Private
const verifyPayment = async (req, res) => {
    const { reference } = req.params;
    try {
        const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

        if (!PAYSTACK_SECRET) {
            console.error('Verify Payment Error: PAYSTACK_SECRET_KEY is missing in server environment');
            return res.status(500).json({ message: 'Paystack secret key is missing in server environment' });
        }

        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
            {
                headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
                timeout: 15000,
            }
        );

        const data = response.data.data;
        if (data.status === 'success') {
            const { metadata, amount, customer, authorization, plan, subscription_code } = data;

            const userId       = metadata?.user_id   || req.user?.id;
            const tier         = metadata?.tier      || 'bronze';
            const planName     = metadata?.plan      || 'Verified Vendor';
            const billingCycle = metadata?.billing_cycle || 'annually';
            const referrerId   = metadata?.referrer_id   || null;
            const amountPaid   = metadata?.amount        || (amount / 100);

            if (!userId) {
                console.error(`Verify Payment Error: Could not determine userId for ref "${reference}"`);
                return res.status(400).json({ status: false, message: 'User ID missing in transaction metadata' });
            }

            // Provision / Update Subscription safely
            await processSuccessfulSubscription({
                userId,
                tier,
                planName,
                billingCycle,
                amountPaid,
                referrerId,
                paystackSubCode:  subscription_code             || null,
                paystackPlanCode: plan?.plan_code               || null,
                paystackAuthCode: authorization?.authorization_code || null,
                customerCode:     customer?.customer_code       || null,
            });

            const [userRows] = await pool.query('SELECT id, first_name, last_name, email, role, status, badge_type, vendor_id FROM users WHERE id = ?', [userId]);

            return res.status(200).json({
                status: true,
                message: 'Payment verified and subscription activated',
                provisioned: true,
                user: userRows[0] || null,
                data,
            });
        } else {
            return res.status(400).json({ status: false, message: 'Payment not successful', data });
        }

    } catch (error) {
        console.error(`Verify Payment Error for ref "${reference}":`, error.response?.data || error.message || error);
        const paystackStatus = error.response?.status;
        const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
        const isPaystackDown = isTimeout || (paystackStatus && paystackStatus >= 500);

        if (isPaystackDown) {
            return res.status(503).json({
                message: 'Paystack is temporarily unavailable. Your payment was received — please try again in a moment to activate your subscription.',
                retryable: true,
            });
        }

        res.status(500).json({ message: 'Failed to verify payment', error: error.message });
    }
};

// Helper: Provision user tier, badge, subscription record & referral reward safely (Idempotent)
const processSuccessfulSubscription = async ({ userId, tier, planName, billingCycle, amountPaid, referrerId, paystackSubCode, paystackPlanCode, paystackAuthCode, customerCode }) => {
    if (!userId) {
        console.error(`Process Subscription Error: Aborting because userId is empty/undefined`);
        return;
    }

    try {
        const normalizedTier = (tier || 'bronze').toLowerCase();
        const cycle = (billingCycle || 'annually').toLowerCase() === 'monthly' ? 'monthly' : 'annually';
        const expiresDays = cycle === 'monthly' ? 30 : 365;

        // Calculate expiration date
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + expiresDays);

        // 1. Upsert Subscriptions table
        const [subRows] = await pool.query(
            'SELECT id FROM subscriptions WHERE user_id = ? AND status = "active"',
            [userId]
        );

        let subscriptionId = null;
        if (subRows.length > 0) {
            subscriptionId = subRows[0].id;
            await pool.query(
                `UPDATE subscriptions 
                 SET tier = ?, plan_name = ?, billing_cycle = ?, amount = ?, status = 'active',
                     paystack_subscription_code = COALESCE(?, paystack_subscription_code),
                     paystack_plan_code = COALESCE(?, paystack_plan_code),
                     paystack_authorization_code = COALESCE(?, paystack_authorization_code),
                     paystack_customer_code = COALESCE(?, paystack_customer_code),
                     next_payment_date = ?
                 WHERE id = ?`,
                [normalizedTier, planName || 'Verified Vendor', cycle, amountPaid, paystackSubCode || null, paystackPlanCode || null, paystackAuthCode || null, customerCode || null, expirationDate, subscriptionId]
            );
        } else {
            const [insertSub] = await pool.query(
                `INSERT INTO subscriptions 
                 (user_id, tier, plan_name, billing_cycle, amount, status, paystack_subscription_code, paystack_plan_code, paystack_authorization_code, paystack_customer_code, next_payment_date)
                 VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
                [userId, normalizedTier, planName || 'Verified Vendor', cycle, amountPaid, paystackSubCode || null, paystackPlanCode || null, paystackAuthCode || null, customerCode || null, expirationDate]
            );
            subscriptionId = insertSub.insertId;
        }

        // 2. Update Users table with active badge_type, subscription ID & status
        await pool.query(
            `UPDATE users 
             SET badge_type = ?, active_subscription_id = ?, subscription_expires_at = ?, status = 'verified' 
             WHERE id = ?`,
            [normalizedTier, subscriptionId, expirationDate, userId]
        );

        // 3. Update Verifications table status to payment_received
        await pool.query(
            `UPDATE verifications 
             SET payment_status = 'paid', status = 'payment_received', assigned_tier = ? 
             WHERE user_id = ?`,
            [normalizedTier, userId]
        );

        // 4. Upsert Badge in badges table
        const [existingBadge] = await pool.query('SELECT id FROM badges WHERE user_id = ?', [userId]);
        if (existingBadge.length > 0) {
            await pool.query('UPDATE badges SET badge_type = ?, issued_at = CURRENT_TIMESTAMP WHERE user_id = ?', [normalizedTier, userId]);
        } else {
            await pool.query('INSERT INTO badges (user_id, badge_type) VALUES (?, ?)', [userId, normalizedTier]);
        }

        // 5. Generate Onlok Vendor ID if user doesn't have one yet
        const [userRows] = await pool.query('SELECT vendor_id, first_name, last_name, email, business_name, referred_by FROM users WHERE id = ?', [userId]);
        const userInfo = userRows[0] || {};
        let finalVendorId = userInfo.vendor_id;

        if (!finalVendorId) {
            finalVendorId = await generateVendorId();
            await pool.query('UPDATE users SET vendor_id = ? WHERE id = ?', [finalVendorId, userId]);
        }

        // 6. Create vendor_profile + QR code if one doesn't exist yet
        const [existingProfile] = await pool.query('SELECT id FROM vendor_profiles WHERE user_id = ?', [userId]);
        if (existingProfile.length === 0) {
            const profileLink = `${process.env.CORS_ORIGIN || 'https://onlok.net'}/vendor/${finalVendorId}`;
            let qrCodeUrl = null;
            try {
                qrCodeUrl = await generateQRCode(profileLink);
            } catch (qrErr) {
                console.warn(`Process Subscription Warning: QR code generation failed for user #${userId}:`, qrErr.message);
            }
            await pool.query(
                'INSERT IGNORE INTO vendor_profiles (user_id, profile_link, qr_code_url) VALUES (?, ?, ?)',
                [userId, profileLink, qrCodeUrl]
            );
        }

        // 7. Referral commission
        let actualReferrerId = referrerId;
        if (!actualReferrerId && userInfo.referred_by) {
            actualReferrerId = userInfo.referred_by;
        }

        if (actualReferrerId) {
            const commission = amountPaid * 0.12; // 12% commission
            const [existingRef] = await pool.query(
                'SELECT id, status FROM referrals WHERE referred_user_id = ?',
                [userId]
            );

            if (existingRef.length > 0) {
                await pool.query(
                    `UPDATE referrals 
                     SET status = 'available', subscription_plan = ?, amount_paid = ?, commission_earned = ?
                     WHERE referred_user_id = ? AND status = 'pending'`,
                    [planName || 'Verified Vendor', amountPaid, commission, userId]
                );
            } else {
                await pool.query(
                    `INSERT INTO referrals (referrer_id, referred_user_id, subscription_plan, amount_paid, commission_earned, status)
                     VALUES (?, ?, ?, ?, ?, 'available')`,
                    [actualReferrerId, userId, planName || 'Verified Vendor', amountPaid, commission]
                );
            }
        }

        // 8. Send confirmation email to the vendor
        try {
            const tierLabel = normalizedTier.charAt(0).toUpperCase() + normalizedTier.slice(1);
            const confirmHtml = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #0F172A;">🎉 Welcome to Onlok, ${userInfo.first_name}!</h2>
                    <p>Your subscription is now <strong>active</strong>.</p>
                    <table style="width:100%; border-collapse:collapse; margin: 16px 0;">
                        <tr><td style="padding:8px; border:1px solid #e2e8f0;"><strong>Onlok ID</strong></td><td style="padding:8px; border:1px solid #e2e8f0;">${finalVendorId}</td></tr>
                        <tr><td style="padding:8px; border:1px solid #e2e8f0;"><strong>Plan</strong></td><td style="padding:8px; border:1px solid #e2e8f0;">${planName || 'Verified Vendor'} (${tierLabel})</td></tr>
                        <tr><td style="padding:8px; border:1px solid #e2e8f0;"><strong>Amount Paid</strong></td><td style="padding:8px; border:1px solid #e2e8f0;">₦${Number(amountPaid).toLocaleString()}</td></tr>
                    </table>
                    <p>You can now log in to your dashboard using your Onlok ID: <strong>${finalVendorId}</strong></p>
                    <br/>
                    <p>Best regards,<br/><strong>The Onlok Team</strong></p>
                </div>
            `;
            await sendEmail(userInfo.email, 'Your Onlok Subscription is Active', confirmHtml);
        } catch (emailErr) {
            console.warn('Process Subscription Warning: Confirmation email failed:', emailErr.message);
        }

    } catch (procError) {
        console.error(`Process Subscription Exception for user #${userId}:`, procError);
        throw procError;
    }
};

// Webhook handler for Paystack events
const paystackWebhook = async (req, res) => {
    try {
        const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
        const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
        const hash = crypto.createHmac('sha512', PAYSTACK_SECRET).update(rawBody).digest('hex');
        
        if (hash === req.headers['x-paystack-signature']) {
            const event = req.body;

            if (event.event === 'charge.success') {
                const { reference, metadata, amount, customer, authorization, plan, subscription_code } = event.data;
                const userId = metadata?.user_id;
                const planName = metadata?.plan || 'Verified Vendor';
                const tier = metadata?.tier || 'bronze';
                const billingCycle = metadata?.billing_cycle || 'annually';
                const referrerId = metadata?.referrer_id;
                const amountPaid = metadata?.amount || (amount / 100);

                await processSuccessfulSubscription({
                    userId,
                    tier,
                    planName,
                    billingCycle,
                    amountPaid,
                    referrerId,
                    paystackSubCode: subscription_code || null,
                    paystackPlanCode: plan?.plan_code || null,
                    paystackAuthCode: authorization?.authorization_code || null,
                    customerCode: customer?.customer_code || null
                });

            } else if (event.event === 'subscription.create') {
                const { subscription_code, email_token, customer, next_payment_date } = event.data;

                await pool.query(
                    `UPDATE subscriptions 
                     SET paystack_email_token = ?, status = 'active', next_payment_date = ? 
                     WHERE paystack_subscription_code = ? OR paystack_customer_code = ?`,
                    [email_token, next_payment_date ? new Date(next_payment_date) : null, subscription_code, customer?.customer_code || '']
                );

            } else if (event.event === 'subscription.disable') {
                const { subscription_code } = event.data;

                await pool.query(
                    `UPDATE subscriptions SET status = 'cancelled' WHERE paystack_subscription_code = ?`,
                    [subscription_code]
                );

            } else if (event.event === 'invoice.payment_failed') {
                const { subscription_code } = event.data;

                await pool.query(
                    `UPDATE subscriptions SET status = 'attention' WHERE paystack_subscription_code = ?`,
                    [subscription_code]
                );

            } else if (event.event === 'transfer.success') {
                const { reference, transfer_code } = event.data;
                
                await pool.query(
                    `UPDATE withdrawals 
                     SET status = 'paid', transfer_code = ?, failure_reason = NULL 
                     WHERE (transfer_reference = ? OR transfer_code = ?) AND status != 'paid'`,
                    [transfer_code, reference, transfer_code]
                );

            } else if (event.event === 'transfer.failed') {
                const { reference, transfer_code, reason, gateway_response } = event.data;
                const failureMsg = reason || gateway_response || 'Paystack transfer failed';

                await pool.query(
                    `UPDATE withdrawals 
                     SET status = 'failed', failure_reason = ? 
                     WHERE (transfer_reference = ? OR transfer_code = ?) AND status != 'paid'`,
                    [failureMsg, reference, transfer_code]
                );
            }
        } else {
            console.warn('Paystack Webhook Warning: Signature mismatch — event ignored.');
        }
        res.sendStatus(200);
    } catch (error) {
        console.error('Paystack Webhook Error:', error);
        res.sendStatus(500);
    }
};

module.exports = {
    initializePayment,
    verifyPayment,
    paystackWebhook
};
