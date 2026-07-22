const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { submitReport, getReports, getReportById, getReportStats, updateReport, addReportNote } = require('../controllers/reportController');
const { protect } = require('../middlewares/authMiddleware');

// Guard: admin-only routes
const adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    next();
};

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
router.get('/stats',       protect, adminOnly, getReportStats);
router.get('/',            protect, adminOnly, getReports);
router.get('/:id',         protect, adminOnly, getReportById);
router.patch('/:id',       protect, adminOnly, updateReport);
router.post('/:id/notes',  protect, adminOnly, addReportNote);

module.exports = router;
