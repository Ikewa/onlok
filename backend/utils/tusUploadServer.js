const path = require('path');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const logger = require('./logger');
const { UPLOAD_DIR } = require('../middlewares/uploadMiddleware');
const { validateDocument, validateVideo } = require('./fileValidator');
const { setContextRegistration } = require('../middlewares/requestContextMiddleware');

const TUS_PATH = '/';
const MAX_UPLOAD_SIZE = 100 * 1024 * 1024;
const UPLOAD_EXPIRATION_MS = 24 * 60 * 60 * 1000;
const MAX_ACTIVE_UPLOADS_PER_USER = 3;
const MAX_ACTIVE_BYTES_PER_USER = 300 * 1024 * 1024;
const REQUESTS_PER_MINUTE_PER_USER = 180;
const MAX_ACTIVE_UPLOADS_GLOBAL = 50;
const requestCounters = new Map();
let activeUploadCount = 0;

const getHeader = (req, name) => {
    const value = req.headers?.[name.toLowerCase()];
    if (Array.isArray(value)) return value[0];
    return value || '';
};

const getUserId = (req) => {
    const authorization = getHeader(req, 'authorization');
    if (!authorization.startsWith('Bearer ')) {
        const error = new Error('Not authorized, no token');
        error.status_code = 401;
        throw error;
    }

    try {
        const decoded = jwt.verify(authorization.slice(7), process.env.JWT_SECRET);
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

const enforceRequestRate = (userId) => {
    const now = Date.now();
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
        allowedHeaders: ['Authorization', 'Upload-Metadata', 'Upload-Length', 'Upload-Offset', 'Tus-Resumable'],
        exposedHeaders: ['Location', 'Upload-Offset', 'Upload-Length', 'Tus-Resumable', 'Tus-Version'],
        onIncomingRequest: async (req, uploadId) => {
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
            let applicationId = getMetadata(upload, 'application-id');
            const fileName = getMetadata(upload, 'filename');
            const fileType = getMetadata(upload, 'filetype');

            if (!category || !['gov_id', 'cac_document', 'video'].includes(category)) {
                throw tusError('A valid upload category is required.', 422);
            }

            if (!fileName || !fileType) {
                throw tusError('File name and type are required.', 422);
            }

            const validation = category === 'video'
                ? validateVideo(fileName, fileType)
                : validateDocument(fileName, fileType);
            if (!validation.valid) {
                throw tusError(validation.error || 'Unsupported upload format.', 422);
            }

            if (!applicationId) {
                const [existingApplication] = await pool.execute(
                    `SELECT application_id
                     FROM registration_applications
                     WHERE user_id = ?
                     LIMIT 1`,
                    [userId]
                );
                applicationId = existingApplication[0]?.application_id || require('crypto').randomUUID();
                if (existingApplication.length === 0) {
                    await pool.execute(
                        `INSERT INTO registration_applications (application_id, user_id, status)
                         VALUES (?, ?, 'draft')`,
                        [applicationId, userId]
                    );
                }
            }
            setContextRegistration({ applicationId, uploadId: upload.id });

            const [applications] = await pool.execute(
                `SELECT application_id
                 FROM registration_applications
                 WHERE application_id = ? AND user_id = ? AND status IN ('draft', 'uploading', 'submitted', 'processing', 'failed')
                 LIMIT 1`,
                [applicationId, userId]
            );
            if (applications.length !== 1) {
                throw tusError('Registration application not found.', 404);
            }

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
                throw tusError('Upload capacity is temporarily full. Please retry shortly.', 503);
            }

            await pool.execute(
                `INSERT INTO upload_sessions
                    (upload_id, user_id, application_id, category, file_name, mime_type, total_size, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'uploading')`,
                [upload.id, userId, applicationId, category, fileName, fileType, upload.size || null]
            );

            await pool.execute(
                `UPDATE registration_applications
                 SET status = 'uploading', updated_at = CURRENT_TIMESTAMP
                 WHERE application_id = ? AND user_id = ?`,
                [applicationId, userId]
            );
            activeUploadCount += 1;

            return {};
        },
        onUploadFinish: async (req, upload) => {
            const userId = getUserId(req);
            setContextRegistration({ uploadId: upload.id });
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
        },
        onResponseError: (req, error) => {
            logger.warn('Tus upload request failed', {
                error,
                path: req.url,
            });
            return undefined;
        },
    });

    server.on(EVENTS.POST_RECEIVE, async (req, upload) => {
        try {
            const userId = getUserId(req);
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

    server.on(EVENTS.POST_FINISH, () => {
        activeUploadCount = Math.max(0, activeUploadCount - 1);
    });

    server.on(EVENTS.POST_TERMINATE, () => {
        activeUploadCount = Math.max(0, activeUploadCount - 1);
    });

    return server;
}

module.exports = {
    createTusUploadServer,
    MAX_UPLOAD_SIZE,
    UPLOAD_EXPIRATION_MS,
};
