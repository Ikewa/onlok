const pool = require('../config/db');

// @desc    Request a withdrawal
// @route   POST /api/withdrawals/request
// @access  Private
const requestWithdrawal = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, payment_method } = req.body;

        if (!amount || amount < 5000) {
            return res.status(400).json({ message: 'Minimum withdrawal amount is ₦5,000' });
        }

        // We need to calculate netAvailable again to ensure they have enough funds
        // 1. Automatically move pending > 7 days to available
        await pool.query(`
            UPDATE referrals 
            SET status = 'available' 
            WHERE referrer_id = ? 
              AND status = 'pending' 
              AND created_at <= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `, [userId]);

        const [referrals] = await pool.query('SELECT commission_earned FROM referrals WHERE referrer_id = ? AND status = "available"', [userId]);
        const [withdrawals] = await pool.query('SELECT amount FROM withdrawals WHERE user_id = ? AND status IN ("processing", "paid")', [userId]);

        let availableEarnings = 0;
        referrals.forEach(r => availableEarnings += parseFloat(r.commission_earned));
        
        let totalWithdrawnOrProcessing = 0;
        withdrawals.forEach(w => totalWithdrawnOrProcessing += parseFloat(w.amount));

        const netAvailable = availableEarnings - totalWithdrawnOrProcessing;

        if (amount > netAvailable) {
            return res.status(400).json({ message: 'Insufficient available balance' });
        }

        // Create the withdrawal request
        await pool.query(`
            INSERT INTO withdrawals (user_id, amount, status, payment_method)
            VALUES (?, ?, 'processing', ?)
        `, [userId, amount, payment_method || null]);

        res.status(201).json({ message: 'Withdrawal request submitted successfully' });

    } catch (error) {
        console.error('Withdrawal Request Error:', error);
        res.status(500).json({ message: 'Server error processing withdrawal request' });
    }
};

module.exports = {
    requestWithdrawal
};
