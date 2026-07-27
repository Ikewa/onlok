const express = require('express');
const router = express.Router();
const { initializePayment, verifyPayment, paystackWebhook } = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/initialize', protect, initializePayment);
router.get('/verify/:reference', protect, verifyPayment);
router.post('/webhook', paystackWebhook); // Webhooks shouldn't be protected by jwt

module.exports = router;
