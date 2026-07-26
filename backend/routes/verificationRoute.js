const express = require('express');
const router = express.Router();
const { upload, submitVerification, getMyVerification } = require('../controllers/verificationController');
const { protect } = require('../middlewares/authMiddleware');

// Get current user's verification record
router.get('/me', protect, getMyVerification);

// Route requires token, and handles multi-part form data
const uploadMiddleware = upload.fields([
    { name: 'gov_id', maxCount: 1 }, 
    { name: 'cac_document', maxCount: 1 },
    { name: 'business_video', maxCount: 1 }
]);

router.post(
    '/', 
    protect, 
    (req, res, next) => {
        uploadMiddleware(req, res, function (err) {
            if (err) {
                console.error('Multer upload error:', err);
                return res.status(400).json({ message: err.message || 'File upload error. Check file size (max 100MB) and format.' });
            }
            next();
        });
    },
    submitVerification
);

module.exports = router;

