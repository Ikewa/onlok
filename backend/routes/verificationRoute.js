const express = require('express');
const router = express.Router();
const { upload, submitVerification, getMyVerification } = require('../controllers/verificationController');
const { protect } = require('../middlewares/authMiddleware');

// Get current user's verification record
router.get('/me', protect, getMyVerification);

// Route requires token, and handles multi-part form data
router.post(
    '/', 
    protect, 
    upload.fields([
        { name: 'gov_id', maxCount: 1 }, 
        { name: 'cac_document', maxCount: 1 },
        { name: 'business_video', maxCount: 1 }
    ]), 
    submitVerification
);

module.exports = router;

