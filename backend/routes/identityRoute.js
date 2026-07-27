const express = require('express');
const router = express.Router();
const { verifyNIN, verifyCAC } = require('../controllers/identityController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/nin', protect, verifyNIN);
router.post('/cac', protect, verifyCAC);

module.exports = router;
