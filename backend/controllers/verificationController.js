const multer = require('multer');
const path = require('path');
const pool = require('../config/db');

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, `${req.user.vendor_id}-${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// File filter to acccept specific types
const fileFilter = (req, file, cb) => {
    if (file.fieldname === "gov_id") {
        if (!file.mimetype.match(/(jpg|jpeg|png|pdf)$/)) {
            return cb(new Error('Please upload an image or PDF for ID'));
        }
    } else if (file.fieldname === "business_video") {
        if (!file.mimetype.match(/(mp4|mkv|avi)$/)) {
            return cb(new Error('Please upload a valid video format'));
        }
    }
    cb(null, true);
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for video
    fileFilter: fileFilter
});

// @desc    Submit verification documents
// @route   POST /api/verifications
// @access  Private (Vendor only)
const submitVerification = async (req, res) => {
    try {
        if (!req.files || !req.files['gov_id'] || !req.files['business_video']) {
            return res.status(400).json({ message: 'Both Government ID and Business Video are required.' });
        }

        const govIdUrl = `/uploads/${req.files['gov_id'][0].filename}`;
        const videoUrl = `/uploads/${req.files['business_video'][0].filename}`;

        // Ensure user hasn't already submitted a pending one
        const [existing] = await pool.query('SELECT * FROM verifications WHERE user_id = ? AND status = "pending"', [req.user.id]);
        
        if (existing.length > 0) {
            return res.status(400).json({ message: 'You already have a verification request pending.' });
        }

        // Insert into verification table
        const query = `INSERT INTO verifications (user_id, gov_id_url, video_url) VALUES (?, ?, ?)`;
        const [result] = await pool.query(query, [req.user.id, govIdUrl, videoUrl]);

        res.status(201).json({
            message: 'Verification documents submitted successfully',
            verification_id: result.insertId
        });

    } catch (error) {
        console.error('Verification Submit Error:', error);
        res.status(500).json({ message: 'Server error processing verification' });
    }
};

module.exports = {
    upload,
    submitVerification
};
