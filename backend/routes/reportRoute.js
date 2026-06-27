const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { submitReport, getReports, updateReportStatus } = require('../controllers/reportController');
const { protect } = require('../middlewares/authMiddleware');

// Configure Multer for evidence file uploads
const uploadDir = path.join(__dirname, '../uploads/reports');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Public — anonymous reports allowed (no protect middleware)
// Expecting an array of files under the field name 'evidence'
router.post('/', upload.array('evidence', 5), submitReport);

// Admin only (protect used as basic auth guard — extend with role-check middleware later)
router.get('/', protect, getReports);
router.patch('/:id', protect, updateReportStatus);

module.exports = router;
