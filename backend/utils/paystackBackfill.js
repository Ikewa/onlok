const axios = require('axios');
const pool = require('../config/db');
const logger = require('./logger');
const { inferPlanAndTierFromTransaction } = require('./paystackPlanService');

/**
 * Automatically backfills legacy transactions for users/verifications that paid 
 * before reference tracking and subscription code logging were introduced.
 */
const backfillLegacyPaystackTransactions = async () => {
    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET) {
        return;
    }

    try {
        // Find users/verifications where payment_reference IS NULL or paystack_subscription_code IS NULL
        const [usersToBackfill] = await pool.query(`
            SELECT DISTINCT u.id AS user_id, u.email, u.first_name, u.last_name, v.id AS verification_id, v.payment_reference, s.id AS subscription_id, s.paystack_subscription_code
            FROM users u
            LEFT JOIN verifications v ON v.user_id = u.id
            LEFT JOIN subscriptions s ON s.user_id = u.id
            WHERE u.email IS NOT NULL 
              AND (v.payment_reference IS NULL OR s.paystack_subscription_code IS NULL OR u.status != 'verified' OR v.payment_status != 'paid')
            ORDER BY u.id DESC
            LIMIT 100
        `);

        if (usersToBackfill.length === 0) {
            return;
        }

        logger.info(`[PaystackBackfill] Inspecting ${usersToBackfill.length} vendor accounts for missing Paystack references...`);

        let backfilledCount = 0;

        for (const userRecord of usersToBackfill) {
            const { user_id, email, verification_id, subscription_id, payment_reference, paystack_subscription_code } = userRecord;

            if (payment_reference && paystack_subscription_code) {
                continue; // Already has full tracking data
            }

            try {
                const response = await axios.get(
                    `https://api.paystack.co/transaction?customer=${encodeURIComponent(email)}&status=success&perPage=10`,
                    {
                        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
                        timeout: 8000
                    }
                );

                const txs = response.data?.data || [];
                if (txs.length === 0) continue;

                // Match transaction by user_id in metadata or customer email
                const matchedTx = txs.find(tx => 
                    String(tx.metadata?.user_id) === String(user_id) ||
                    (tx.customer?.email && tx.customer.email.toLowerCase() === email.toLowerCase())
                );

                if (matchedTx) {
                    const ref = matchedTx.reference;
                    const subCode = matchedTx.subscription_code || null;
                    const planCode = matchedTx.plan?.plan_code || null;
                    const planDetails = inferPlanAndTierFromTransaction(matchedTx);

                    // Update verifications reference & assigned_tier
                    if (verification_id) {
                        await pool.query(
                            `UPDATE verifications 
                             SET payment_reference = COALESCE(payment_reference, ?), 
                                 payment_status = 'paid', 
                                 assigned_tier = ?,
                                 status = CASE WHEN status = 'pending' THEN 'payment_received' ELSE status END
                             WHERE id = ?`,
                            [ref, planDetails.tier, verification_id]
                        );
                    }

                    // Upsert subscriptions row with exact tier, billing cycle & amount paid
                    if (subscription_id) {
                        await pool.query(
                            `UPDATE subscriptions 
                             SET tier = ?,
                                 plan_name = ?,
                                 billing_cycle = ?,
                                 amount = ?,
                                 paystack_subscription_code = COALESCE(paystack_subscription_code, ?),
                                 paystack_plan_code = COALESCE(paystack_plan_code, ?),
                                 status = 'active'
                             WHERE id = ?`,
                            [planDetails.tier, planDetails.planName, planDetails.cycle, planDetails.amount, subCode, planCode, subscription_id]
                        );
                    } else {
                        await pool.query(
                            `INSERT INTO subscriptions (user_id, tier, plan_name, billing_cycle, amount, status, paystack_subscription_code, paystack_plan_code)
                             VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
                            [user_id, planDetails.tier, planDetails.planName, planDetails.cycle, planDetails.amount, subCode, planCode]
                        );
                    }

                    // Update user status
                    await pool.query('UPDATE users SET status = "verified" WHERE id = ? AND status != "verified"', [user_id]);

                    backfilledCount++;
                }
            } catch (userErr) {
                // Ignore per-user rate limit / network errors gracefully
            }
        }

        if (backfilledCount > 0) {
            logger.info(`✅ [PaystackBackfill] Successfully backfilled Paystack references for ${backfilledCount} legacy vendor accounts.`);
        }
    } catch (error) {
        logger.warn('[PaystackBackfill] Legacy backfill notice:', { message: error.message });
    }
};

module.exports = {
    backfillLegacyPaystackTransactions
};
