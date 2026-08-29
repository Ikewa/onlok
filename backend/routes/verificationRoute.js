const express = require('express');
const router = express.Router();
const { 
    uploadSingleDocument,
    initChunkUpload,
    uploadChunk,
    completeChunkUpload,
    submitVerification,
    getMyVerification,
    resubmitDocuments 
} = require('../controllers/verificationController');
const { protect } = require('../middlewares/authMiddleware');
const { uploadSingleDoc, uploadChunkMulter } = require('../middlewares/uploadMiddleware');

// Get current user's verification record
router.get('/me', protect, getMyVerification);

// ─── 1. Single Document Upload (ID / CAC) ─────────────────────────────────────
router.post(
    '/upload/single',
    protect,
    (req, res, next) => {
        uploadSingleDoc.single('file')(req, res, (err) => {
            if (err) {
                console.error('Single document upload error:', err);
                return res.status(400).json({ message: err.message || 'File upload error. Check format and size (max 15MB).' });
            }
            next();
        });
    },
    uploadSingleDocument
);

// ─── 2. Chunked Video Upload Endpoints ────────────────────────────────────────
router.post('/upload/chunk-init', protect, initChunkUpload);

router.post(
    '/upload/chunk',
    protect,
    (req, res, next) => {
        uploadChunkMulter.single('chunk')(req, res, (err) => {
            if (err) {
                console.error('Chunk upload error:', err);
                return res.status(400).json({ message: err.message || 'Failed to upload chunk.' });
            }
            next();
        });
    },
    uploadChunk
);

router.post('/upload/chunk-complete', protect, completeChunkUpload);

// ─── 3. Final Verification Submission & Resubmission ──────────────────────────
router.post('/', protect, submitVerification);
router.put('/resubmit', protect, resubmitDocuments);

module.exports = router;
