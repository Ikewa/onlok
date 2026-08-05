const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { requestWithdrawal, getBanksList, verifyBankAccount } = require('../controllers/withdrawalController');

router.get('/banks', protect, getBanksList);
router.post('/verify-account', protect, verifyBankAccount);
router.post('/request', protect, requestWithdrawal);

module.exports = router;
