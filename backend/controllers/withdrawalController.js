const pool = require('../config/db');
const paystackService = require('../utils/paystackService');
const crypto = require('crypto');
const logger = require('../utils/logger');

// @desc    Get list of supported banks in Nigeria
// @route   GET /api/withdrawals/banks
// @access  Private
const getBanksList = async (req, res) => {
    try {
        const banksData = await paystackService.getBanks('NGN');
        res.status(200).json(banksData);
    } catch (error) {
        logger.error('Fetch Banks Error', { error });
        res.status(500).json({ message: 'Failed to fetch bank list', error: error.message });
    }
};

// @desc    Verify bank account number
// @route   POST /api/withdrawals/verify-account
// @access  Private
const verifyBankAccount = async (req, res) => {
    try {
        const { account_number, bank_code } = req.body;
        if (!account_number || !bank_code) {
            return res.status(400).json({ message: 'Account number and bank code are required' });
        }

        const result = await paystackService.resolveAccountNumber(account_number, bank_code);
        res.status(200).json(result);
    } catch (error) {
        logger.error('Verify Account Error', { error });
        const msg = error.response?.data?.message || 'Could not resolve account details. Please check account number and bank.';
        res.status(400).json({ message: msg });
    }
};

// @desc    Request a withdrawal
// @route   POST /api/withdrawals/request
// @access  Private
const requestWithdrawal = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, bank_code, bank_name, account_number, account_name, payment_method } = req.body;

        const numAmount = parseFloat(amount);
        if (!numAmount || isNaN(numAmount) || numAmount < 5000) {
            return res.status(400).json({ message: 'Minimum withdrawal amount is ₦5,000' });
        }

        await pool.query(`
            UPDATE referrals 
            SET status = 'available' 
            WHERE referrer_id = ? 
              AND status = 'pending' 
              AND created_at <= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `, [userId]);

        const [referrals] = await pool.query('SELECT commission_earned FROM referrals WHERE referrer_id = ? AND status = "available"', [userId]);
        const [withdrawals] = await pool.query('SELECT amount FROM withdrawals WHERE user_id = ? AND status IN ("pending", "processing", "paid")', [userId]);

        let availableEarnings = 0;
        referrals.forEach(r => availableEarnings += parseFloat(r.commission_earned));
        
        let totalWithdrawnOrProcessing = 0;
        withdrawals.forEach(w => totalWithdrawnOrProcessing += parseFloat(w.amount));

        const netAvailable = availableEarnings - totalWithdrawnOrProcessing;

        if (numAmount > netAvailable) {
            return res.status(400).json({ message: `Insufficient available balance. Your net available balance is ₦${netAvailable.toLocaleString()}` });
        }

        let recipientCode = null;
        let finalBankCode = bank_code;
        let finalBankName = bank_name;
        let finalAccountNumber = account_number;
        let finalAccountName = account_name;

        if (finalAccountNumber && finalBankCode) {
            try {
                if (!finalAccountName) {
                    const resolved = await paystackService.resolveAccountNumber(finalAccountNumber, finalBankCode);
                    finalAccountName = resolved.data.account_name;
                }
                
                const recipientRes = await paystackService.createTransferRecipient({
                    name: finalAccountName,
                    account_number: finalAccountNumber,
                    bank_code: finalBankCode,
                    currency: 'NGN'
                });
                recipientCode = recipientRes.data.recipient_code;

                await pool.query(`
                    UPDATE users 
                    SET bank_code = ?, bank_name = ?, account_number = ?, account_name = ?, paystack_recipient_code = ?
                    WHERE id = ?
                `, [finalBankCode, finalBankName || '', finalAccountNumber, finalAccountName || '', recipientCode, userId]);
            } catch (recipientErr) {
                logger.error('Error creating recipient on Paystack', { error: recipientErr });
                return res.status(400).json({
                    message: recipientErr.response?.data?.message || 'Failed to verify recipient bank details with Paystack.'
                });
            }
        } else {
            const [users] = await pool.query('SELECT bank_code, bank_name, account_number, account_name, paystack_recipient_code FROM users WHERE id = ?', [userId]);
            if (users.length > 0 && users[0].paystack_recipient_code) {
                recipientCode = users[0].paystack_recipient_code;
                finalBankCode = users[0].bank_code;
                finalBankName = users[0].bank_name;
                finalAccountNumber = users[0].account_number;
                finalAccountName = users[0].account_name;
            }
        }

        const accountDetailsStr = finalAccountNumber && finalBankName 
            ? `${finalAccountNumber}\n${finalBankName}${finalAccountName ? ` (${finalAccountName})` : ''}` 
            : (payment_method || 'Bank Transfer');

        const transferReference = `wd_ref_${userId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        await pool.query(`
            INSERT INTO withdrawals (
                user_id, amount, status, payment_method, account_details,
                bank_code, bank_name, account_number, account_name, recipient_code, transfer_reference
            )
            VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            userId, numAmount, payment_method || 'Bank Transfer', accountDetailsStr,
            finalBankCode || null, finalBankName || null, finalAccountNumber || null, finalAccountName || null,
            recipientCode || null, transferReference
        ]);

        logger.info(`Withdrawal request submitted for user #${userId}`, { userId, amount: numAmount, transferReference });

        res.status(201).json({
            message: 'Withdrawal request submitted successfully',
            transfer_reference: transferReference
        });

    } catch (error) {
        logger.error('Withdrawal Request Error', { error });
        res.status(500).json({ message: 'Server error processing withdrawal request' });
    }
};

module.exports = {
    getBanksList,
    verifyBankAccount,
    requestWithdrawal
};
