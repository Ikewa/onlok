const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const pool = require('../config/db');
const { validateDocument, validateVideo } = require('../utils/fileValidator');
const { UPLOAD_DIR, TEMP_DIR } = require('../middlewares/uploadMiddleware');
const { sendEmail } = require('../utils/emailService');
const logger = require('../utils/logger');

// In-memory or file-backed upload sessions
const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB per chunk
const activeSessions = new Map();

// ─── 1. Single Document Upload (ID / CAC) ─────────────────────────────────────
const uploadSingleDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No document file provided.' });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        return res.status(200).json({
            message: 'Document uploaded successfully',
            url: fileUrl,
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size
        });
    } catch (error) {
        logger.error('Upload Single Document Error', { error });
        res.status(500).json({ message: error.message || 'Failed to process document upload.' });
    }
};

// ─── 2. Initialize Chunked Upload Session ──────────────────────────────────────
const initChunkUpload = async (req, res) => {
    try {
        const { fileName, totalSize, mimeType, fileCategory } = req.body;

        if (!fileName || !totalSize) {
            return res.status(400).json({ message: 'fileName and totalSize are required.' });
        }

        const maxAllowedSize = 100 * 1024 * 1024; // 100 MB hard cap
        if (totalSize > maxAllowedSize) {
            return res.status(400).json({ message: 'File exceeds the maximum limit of 100MB.' });
        }

        // Validate video or document format
        if (fileCategory === 'video' || (!fileCategory && fileName.match(/\.(mp4|mov|mkv|webm|avi)$/i))) {
            const validation = validateVideo(fileName, mimeType);
            if (!validation.valid) {
                return res.status(400).json({ message: validation.error });
            }
        } else {
            const validation = validateDocument(fileName, mimeType);
            if (!validation.valid) {
                return res.status(400).json({ message: validation.error });
            }
        }

        const uploadId = crypto.randomUUID();
        const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
        const sessionDir = path.join(TEMP_DIR, uploadId);

        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        const sessionData = {
            uploadId,
            userId: req.user.id,
            fileName,
            totalSize,
            mimeType,
            chunkSize: CHUNK_SIZE,
            totalChunks,
            receivedChunks: new Set(),
            createdAt: Date.now()
        };

        activeSessions.set(uploadId, sessionData);

        return res.status(200).json({
            uploadId,
            chunkSize: CHUNK_SIZE,
            totalChunks,
            message: 'Chunked upload session initialized'
        });
    } catch (error) {
        logger.error('Init Chunk Upload Error', { error });
        res.status(500).json({ message: error.message || 'Failed to initialize video upload.' });
    }
};

