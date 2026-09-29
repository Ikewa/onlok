const crypto = require('crypto');
const pool = require('../config/db');
const { signMediaPath, stripMediaSignature } = require('../utils/signedMedia');
const logger = require('../utils/logger');
const { setContextRegistration } = require('../middlewares/requestContextMiddleware');

const TUS_URL_PREFIX = '/uploads/tus/';
const DOCUMENT_CATEGORIES = { gov_id: 'gov_id', cac_document: 'cac_document', video: 'video' };

class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

/**
 * Recovers the tus upload id from a stored media URL so that URLs handed out
 * by older API responses can still be validated against upload_sessions.
 */
const uploadIdFromUrl = (url) => {
    if (typeof url !== 'string') return null;
    const pathname = stripMediaSignature(url).split('?')[0];
    if (!pathname.startsWith(TUS_URL_PREFIX)) return null;
    const uploadId = pathname.slice(TUS_URL_PREFIX.length);
    return /^[A-Za-z0-9_-]+$/.test(uploadId) ? uploadId : null;
};

const uploadUrl = (uploadId) => (uploadId ? `${TUS_URL_PREFIX}${encodeURIComponent(uploadId)}` : null);

/**
 * Resolves the uploaded documents referenced by a request into verified URLs.
 * Every reference must be a completed upload owned by the caller and, when an
 * application is supplied, attached to it. Raw URLs are never trusted as-is.
 */
const resolveUploadReferences = async (executor, userId, references, { applicationId = null, required = [] } = {}) => {
    const resolved = {};
    const pending = [];

    for (const [field, category] of Object.entries(DOCUMENT_CATEGORIES)) {
        const uploadId = references[`${field}UploadId`] || uploadIdFromUrl(references[`${field}Url`]);

        if (!uploadId) {
            if (required.includes(field)) {
                throw new ApiError(422, `A completed ${field} upload is required.`);
            }
            resolved[field] = null;
            continue;
        }

        pending.push({ field, category, uploadId });
    }

    if (pending.length > 0) {
        const params = [...pending.map((item) => item.uploadId)];
        let sql = 'SELECT upload_id, category, status FROM upload_sessions WHERE user_id = ? AND upload_id IN (?)';
        if (applicationId) {
            sql += ' AND application_id = ?';
            params.push(applicationId);
        }
        sql += ' FOR UPDATE';

        const [uploads] = await executor.query(sql, params);
        const byId = new Map(uploads.map((upload) => [upload.upload_id, upload]));

        for (const { field, category, uploadId } of pending) {
            const upload = byId.get(uploadId);
            if (!upload || upload.status !== 'completed' || upload.category !== category) {
                throw new ApiError(422, `The ${field} upload is invalid or incomplete. Please upload it again.`);
            }
            resolved[field] = uploadUrl(uploadId);
        }
    }

    return resolved;
};

const loadVerificationRecord = async (executor, userId) => {
    const [rows] = await executor.query(
        `SELECT id, gov_id_url, cac_url, video_url
         FROM verifications
         WHERE user_id = ?
         ORDER BY submitted_at DESC
         LIMIT 1`,
        [userId]
    );
    return rows[0] || null;
};

/**
 * Writes the document set onto the verification record.
 * `provided` marks which documents this request actually replaced, so admin
 * feedback on untouched documents survives a partial update.
 */
