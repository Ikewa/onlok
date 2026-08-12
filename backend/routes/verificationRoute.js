const express = require('express');
const router = express.Router();
const { upload, submitVerification, getMyVerification, resubmitDocuments } = require('../controllers/verificationController');
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
        uploadMiddleware(req, res, async function (err) {
            if (err) {
                console.error('Multer upload error:', err);
                const { sendEmail } = require('../utils/emailService');
                const html = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                        <h2 style="color: #D97706;">Registration Incomplete</h2>
                        <p>Hi there,</p>
                        <p>We noticed an issue while uploading your documents during registration. A file failed to submit (e.g. invalid format or too large).</p>
                        <p>Please log back in to your dashboard to check what failed and re-upload it to complete your registration.</p>
                        <a href="${process.env.FRONTEND_URL || 'https://app.onlok.net'}/login" style="padding: 10px 15px; background: #0029FF; color: #fff; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Log In</a>
                        <br/><br/>
                        <p>Best regards,<br/><strong>The Onlok Team</strong></p>
                    </div>
                `;
                await sendEmail(req.user.email, 'Action Required: Document Upload Failed - Onlok', html);
                
                return res.status(400).json({ message: err.message || 'File upload error. Check file size (max 100MB) and format.' });
            }
            next();
        });
    },
    submitVerification
);

router.put(
    '/resubmit',
    protect,
    (req, res, next) => {
        uploadMiddleware(req, res, function (err) {
            if (err) {
                console.error('Multer resubmit error:', err);
                return res.status(400).json({ message: err.message || 'File upload error. Check file size (max 100MB) and format.' });
            }
            next();
        });
    },
    resubmitDocuments
);

module.exports = router;

