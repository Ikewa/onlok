const multer = require('multer');
const path = require('path');
const pool = require('../config/db');

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: function (req, file, cb) {
        cb(null, `${req.user.id}-${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// File filter to acccept specific types
const fileFilter = (req, file, cb) => {
    if (file.fieldname === "gov_id" || file.fieldname === "cac_document") {
        if (!file.mimetype.match(/(jpg|jpeg|png|pdf)$/)) {
            return cb(new Error('Please upload an image or PDF for ID/CAC'));
        }
    } else if (file.fieldname === "business_video") {
        if (!file.originalname.match(/\.(mp4|mkv|avi|mov)$/i) && !file.mimetype.match(/(mp4|mkv|avi|quicktime)$/)) {
            return cb(new Error('Please upload a valid video format (.mp4, .mkv, .mov)'));
        }
    }
    cb(null, true);
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for video
    fileFilter: fileFilter
});

// @desc    Submit verification documents
// @route   POST /api/verifications
// @access  Private (Vendor only)
const submitVerification = async (req, res) => {
    try {
        const userId = req.user.id;
        const hasGovId = req.files && req.files['gov_id'];
        const hasCac = req.files && req.files['cac_document'];
        const hasVideo = req.files && req.files['business_video'];
        const { sendEmail } = require('../utils/emailService');
        
        if (!hasGovId && !hasVideo) {
            const html = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #D97706;">Registration Incomplete</h2>
                    <p>Hi there,</p>
                    <p>We noticed some required files (like your Government ID or Business Video) were missing when you submitted your verification.</p>
                    <p>Please log back in to your dashboard and re-upload the missing documents to complete your registration.</p>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="padding: 10px 15px; background: #0029FF; color: #fff; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Log In</a>
                    <br/><br/>
                    <p>Best regards,<br/><strong>The Onlok Team</strong></p>
                </div>
            `;
            await sendEmail(req.user.email, 'Action Required: Missing Documents - Onlok', html);
            return res.status(400).json({ message: 'Government ID and Business Video are required.' });
        }

        const govIdUrl = hasGovId ? `/uploads/${req.files['gov_id'][0].filename}` : null;
        const cacUrl = hasCac ? `/uploads/${req.files['cac_document'][0].filename}` : null;
        const videoUrl = hasVideo ? `/uploads/${req.files['business_video'][0].filename}` : null;

        // Check if a verification record already exists for this user
        const [existing] = await pool.query(
            'SELECT id, gov_id_url, cac_url, video_url FROM verifications WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1',
            [userId]
        );

        let verificationId = null;

        if (existing.length > 0) {
            // Update existing record in-place
            const currentRec = existing[0];
            verificationId = currentRec.id;

            const finalGovIdUrl = govIdUrl || currentRec.gov_id_url;
            const finalCacUrl = cacUrl || currentRec.cac_url;
            const finalVideoUrl = videoUrl || currentRec.video_url;

            if (!finalGovIdUrl || !finalVideoUrl) {
                return res.status(400).json({ message: 'Government ID and Business Video are required for initial verification.' });
            }

            const updateQuery = `
                UPDATE verifications 
                SET status = 'pending',
                    admin_notes = NULL,
                    gov_id_url = ?,
                    gov_id_status = IF(?, 'pending', gov_id_status),
                    gov_id_notes = IF(?, NULL, gov_id_notes),
                    cac_url = ?,
                    cac_status = IF(?, 'pending', cac_status),
                    cac_notes = IF(?, NULL, cac_notes),
                    video_url = ?,
                    video_status = IF(?, 'pending', video_status),
                    video_notes = IF(?, NULL, video_notes),
                    submitted_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            await pool.query(updateQuery, [
                finalGovIdUrl, hasGovId ? 1 : 0, hasGovId ? 1 : 0,
                finalCacUrl, hasCac ? 1 : 0, hasCac ? 1 : 0,
                finalVideoUrl, hasVideo ? 1 : 0, hasVideo ? 1 : 0,
                verificationId
            ]);
        } else {
            // Create initial verification record
            if (!govIdUrl || !videoUrl) {
                return res.status(400).json({ message: 'Government ID and Business Video are required for verification.' });
            }
            const insertQuery = `INSERT INTO verifications (user_id, gov_id_url, cac_url, video_url, status) VALUES (?, ?, ?, ?, 'pending')`;
            const [result] = await pool.query(insertQuery, [userId, govIdUrl, cacUrl, videoUrl]);
            verificationId = result.insertId;
        }

        // Reset user table status to pending
        await pool.query('UPDATE users SET status = "pending" WHERE id = ?', [userId]);

        // Send Welcome/Application Received Email
        const welcomeHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #0F172A;">Welcome to Onlok!</h2>
                <p>Your vendor application and documents have been received successfully.</p>
                <p>Your dashboard is now ready. Our administrative team will review your application and get back to you shortly.</p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" style="padding: 10px 15px; background: #0029FF; color: #fff; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Go to Dashboard</a>
                <br/><br/>
                <p>Best regards,<br/><strong>The Onlok Team</strong></p>
            </div>
        `;
        await sendEmail(req.user.email, 'Application Received - Dashboard Ready', welcomeHtml);

        res.status(200).json({
            message: 'Verification documents submitted successfully',
            verification_id: verificationId
        });

    } catch (error) {
        console.error('Verification Submit Error:', error);
        res.status(500).json({ message: 'Server error processing verification' });
    }
};