const applyVerificationDocuments = async (executor, { verificationId, userId, urls, provided }) => {
    if (verificationId) {
        await executor.query(
            `UPDATE verifications
             SET status = 'pending', admin_notes = NULL, reviewed_at = NULL, reviewed_by = NULL,
                 gov_id_url = ?,
                 gov_id_status = IF(?, 'pending', gov_id_status), gov_id_notes = IF(?, NULL, gov_id_notes),
                 cac_url = ?,
                 cac_status = IF(?, 'pending', cac_status), cac_notes = IF(?, NULL, cac_notes),
                 video_url = ?,
                 video_status = IF(?, 'pending', video_status), video_notes = IF(?, NULL, video_notes),
                 submitted_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                urls.gov_id, provided.gov_id ? 1 : 0, provided.gov_id ? 1 : 0,
                urls.cac_document, provided.cac_document ? 1 : 0, provided.cac_document ? 1 : 0,
                urls.video, provided.video ? 1 : 0, provided.video ? 1 : 0,
                verificationId
            ]
        );
        return verificationId;
    }

    const [result] = await executor.query(
        `INSERT INTO verifications (user_id, gov_id_url, cac_url, video_url, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [userId, urls.gov_id, urls.cac_document, urls.video]
    );
    return result.insertId;
};

const createRegistrationApplication = async (req, res) => {
    const userId = req.user.id;

    try {
        const [existing] = await pool.query(
            `SELECT application_id, status
             FROM registration_applications
             WHERE user_id = ?
             LIMIT 1`,
            [userId]
        );

        if (existing.length > 0) {
            return res.status(200).json(existing[0]);
        }

        const applicationId = crypto.randomUUID();
        setContextRegistration({ applicationId });
        await pool.execute(
            `INSERT INTO registration_applications (application_id, user_id, status)
             VALUES (?, ?, 'draft')`,
            [applicationId, userId]
        );

        return res.status(201).json({ application_id: applicationId, status: 'draft' });
    } catch (error) {
        logger.error('Create Registration Application Error', { error });
        return res.status(500).json({ message: 'Server error creating registration application' });
    }
};

/**
 * Finalises a registration application from already-uploaded documents.
 * Safe to call again after a failure: uploads are re-validated and the
 * idempotency key collapses duplicate submissions.
 */
const submitVerification = async (req, res) => {
    const userId = req.user.id;
    const applicationId = req.body?.application_id;
    const idempotencyKey = String(req.headers['idempotency-key'] || '').trim() || crypto.randomUUID();
    const connection = await pool.getConnection();

    if (!applicationId) {
        connection.release();
        return res.status(400).json({ message: 'application_id is required.' });
    }

    setContextRegistration({ applicationId });

    try {
        await connection.beginTransaction();

        const [applications] = await connection.query(
            `SELECT application_id, status
             FROM registration_applications
             WHERE application_id = ? AND user_id = ?
             FOR UPDATE`,
            [applicationId, userId]
        );

        if (applications.length !== 1) {
            await connection.rollback();
            return res.status(404).json({ message: 'Registration application not found.' });
        }

        const [existingIdempotency] = await connection.query(
            `SELECT verification_id
             FROM registration_idempotency
             WHERE idempotency_key = ? AND user_id = ?
             FOR UPDATE`,
            [idempotencyKey, userId]
        );

        if (existingIdempotency.length > 0 && existingIdempotency[0].verification_id) {
            await connection.commit();
            return res.status(200).json({
                message: 'Verification documents submitted successfully',
                verification_id: existingIdempotency[0].verification_id
            });
        }

        // "processing" and "complete" are terminal; anything else may be
        // (re-)submitted, including a previously submitted application whose
        // documents were rejected.
        if (['processing', 'complete'].includes(applications[0].status)) {
            const record = await loadVerificationRecord(connection, userId);
            await connection.commit();
            return res.status(200).json({
                message: 'Verification documents submitted successfully',
                verification_id: record?.id || null
            });
        }

        // A first submission needs a government ID and a video. Later
        // submissions may replace a subset and keep the documents already on
        // file, which is what the dashboard document page relies on.
        const existingRecord = await loadVerificationRecord(connection, userId);
        const resolved = await resolveUploadReferences(
            connection,
            userId,
            {
                govIdUploadId: req.body.gov_id_upload_id,
                cacUploadId: req.body.cac_upload_id,
                videoUploadId: req.body.video_upload_id,
                govIdUrl: req.body.gov_id_url,
                cacUrl: req.body.cac_url,
                videoUrl: req.body.video_url
            },
            { applicationId, required: existingRecord ? [] : ['gov_id', 'video'] }
        );

        const urls = {
            gov_id: resolved.gov_id || existingRecord?.gov_id_url || null,
            cac_document: resolved.cac_document || existingRecord?.cac_url || null,
            video: resolved.video || existingRecord?.video_url || null
        };

        if (!urls.gov_id || !urls.video) {
            throw new ApiError(422, 'A completed Government ID and Business Video upload is required.');
        }

        const verificationId = await applyVerificationDocuments(connection, {
            verificationId: existingRecord?.id || null,
            userId,
            urls,
            provided: resolved
        });

        await connection.query(`UPDATE users SET status = 'pending' WHERE id = ?`, [userId]);
        await connection.query(
            `UPDATE registration_applications
             SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE application_id = ? AND user_id = ?`,
            [applicationId, userId]
        );
        await connection.query(
            `INSERT INTO registration_idempotency (idempotency_key, user_id, application_id, verification_id)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE verification_id = VALUES(verification_id)`,
            [idempotencyKey, userId, applicationId, verificationId]
        );
        await connection.query(
            `INSERT INTO registration_outbox (event_type, aggregate_id, payload)
             VALUES ('registration.submitted', ?, ?)`,
            [applicationId, JSON.stringify({ userId, verificationId, applicationId })]
        );

        await connection.commit();

        return res.status(200).json({
            message: 'Verification documents submitted successfully',
            verification_id: verificationId
        });
    } catch (error) {
        await connection.rollback();
        if (error instanceof ApiError) {
            return res.status(error.status).json({ message: error.message });
        }
        logger.error('Registration Application Submit Error', { error, userId, applicationId });
        return res.status(500).json({ message: 'Server error submitting registration application' });
    } finally {
        connection.release();
    }
};

/**
 * Loads the mime types of the documents referenced by a record so the client
 * can render PDFs, images and video without guessing from a file extension.
 */
const loadDocumentMimes = async (userId, urls) => {
    const uploadIds = Object.values(urls)
        .map(uploadIdFromUrl)
        .filter(Boolean);

    if (uploadIds.length === 0) return {};

    const [rows] = await pool.query(
        'SELECT upload_id, mime_type FROM upload_sessions WHERE user_id = ? AND upload_id IN (?)',
        [userId, uploadIds]
    );

    return new Map(rows.map((row) => [row.upload_id, row.mime_type]));
};

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

        const record = rows[0];
        const mimes = await loadDocumentMimes(req.user.id, {
            gov_id: record.gov_id_url,
            cac: record.cac_url,
            video: record.video_url
        });

        return res.status(200).json({
            ...record,
            gov_id_mime: mimes.get(uploadIdFromUrl(record.gov_id_url)) || null,
            cac_mime: mimes.get(uploadIdFromUrl(record.cac_url)) || null,
            video_mime: mimes.get(uploadIdFromUrl(record.video_url)) || null,
            gov_id_url: signMediaPath(record.gov_id_url),
            cac_url: signMediaPath(record.cac_url),
            video_url: signMediaPath(record.video_url)
        });
    } catch (error) {
        logger.error('Get Verification Error', { error });
        return res.status(500).json({ message: 'Server error fetching verification' });
    }
};

