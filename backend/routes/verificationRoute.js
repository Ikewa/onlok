const express = require('express');
const router = express.Router();
const {
    createRegistrationApplication,
    submitVerification,
    getMyVerification,
    resubmitDocuments
} = require('../controllers/verificationController');
const { protect } = require('../middlewares/authMiddleware');

// Resumable uploads are served by the tus server mounted in server.js, before
// the JSON body parser, at POST/PATCH/HEAD/DELETE /api/verifications/upload/tus.
router.get('/me', protect, getMyVerification);
router.post('/application', protect, createRegistrationApplication);
router.post('/', protect, submitVerification);
router.put('/resubmit', protect, resubmitDocuments);

module.exports = router;
