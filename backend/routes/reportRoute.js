const express = require('express');
const router = express.Router();
const { submitReport, getReports, updateReportStatus } = require('../controllers/reportController');
const { protect } = require('../middlewares/authMiddleware');

// Public — anonymous reports allowed (no protect middleware)
router.post('/', submitReport);

// Admin only (protect used as basic auth guard — extend with role-check middleware later)
router.get('/', protect, getReports);
router.patch('/:id', protect, updateReportStatus);

module.exports = router;