// ─── 3. Upload Individual Chunk ───────────────────────────────────────────────
const uploadChunk = async (req, res) => {
    try {
        const { uploadId, chunkIndex, totalChunks } = req.body;

        if (!uploadId || chunkIndex === undefined) {
            return res.status(400).json({ message: 'uploadId and chunkIndex are required.' });
        }

        const sessionDir = path.join(TEMP_DIR, uploadId);
        if (!fs.existsSync(sessionDir)) {
            return res.status(404).json({ message: 'Upload session not found or expired.' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No chunk data received.' });
        }

        let session = activeSessions.get(uploadId);
        if (!session) {
            session = {
                uploadId,
                userId: req.user?.id,
                totalChunks: parseInt(totalChunks) || 1,
                receivedChunks: new Set()
            };
            activeSessions.set(uploadId, session);
        }

        session.receivedChunks.add(parseInt(chunkIndex));

        return res.status(200).json({
            uploadId,
            chunkIndex: parseInt(chunkIndex),
            received: true,
            totalReceived: session.receivedChunks.size
        });
    } catch (error) {
        logger.error('Upload Chunk Error', { error });
        res.status(500).json({ message: error.message || 'Failed to upload video chunk.' });
    }
};

// ─── 4. Complete & Assemble Chunks ───────────────────────────────────────────
const completeChunkUpload = async (req, res) => {
    try {
        const { uploadId, fileName, totalChunks } = req.body;

        if (!uploadId || !fileName) {
            return res.status(400).json({ message: 'uploadId and fileName are required.' });
        }

        const sessionDir = path.join(TEMP_DIR, uploadId);
        if (!fs.existsSync(sessionDir)) {
            return res.status(404).json({ message: 'Upload session directory not found.' });
        }

        const ext = path.extname(fileName) || '.mp4';
        const finalFilename = `${req.user.id}-video-${Date.now()}${ext.toLowerCase()}`;
        const finalFilePath = path.join(UPLOAD_DIR, finalFilename);

        const writeStream = fs.createWriteStream(finalFilePath);
        const expectedChunks = parseInt(totalChunks) || fs.readdirSync(sessionDir).length;

        // Pipe chunks in sequential order
        for (let i = 0; i < expectedChunks; i++) {
            const chunkPath = path.join(sessionDir, `chunk_${i}`);
            if (!fs.existsSync(chunkPath)) {
                writeStream.end();
                // Clean up partial final file if incomplete
                if (fs.existsSync(finalFilePath)) fs.unlinkSync(finalFilePath);
                return res.status(400).json({ message: `Missing chunk ${i}. Please retry upload.` });
            }

            const chunkBuffer = fs.readFileSync(chunkPath);
            writeStream.write(chunkBuffer);
        }

        writeStream.end();

        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        // Clean up temporary chunk directory
        try {
            fs.rmSync(sessionDir, { recursive: true, force: true });
            activeSessions.delete(uploadId);
        } catch (cleanupErr) {
            logger.warn('Failed to clean up temp chunk dir', { error: cleanupErr });
        }

        const stats = fs.statSync(finalFilePath);
        const fileUrl = `/uploads/${finalFilename}`;

        return res.status(200).json({
            message: 'Video upload completed and assembled successfully',
            url: fileUrl,
            filename: finalFilename,
            size: stats.size
        });
    } catch (error) {
        logger.error('Complete Chunk Upload Error', { error });
        res.status(500).json({ message: error.message || 'Failed to finalize video upload.' });
    }
};

// ─── 5. Submit Verification Record (Decoupled or Legacy Multipart) ────────────
const submitVerification = async (req, res) => {
    try {
        const userId = req.user.id;

        // Support both pre-uploaded URLs (JSON body) and legacy multipart file streams
        let govIdUrl = req.body.gov_id_url || null;
        let cacUrl = req.body.cac_url || null;
        let videoUrl = req.body.video_url || null;

        if (req.files) {
            if (req.files['gov_id']) govIdUrl = `/uploads/${req.files['gov_id'][0].filename}`;
            if (req.files['cac_document']) cacUrl = `/uploads/${req.files['cac_document'][0].filename}`;
            if (req.files['business_video']) videoUrl = `/uploads/${req.files['business_video'][0].filename}`;
        }

        // Check if existing verification record exists
        const [existing] = await pool.query(
            'SELECT id, gov_id_url, cac_url, video_url FROM verifications WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1',
            [userId]
        );

        let finalGovIdUrl = govIdUrl;
        let finalCacUrl = cacUrl;
        let finalVideoUrl = videoUrl;

        if (existing.length > 0) {
            finalGovIdUrl = govIdUrl || existing[0].gov_id_url;
            finalCacUrl = cacUrl || existing[0].cac_url;
            finalVideoUrl = videoUrl || existing[0].video_url;
        }

        if (!finalGovIdUrl || !finalVideoUrl) {
            const html = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #D97706;">Registration Incomplete</h2>
                    <p>Hi there,</p>
                    <p>We noticed some required files (like your Government ID or Business Video) were missing when you submitted your verification.</p>
                    <p>Please log back in to your dashboard and re-upload the missing documents to complete your registration.</p>
                    <a href="${process.env.FRONTEND_URL || 'https://app.onlok.net'}/login" style="padding: 10px 15px; background: #0029FF; color: #fff; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Log In</a>
                    <br/><br/>
                    <p>Best regards,<br/><strong>The Onlok Team</strong></p>
                </div>
            `;
            await sendEmail(req.user.email, 'Action Required: Missing Documents - Onlok', html);
            return res.status(400).json({ message: 'Government ID and Business Video are required.' });
        }

        let verificationId = null;

        if (existing.length > 0) {
            verificationId = existing[0].id;
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
                finalGovIdUrl, Boolean(govIdUrl) ? 1 : 0, Boolean(govIdUrl) ? 1 : 0,
                finalCacUrl, Boolean(cacUrl) ? 1 : 0, Boolean(cacUrl) ? 1 : 0,
                finalVideoUrl, Boolean(videoUrl) ? 1 : 0, Boolean(videoUrl) ? 1 : 0,
                verificationId
            ]);
        } else {
            const insertQuery = `INSERT INTO verifications (user_id, gov_id_url, cac_url, video_url, status) VALUES (?, ?, ?, ?, 'pending')`;
            const [result] = await pool.query(insertQuery, [userId, finalGovIdUrl, finalCacUrl, finalVideoUrl]);
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
                <a href="${process.env.FRONTEND_URL || 'https://app.onlok.net'}/dashboard" style="padding: 10px 15px; background: #0029FF; color: #fff; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Go to Dashboard</a>
                <br/><br/>
                <p>Best regards,<br/><strong>The Onlok Team</strong></p>
            </div>
        `;
        await sendEmail(req.user.email, 'Application Received - Dashboard Ready', welcomeHtml);

        return res.status(200).json({
            message: 'Verification documents submitted successfully',
            verification_id: verificationId
        });
    } catch (error) {
        logger.error('Verification Submit Error', { error });
        res.status(500).json({ message: 'Server error submitting verification', error: error.message });
    }
};

// ─── 6. Get Current User Verification ─────────────────────────────────────────
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

        return res.status(200).json(rows[0]);
    } catch (error) {
        logger.error('Get Verification Error', { error });
        res.status(500).json({ message: 'Server error fetching verification' });
    }
};

// ─── 7. Resubmit / Update Verification Documents ──────────────────────────────
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

        let newGovIdUrl = req.body.gov_id_url || null;
        let newCacUrl = req.body.cac_url || null;
        let newVideoUrl = req.body.video_url || null;

        if (req.files) {
            if (req.files['gov_id']) newGovIdUrl = `/uploads/${req.files['gov_id'][0].filename}`;
            if (req.files['cac_document']) newCacUrl = `/uploads/${req.files['cac_document'][0].filename}`;
            if (req.files['business_video']) newVideoUrl = `/uploads/${req.files['business_video'][0].filename}`;
        }

        if (!newGovIdUrl && !newCacUrl && !newVideoUrl) {
            return res.status(400).json({ message: 'Please provide at least one document to resubmit.' });
        }

        const finalGovIdUrl = newGovIdUrl || currentRec.gov_id_url;
        const finalCacUrl = newCacUrl || currentRec.cac_url;
        const finalVideoUrl = newVideoUrl || currentRec.video_url;

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
            finalGovIdUrl, Boolean(newGovIdUrl) ? 1 : 0, Boolean(newGovIdUrl) ? 1 : 0,
            finalCacUrl, Boolean(newCacUrl) ? 1 : 0, Boolean(newCacUrl) ? 1 : 0,
            finalVideoUrl, Boolean(newVideoUrl) ? 1 : 0, Boolean(newVideoUrl) ? 1 : 0,
            currentRec.id
        ]);

        await pool.query('UPDATE users SET status = "pending" WHERE id = ?', [userId]);

        return res.status(200).json({
            message: 'Verification documents resubmitted successfully',
            verification_id: currentRec.id
        });
    } catch (error) {
        logger.error('Verification Resubmit Error', { error });
        res.status(500).json({ message: error.message || 'Failed to resubmit verification documents.' });
    }
};

module.exports = {
    uploadSingleDocument,
    initChunkUpload,
    uploadChunk,
    completeChunkUpload,
    submitVerification,
    getMyVerification,
    resubmitDocuments
};
