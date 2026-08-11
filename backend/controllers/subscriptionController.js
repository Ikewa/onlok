const pool = require('../config/db');
const paystackPlanService = require('../utils/paystackPlanService');

// @desc    Get current user subscription and badge status
// @route   GET /api/subscriptions/me
// @access  Private
const getMySubscription = async (req, res) => {
    try {
        const userId = req.user.id;

        const [users] = await pool.query(
            'SELECT id, email, badge_type, status, subscription_expires_at, active_subscription_id FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];

        const [subs] = await pool.query(
            `SELECT * FROM subscriptions 
             WHERE user_id = ? 
             ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );

        const currentSub = subs.length > 0 ? subs[0] : null;

        // Fetch user badges & verification assigned tier
        const [badges] = await pool.query('SELECT badge_type FROM badges WHERE user_id = ?', [userId]);
        const [verifications] = await pool.query('SELECT assigned_tier FROM verifications WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1', [userId]);
        const assignedTier = verifications.length > 0 ? verifications[0].assigned_tier : null;

        res.status(200).json({
            user_id: userId,
            badge_type: user.badge_type || null,
            badges: badges.map(b => b.badge_type),
            assigned_tier: assignedTier,
            account_status: user.status,
            subscription_expires_at: user.subscription_expires_at,
            subscription: currentSub
        });
    } catch (error) {
        console.error('Get Subscription Error:', error);
        res.status(500).json({ message: 'Server error fetching subscription details' });
    }
};

// @desc    Get Paystack subscription management / card update link
// @route   GET /api/subscriptions/manage-link
// @access  Private
const getManageSubscriptionLink = async (req, res) => {
    try {
        const userId = req.user.id;
        const [subs] = await pool.query(
            'SELECT paystack_subscription_code FROM subscriptions WHERE user_id = ? AND status = "active" ORDER BY created_at DESC LIMIT 1',
            [userId]
        );

        if (subs.length === 0 || !subs[0].paystack_subscription_code) {
            return res.status(404).json({ message: 'No active Paystack subscription found' });
        }

        const link = await paystackPlanService.getSubscriptionManageLink(subs[0].paystack_subscription_code);
        res.status(200).json({ link });
    } catch (error) {
        console.error('Get Manage Subscription Link Error:', error.response?.data || error.message);
        res.status(500).json({ message: 'Failed to generate subscription management link' });
    }
};

// @desc    Cancel user subscription
// @route   POST /api/subscriptions/cancel
// @access  Private
const cancelMySubscription = async (req, res) => {
    try {
        const userId = req.user.id;
        const [subs] = await pool.query(
            'SELECT id, paystack_subscription_code, paystack_email_token FROM subscriptions WHERE user_id = ? AND status = "active" ORDER BY created_at DESC LIMIT 1',
            [userId]
        );

        if (subs.length === 0) {
            return res.status(404).json({ message: 'No active subscription found to cancel' });
        }

        const sub = subs[0];
        if (sub.paystack_subscription_code && sub.paystack_email_token) {
            try {
                await paystackPlanService.disablePaystackSubscription(sub.paystack_subscription_code, sub.paystack_email_token);
            } catch (pErr) {
                console.warn('Paystack disable subscription error:', pErr.response?.data || pErr.message);
            }
        }

        await pool.query('UPDATE subscriptions SET status = "cancelled" WHERE id = ?', [sub.id]);

        await pool.query(
            'INSERT INTO audit_logs (user_id, action, severity, details) VALUES (?, ?, ?, ?)',
            [userId, 'Cancel Subscription', 'LOW', `User #${userId} cancelled subscription #${sub.id}`]
        );

        res.status(200).json({ message: 'Subscription cancelled successfully' });
    } catch (error) {
        console.error('Cancel Subscription Error:', error);
        res.status(500).json({ message: 'Server error cancelling subscription' });
    }
};

module.exports = {
    getMySubscription,
    getManageSubscriptionLink,
    cancelMySubscription
};
