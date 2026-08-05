const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { getMySubscription, getManageSubscriptionLink, cancelMySubscription } = require('../controllers/subscriptionController');

router.get('/me', protect, getMySubscription);
router.get('/manage-link', protect, getManageSubscriptionLink);
router.post('/cancel', protect, cancelMySubscription);

module.exports = router;
