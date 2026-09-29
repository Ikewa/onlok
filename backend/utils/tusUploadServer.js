const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const logger = require('./logger');
const { UPLOAD_DIR } = require('../middlewares/uploadMiddleware');
const { getCategoryConfig, validateDocument, validateVideo, assertContentMatchesCategory } = require('./fileValidator');
const { setContextRegistration } = require('../middlewares/requestContextMiddleware');

const TUS_PATH = '/';
const MAX_UPLOAD_SIZE = 100 * 1024 * 1024;
const UPLOAD_EXPIRATION_MS = 24 * 60 * 60 * 1000;
const MAX_ACTIVE_UPLOADS_PER_USER = 3;
const MAX_ACTIVE_BYTES_PER_USER = 300 * 1024 * 1024;
const REQUESTS_PER_MINUTE_PER_USER = 180;
const MAX_ACTIVE_UPLOADS_GLOBAL = 50;
const RATE_COUNTER_SWEEP_THRESHOLD = 1000;
const requestCounters = new Map();

// uploadId -> userId, populated on create/resume so the per-chunk progress hook
// does not need (and cannot use) the request object.
const uploadOwners = new Map();
let activeUploadCount = 0;

const getHeader = (req, name) => {
    const headers = req.headers;
    if (headers && typeof headers.get === 'function') {
        return headers.get(name) || '';
    }
    const value = headers?.[name.toLowerCase()];
    if (Array.isArray(value)) return value[0];
    return value || '';
};

/**
 * Authenticates the upload request. Only the Authorization header is accepted;
 * the JWT must never travel in the query string because URLs are written to
 * access logs, browser history and Location headers.
 */
const getUserId = (req) => {
    const authorization = getHeader(req, 'authorization');

    if (!authorization || !authorization.startsWith('Bearer ')) {
        const error = new Error('Not authorized, no token');
        error.status_code = 401;
        throw error;
    }

    const tokenStr = authorization.slice(7).trim();
    if (!tokenStr) {
        const error = new Error('Not authorized, no token');
        error.status_code = 401;
        throw error;
    }

    try {
        const decoded = jwt.verify(tokenStr, process.env.JWT_SECRET);
        return Number(decoded.id);
    } catch (error) {
        const authError = new Error('Not authorized, token failed');
        authError.status_code = 401;
        throw authError;
    }
};

const tusError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.status_code = statusCode;
    return error;
};

const getMetadata = (upload, key) => upload.metadata?.[key] || null;

const rememberOwner = (uploadId, userId) => {
    if (uploadId && userId) uploadOwners.set(uploadId, userId);
};

const forgetOwner = (uploadId) => {
    if (uploadId) uploadOwners.delete(uploadId);
};

const enforceRequestRate = (userId) => {
    const now = Date.now();

    if (requestCounters.size > RATE_COUNTER_SWEEP_THRESHOLD) {
        for (const [key, value] of requestCounters) {
            if (now - value.startedAt >= 60_000) requestCounters.delete(key);
        }
    }

    const current = requestCounters.get(userId);
    if (!current || now - current.startedAt >= 60_000) {
        requestCounters.set(userId, { startedAt: now, count: 1 });
        return;
    }

    current.count += 1;
    if (current.count > REQUESTS_PER_MINUTE_PER_USER) {
        throw tusError('Upload rate limit exceeded. Please retry shortly.', 429);
    }
};

const assertOwnedUpload = async (uploadId, userId) => {
    const [rows] = await pool.execute(
        'SELECT upload_id FROM upload_sessions WHERE upload_id = ? AND user_id = ? LIMIT 1',
        [uploadId, userId]
    );

    if (rows.length !== 1) {
        throw tusError('Upload session not found.', 404);
    }

    rememberOwner(uploadId, userId);
};

/**
 * The in-memory counter drifts whenever an upload is abandoned without a
 * DELETE. Re-derive it from the database when the cap is reached so a leaked
 * slot cannot permanently shrink capacity.
 */
const reconcileActiveUploadCount = async () => {
    const [rows] = await pool.query(
        `SELECT COUNT(*) AS count
         FROM upload_sessions
         WHERE status = 'uploading'
           AND created_at > DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 24 HOUR)`
    );
    activeUploadCount = Number(rows[0]?.count || 0);
};

