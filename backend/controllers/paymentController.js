const axios = require('axios');
const crypto = require('crypto');
const pool = require('../config/db');
const paystackPlanService = require('../utils/paystackPlanService');

// @desc    Initialize a 3-Tier subscription payment session
// @route   POST /api/payments/initialize
// @access  Private
const initializePayment = async (req, res) => {
    try {
        const { email, amount, plan, billingCycle, referrerId } = req.body; 
        const userId = req.user.id;
        const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

        if (!PAYSTACK_SECRET) {
            return res.status(500).json({ message: 'Paystack secret key is missing in server environment' });
        }

        // Get or create Paystack plan_code for the requested tier & billing cycle
        let planCode = null;
        let tierConfig = null;
        try {
            const planResult = await paystackPlanService.getOrCreatePlanCode(plan || 'Verified Vendor', billingCycle || 'annually');
            planCode = planResult.plan_code;
            tierConfig = planResult.config;
        } catch (planErr) {
            console.warn('[PaymentController] Could not retrieve Paystack plan_code, proceeding with direct charge:', planErr.message);
        }

        const finalAmount = tierConfig ? tierConfig.amount : (amount || 10000);
        const amountInKobo = Math.round(finalAmount * 100);

        const payload = {
            email: email || req.user.email,
            amount: amountInKobo,
            metadata: {
                user_id: userId,
                plan: tierConfig ? tierConfig.plan_name : (plan || 'Verified Vendor'),
                tier: tierConfig ? tierConfig.tier : 'bronze',
                billing_cycle: tierConfig ? tierConfig.interval : (billingCycle || 'annually'),
                amount: finalAmount,
                referrer_id: referrerId || null
            },
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

// @desc    Verify payment manually (fallback if webhook is delayed)
// @route   GET /api/payments/verify/:reference
// @access  Public / Private
const verifyPayment = async (req, res) => {
    try {
        const { reference } = req.params;
        const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET}`
                }
            }
        );

        const data = response.data.data;
        if (data.status === 'success') {
            res.status(200).json({ status: true, message: 'Payment successful', data });
        } else {
            res.status(400).json({ status: false, message: 'Payment not successful', data });
        }
    } catch (error) {
        console.error('Verify Payment Error:', error.response?.data || error.message);
        res.status(500).json({ message: 'Failed to verify payment' });
    }
};

// Helper: Provision user tier, badge, subscription record & referral reward safely (Idempotent)
const processSuccessfulSubscription = async ({ userId, tier, planName, billingCycle, amountPaid, referrerId, paystackSubCode, paystackPlanCode, paystackAuthCode, customerCode }) => {
    if (!userId) return;

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

    // 3. Update Verifications table status to approved
    await pool.query(
        `UPDATE verifications 
         SET payment_status = 'paid', status = 'approved', assigned_tier = ? 
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

    // 5. Calculate & Record 12% Referral Commission (Idempotent: prevent duplicate commission)
    let actualReferrerId = referrerId;
    if (!actualReferrerId) {
        const [uRows] = await pool.query('SELECT referred_by FROM users WHERE id = ?', [userId]);
        if (uRows.length > 0 && uRows[0].referred_by) {
            actualReferrerId = uRows[0].referred_by;
        }
    }

    if (actualReferrerId) {
        const [existingRef] = await pool.query(
            'SELECT id FROM referrals WHERE referred_user_id = ?',
            [userId]
        );
        if (existingRef.length === 0) {
            const commission = amountPaid * 0.12; // 12% commission
            await pool.query(
                `INSERT INTO referrals (referrer_id, referred_user_id, subscription_plan, amount_paid, commission_earned, status)
                 VALUES (?, ?, ?, ?, ?, 'available')`,
                [actualReferrerId, userId, planName || 'Verified Vendor', amountPaid, commission]
            );
            console.log(`[Referral Reward] Credited ₦${commission} commission to referrer #${actualReferrerId} for user #${userId}`);
        }
    }
};

// Webhook handler for Paystack events
const paystackWebhook = async (req, res) => {
    try {
        const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
        const hash = crypto.createHmac('sha512', PAYSTACK_SECRET).update(JSON.stringify(req.body)).digest('hex');
        
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

                console.log(`[Paystack Webhook] Charge Success for user #${userId}, Ref: ${reference}, Tier: ${tier}`);

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
                console.log(`[Paystack Webhook] Subscription Created: ${subscription_code}`);

                await pool.query(
                    `UPDATE subscriptions 
                     SET paystack_email_token = ?, status = 'active', next_payment_date = ? 
                     WHERE paystack_subscription_code = ? OR paystack_customer_code = ?`,
                    [email_token, next_payment_date ? new Date(next_payment_date) : null, subscription_code, customer?.customer_code || '']
                );

            } else if (event.event === 'subscription.disable') {
                const { subscription_code } = event.data;
                console.log(`[Paystack Webhook] Subscription Disabled: ${subscription_code}`);

                await pool.query(
                    `UPDATE subscriptions SET status = 'cancelled' WHERE paystack_subscription_code = ?`,
                    [subscription_code]
                );

            } else if (event.event === 'invoice.payment_failed') {
                const { subscription_code } = event.data;
                console.log(`[Paystack Webhook] Invoice Payment Failed for sub: ${subscription_code}`);

                await pool.query(
                    `UPDATE subscriptions SET status = 'attention' WHERE paystack_subscription_code = ?`,
                    [subscription_code]
                );

            } else if (event.event === 'transfer.success') {
                const { reference, transfer_code } = event.data;
                console.log(`[Paystack Webhook] Transfer successful: Ref: ${reference}, Code: ${transfer_code}`);
                
                await pool.query(
                    `UPDATE withdrawals 
                     SET status = 'paid', transfer_code = ?, failure_reason = NULL 
                     WHERE (transfer_reference = ? OR transfer_code = ?) AND status != 'paid'`,
                    [transfer_code, reference, transfer_code]
                );

                await pool.query(
                    'INSERT INTO audit_logs (user_id, action, severity, details) VALUES (NULL, ?, ?, ?)',
                    ['Transfer Success Webhook', 'LOW', `Paystack transfer succeeded. Ref: ${reference}, Code: ${transfer_code}`]
                );

            } else if (event.event === 'transfer.failed') {
                const { reference, transfer_code, reason, gateway_response } = event.data;
                const failureMsg = reason || gateway_response || 'Paystack transfer failed';
                console.log(`[Paystack Webhook] Transfer failed: Ref: ${reference}, Reason: ${failureMsg}`);

                await pool.query(
                    `UPDATE withdrawals 
                     SET status = 'failed', failure_reason = ? 
                     WHERE (transfer_reference = ? OR transfer_code = ?) AND status != 'paid'`,
                    [failureMsg, reference, transfer_code]
                );

                await pool.query(
                    'INSERT INTO audit_logs (user_id, action, severity, details) VALUES (NULL, ?, ?, ?)',
                    ['Transfer Failed Webhook', 'MEDIUM', `Paystack transfer failed. Ref: ${reference}. Reason: ${failureMsg}`]
                );

            } else if (event.event === 'transfer.reversed') {
                const { reference, transfer_code, reason } = event.data;
                const reversalMsg = reason || 'Paystack transfer reversed';
                console.log(`[Paystack Webhook] Transfer reversed: Ref: ${reference}`);

                await pool.query(
                    `UPDATE withdrawals 
                     SET status = 'reversed', failure_reason = ? 
                     WHERE (transfer_reference = ? OR transfer_code = ?)`,
                    [reversalMsg, reference, transfer_code]
                );

                await pool.query(
                    'INSERT INTO audit_logs (user_id, action, severity, details) VALUES (NULL, ?, ?, ?)',
                    ['Transfer Reversed Webhook', 'HIGH', `Paystack transfer reversed. Ref: ${reference}. Reason: ${reversalMsg}`]
                );
            }
        }
        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook Error:', error);
        res.sendStatus(500);
    }
};

module.exports = {
    initializePayment,
    verifyPayment,
    paystackWebhook
};
