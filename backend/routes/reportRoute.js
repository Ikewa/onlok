const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { submitReport, getReports, getReportById, getReportStats, updateReport } = require('../controllers/reportController');
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
router.post('/', upload.array('evidence', 5), submitReport);

// Admin only — order matters: /stats must come before /:id to avoid route conflict
router.get('/stats', protect, getReportStats);
router.get('/',      protect, getReports);
router.get('/:id',   protect, getReportById);
router.patch('/:id', protect, updateReport);

module.exports = router;