const resolveApplicationId = async (requestedApplicationId, userId) => {
    if (requestedApplicationId) {
        const [existingApp] = await pool.execute(
            `SELECT application_id
             FROM registration_applications
             WHERE application_id = ? AND user_id = ?
             LIMIT 1`,
            [requestedApplicationId, userId]
        );
        if (existingApp.length > 0) return requestedApplicationId;

        logger.warn('Tus upload: provided application ID not found for user; resolving another', {
            userId,
            requestedApplicationId
        });
    }

    const [userApp] = await pool.execute(
        'SELECT application_id FROM registration_applications WHERE user_id = ? LIMIT 1',
        [userId]
    );
    if (userApp.length > 0) return userApp[0].application_id;

    const applicationId = crypto.randomUUID();
    await pool.execute(
        `INSERT INTO registration_applications (application_id, user_id, status)
         VALUES (?, ?, 'draft')`,
        [applicationId, userId]
    );
    return applicationId;
};

async function createTusUploadServer() {
    const [{ Server, EVENTS }, { FileStore }] = await Promise.all([
        import('@tus/server'),
        import('@tus/file-store'),
    ]);

    const dataStore = new FileStore({
        directory: path.join(UPLOAD_DIR, 'tus'),
        expirationPeriodInMilliseconds: UPLOAD_EXPIRATION_MS,
    });

    const server = new Server({
        path: TUS_PATH,
        datastore: dataStore,
        maxSize: MAX_UPLOAD_SIZE,
        relativeLocation: true,
        generateUrl: (_req, { id }) => `/api/verifications/upload/tus/${encodeURIComponent(id)}`,
        allowedHeaders: ['Authorization', 'authorization', 'x-access-token', 'Upload-Metadata', 'Upload-Length', 'Upload-Offset', 'Tus-Resumable', 'Content-Type'],
        exposedHeaders: ['Location', 'Upload-Offset', 'Upload-Length', 'Tus-Resumable', 'Tus-Version'],
        onIncomingRequest: async (req, uploadId) => {
            if (req.method === 'OPTIONS') {
                return;
            }
            const userId = getUserId(req);
            enforceRequestRate(userId);
            setContextRegistration({ uploadId });
            if (req.method !== 'POST') {
                await assertOwnedUpload(uploadId, userId);
            }
        },
        onUploadCreate: async (req, upload) => {
            const userId = getUserId(req);
            const category = getMetadata(upload, 'upload-category');
            const fileName = getMetadata(upload, 'filename');
            const fileType = getMetadata(upload, 'filetype');

            if (!category || !getCategoryConfig(category)) {
                throw tusError('A valid upload category is required.', 422);
            }

            if (!fileName || !fileType) {
                throw tusError('File name and type are required.', 422);
            }

            if (!Number.isFinite(Number(upload.size))) {
                throw tusError('Upload-Length is required.', 422);
            }

            const categoryConfig = getCategoryConfig(category);
            if (Number(upload.size) > categoryConfig.maxSize) {
                throw tusError(
                    `This file exceeds the ${Math.round(categoryConfig.maxSize / (1024 * 1024))}MB limit for ${category}.`,
                    413
                );
            }

            const validation = categoryConfig.kind === 'video'
                ? validateVideo(fileName, fileType)
                : validateDocument(fileName, fileType);
            if (!validation.valid) {
                throw tusError(validation.error || 'Unsupported upload format.', 422);
            }

            const applicationId = await resolveApplicationId(
                getMetadata(upload, 'application-id'),
                userId
            );
            setContextRegistration({ applicationId, uploadId: upload.id });
            rememberOwner(upload.id, userId);

            const [activeUploads] = await pool.execute(
                `SELECT COUNT(*) AS count, COALESCE(SUM(total_size), 0) AS bytes
                 FROM upload_sessions
                 WHERE user_id = ? AND status = 'uploading'`,
                [userId]
            );
            if (Number(activeUploads[0].count) >= MAX_ACTIVE_UPLOADS_PER_USER) {
                throw tusError('Too many active uploads. Please finish or cancel one first.', 429);
            }
            if (Number(activeUploads[0].bytes) + Number(upload.size || 0) > MAX_ACTIVE_BYTES_PER_USER) {
                throw tusError('Active upload capacity for this account has been reached.', 413);
            }
            if (activeUploadCount >= MAX_ACTIVE_UPLOADS_GLOBAL) {
                await reconcileActiveUploadCount();
            }
            if (activeUploadCount >= MAX_ACTIVE_UPLOADS_GLOBAL) {
                throw tusError('Upload capacity is temporarily full. Please retry shortly.', 503);
            }

            await pool.execute(
                `INSERT INTO upload_sessions
                    (upload_id, user_id, application_id, category, file_name, mime_type, total_size, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'uploading')`,
                [upload.id, userId, applicationId, category, fileName, fileType, upload.size]
            );

            // Never move a submitted or completed application back to
            // "uploading"; only drafts and failed attempts are resumable.
            await pool.execute(
                `UPDATE registration_applications
                 SET status = 'uploading', updated_at = CURRENT_TIMESTAMP
                 WHERE application_id = ? AND user_id = ? AND status IN ('draft', 'failed')`,
                [applicationId, userId]
            );
            activeUploadCount += 1;

            return {};
        },
        onUploadFinish: async (req, upload) => {
            const userId = getUserId(req);
            setContextRegistration({ uploadId: upload.id });

            // A rejected finish must not leak the global upload slot; the
            // success path releases it through the POST_FINISH event.
            try {
                const [sessions] = await pool.execute(
                    'SELECT category, status FROM upload_sessions WHERE upload_id = ? AND user_id = ? LIMIT 1',
                    [upload.id, userId]
                );

                if (sessions.length !== 1) {
                    throw tusError('Upload session is not owned by the current user.', 403);
                }

                const storedPath = path.join(UPLOAD_DIR, 'tus', upload.id);
                const contentCheck = await assertContentMatchesCategory(sessions[0].category, storedPath);
                if (!contentCheck.valid) {
                    await pool.execute(
                        `UPDATE upload_sessions
                         SET status = 'failed', updated_at = CURRENT_TIMESTAMP
                         WHERE upload_id = ? AND user_id = ?`,
                        [upload.id, userId]
                    );
                    throw tusError(contentCheck.error || 'Uploaded content did not match the declared format.', 422);
                }

                const [result] = await pool.execute(
                    `UPDATE upload_sessions
                     SET offset_bytes = ?, status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                     WHERE upload_id = ? AND user_id = ?`,
                    [upload.offset, upload.id, userId]
                );

                if (result.affectedRows !== 1) {
                    throw tusError('Upload session is not owned by the current user.', 403);
                }

                return {};
            } catch (error) {
                forgetOwner(upload.id);
                activeUploadCount = Math.max(0, activeUploadCount - 1);
                throw error;
            }
        },
        onResponseError: (req, error) => {
            logger.warn('Tus upload request failed', {
                error,
                path: req.url
            });
            return undefined;
        },
    });

    // NOTE: this event carries the body stream as its first argument, not the
    // request, so authentication cannot be re-derived here. Ownership is taken
    // from the map filled during create/resume.
    server.on(EVENTS.POST_RECEIVE, async (_stream, upload) => {
        const userId = upload?.id ? uploadOwners.get(upload.id) : null;
        if (!userId) return;

        try {
            await pool.execute(
                `UPDATE upload_sessions
                 SET offset_bytes = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE upload_id = ? AND user_id = ? AND status = 'uploading'`,
                [upload.offset, upload.id, userId]
            );
        } catch (error) {
            logger.warn('Tus upload progress persistence failed', { error, uploadId: upload.id });
        }
    });

    // POST_TERMINATE passes the bare upload id, POST_FINISH the upload object.
    const releaseSlot = (target) => {
        const uploadId = typeof target === 'string' ? target : target?.id;
        forgetOwner(uploadId);
        activeUploadCount = Math.max(0, activeUploadCount - 1);
    };

    server.on(EVENTS.POST_FINISH, (_req, _res, upload) => releaseSlot(upload));
    server.on(EVENTS.POST_TERMINATE, (_req, _res, upload) => releaseSlot(upload));

    return server;
}

module.exports = {
    createTusUploadServer,
    MAX_UPLOAD_SIZE,
    UPLOAD_EXPIRATION_MS
};
