const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requestWithdrawal } = require('../controllers/withdrawalController');

router.post('/request', protect, requestWithdrawal);

module.exports = router;