// @desc    Get current user's verification record
// @route   GET /api/verifications/me
// @access  Private
const getMyVerification = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, gov_id_url, cac_url, video_url, status, admin_notes, assigned_tier, payment_status,
                    gov_id_status, gov_id_notes,
                    cac_status, cac_notes,
                    video_status, video_notes,
                    submitted_at, reviewed_at
             FROM verifications
             WHERE user_id = ?
             ORDER BY submitted_at DESC
             LIMIT 1`,
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'No verification record found' });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Get Verification Error:', error);
        res.status(500).json({ message: 'Server error fetching verification' });
    }
};

// @desc    Resubmit / update specific verification documents
// @route   PUT /api/verifications/resubmit
// @access  Private (Vendor only)
const resubmitDocuments = async (req, res) => {
    try {
        const userId = req.user.id;
        const [existing] = await pool.query(
            'SELECT id, gov_id_url, cac_url, video_url FROM verifications WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1',
            [userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'No existing verification record found to resubmit.' });
        }

        const currentRec = existing[0];
        const hasGovId = req.files && req.files['gov_id'];
        const hasCac = req.files && req.files['cac_document'];
        const hasVideo = req.files && req.files['business_video'];

        if (!hasGovId && !hasCac && !hasVideo) {
            return res.status(400).json({ message: 'Please upload at least one document to resubmit.' });
        }

        const newGovIdUrl = hasGovId ? `/uploads/${req.files['gov_id'][0].filename}` : currentRec.gov_id_url;
        const newCacUrl = hasCac ? `/uploads/${req.files['cac_document'][0].filename}` : currentRec.cac_url;
        const newVideoUrl = hasVideo ? `/uploads/${req.files['business_video'][0].filename}` : currentRec.video_url;

        // Reset overall status to pending and reset status of uploaded docs
        const updateQuery = `
            UPDATE verifications 
            SET status = 'pending',
                admin_notes = NULL,
                gov_id_url = ?,
                gov_id_status = IF(?, 'pending', gov_id_status),
                gov_id_notes = IF(?, NULL, gov_id_notes),
                cac_url = ?,
                cac_status = IF(?, 'pending', cac_status),
                cac_notes = IF(?, NULL, cac_notes),
                video_url = ?,
                video_status = IF(?, 'pending', video_status),
                video_notes = IF(?, NULL, video_notes),
                submitted_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        await pool.query(updateQuery, [
            newGovIdUrl, hasGovId ? 1 : 0, hasGovId ? 1 : 0,
            newCacUrl, hasCac ? 1 : 0, hasCac ? 1 : 0,
            newVideoUrl, hasVideo ? 1 : 0, hasVideo ? 1 : 0,
            currentRec.id
        ]);

        // Reset user table status to pending
        await pool.query('UPDATE users SET status = "pending" WHERE id = ?', [userId]);

        res.status(200).json({
            message: 'Verification documents resubmitted successfully',
            verification_id: currentRec.id
        });
    } catch (error) {
        console.error('Verification Resubmit Error:', error);
        res.status(500).json({ message: 'Server error resubmitting documents' });
    }
};

module.exports = {
    upload,
    submitVerification,
    getMyVerification,
    resubmitDocuments
};