/**
 * Replaces one or more documents on an existing verification record.
 * References are validated against upload_sessions exactly like a submission.
 */
const resubmitDocuments = async (req, res) => {
    const userId = req.user.id;
    const connection = await pool.getConnection();

    try {
        const [existing] = await connection.query(
            `SELECT v.id, v.user_id, v.gov_id_url, v.cac_url, v.video_url
             FROM verifications v
             WHERE v.user_id = ?
             ORDER BY v.submitted_at DESC
             LIMIT 1
             FOR UPDATE`,
            [userId]
        );

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'No existing verification record found to resubmit.' });
        }

        const record = existing[0];
        const references = {
            govIdUploadId: req.body?.gov_id_upload_id,
            cacUploadId: req.body?.cac_upload_id,
            videoUploadId: req.body?.video_upload_id,
            govIdUrl: req.body?.gov_id_url,
            cacUrl: req.body?.cac_url,
            videoUrl: req.body?.video_url
        };

        if (!Object.values(references).some(Boolean)) {
            await connection.rollback();
            return res.status(400).json({ message: 'Please provide at least one document to resubmit.' });
        }

        const [application] = await connection.query(
            'SELECT application_id FROM registration_applications WHERE user_id = ? LIMIT 1',
            [userId]
        );
        const applicationId = application[0]?.application_id || null;

        const resolved = await resolveUploadReferences(connection, userId, references, {
            applicationId,
            required: []
        });

        const urls = {
            gov_id: resolved.gov_id || record.gov_id_url,
            cac_document: resolved.cac_document || record.cac_url,
            video: resolved.video || record.video_url
        };

        if (!urls.gov_id || !urls.video) {
            await connection.rollback();
            return res.status(400).json({ message: 'Government ID and Business Video are required.' });
        }

        await connection.query(
            `UPDATE verifications
             SET status = 'pending',
                 admin_notes = NULL,
                 reviewed_at = NULL,
                 reviewed_by = NULL,
                 gov_id_url = ?,
                 gov_id_status = IF(?, 'pending', gov_id_status), gov_id_notes = IF(?, NULL, gov_id_notes),
                 cac_url = ?,
                 cac_status = IF(?, 'pending', cac_status), cac_notes = IF(?, NULL, cac_notes),
                 video_url = ?,
                 video_status = IF(?, 'pending', video_status), video_notes = IF(?, NULL, video_notes),
                 submitted_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                urls.gov_id, resolved.gov_id ? 1 : 0, resolved.gov_id ? 1 : 0,
                urls.cac_document, resolved.cac_document ? 1 : 0, resolved.cac_document ? 1 : 0,
                urls.video, resolved.video ? 1 : 0, resolved.video ? 1 : 0,
                record.id
            ]
        );

        await connection.query(`UPDATE users SET status = 'pending' WHERE id = ?`, [userId]);

        if (applicationId) {
            await connection.query(
                `UPDATE registration_applications
                 SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                 WHERE application_id = ? AND user_id = ?`,
                [applicationId, userId]
            );
        }

        await connection.query(
            `INSERT INTO registration_outbox (event_type, aggregate_id, payload)
             VALUES ('registration.submitted', ?, ?)`,
            [applicationId || `verification-${record.id}`, JSON.stringify({ userId, verificationId: record.id, applicationId })]
        );

        await connection.commit();

        return res.status(200).json({
            message: 'Verification documents resubmitted successfully',
            verification_id: record.id
        });
    } catch (error) {
        await connection.rollback();
        if (error instanceof ApiError) {
            return res.status(error.status).json({ message: error.message });
        }
        logger.error('Verification Resubmit Error', { error });
        return res.status(500).json({ message: 'Server error resubmitting verification documents.' });
    } finally {
        connection.release();
    }
};

module.exports = {
    createRegistrationApplication,
    submitVerification,
    getMyVerification,
    resubmitDocuments
};
