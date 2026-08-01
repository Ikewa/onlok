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
            const userId = data.metadata?.user_id;
            const plan = data.metadata?.plan;
            const referrerId = data.metadata?.referrer_id;
            const amount = data.amount;
            
            if (userId) {
                // Check if already paid to prevent duplicate commission
                const [rows] = await pool.query(`SELECT payment_status FROM verifications WHERE user_id = ?`, [userId]);
                if (rows.length > 0 && rows[0].payment_status !== 'paid') {
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
                }
            }

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
                const userId = metadata.user_id;
                const plan = metadata.plan;
                const referrerId = metadata.referrer_id;
                
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

                // We no longer grant the badge automatically here. The admin will do it in final approval.
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
