const axios = require('axios');
const crypto = require('crypto');
const pool = require('../config/db');


// Initialize a payment session
const initializePayment = async (req, res) => {
    try {
        const { email, amount, plan, referrerId } = req.body; 
        const userId = req.user.id;
        const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

        // amount in kobo
        const amountInKobo = amount * 100;

        const response = await axios.post(
            'https://api.paystack.co/transaction/initialize',
            {
                email,
                amount: amountInKobo,
                metadata: {
                    user_id: userId,
                    plan: plan || 'Premium',
                    referrer_id: referrerId
                },
                callback_url: `${process.env.CORS_ORIGIN || 'https://onlok.net'}/payment-success` 
            },
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.status(200).json({
            status: true,
            message: 'Payment initialized',
            data: response.data.data
        });
    } catch (error) {
        console.error('Initialize Payment Error:', error.response?.data || error.message);
        const errorMsg = error.response?.data?.message || error.message || 'Failed to initialize payment';
        res.status(500).json({ message: 'Failed to initialize payment', error: errorMsg, details: error.response?.data });
    }
};

// Verify payment manually (if webhook is missed)
const verifyPayment = async (req, res) => {
    try {
        const { reference } = req.params;
        const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
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

// Webhook handler
const paystackWebhook = async (req, res) => {
    try {
        const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
        const hash = crypto.createHmac('sha512', PAYSTACK_SECRET).update(JSON.stringify(req.body)).digest('hex');
        if (hash === req.headers['x-paystack-signature']) {
            const event = req.body;

            if (event.event === 'charge.success') {
                const { reference, metadata, amount } = event.data;
                const userId = metadata?.user_id;
                const plan = metadata?.plan;
                const referrerId = metadata?.referrer_id;
                
                // Process the successful payment
                // Update verification payment status
                await pool.query(
                    `UPDATE verifications SET payment_status = 'paid', status = 'payment_received' WHERE user_id = ? AND status = 'tier_assigned'`,
                    [userId]
                );

                if (referrerId) {
                    const commission = (amount / 100) * 0.10; // 10% commission for referrals
                    await pool.query(
                        `INSERT INTO referrals (referrer_id, referred_user_id, subscription_plan, amount_paid, commission_earned, status)
                         VALUES (?, ?, ?, ?, ?, 'available')`,
                        [referrerId, userId, plan, amount / 100, commission]
                    );
                }
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
