const logger = require('../utils/logger');
const { setContextRegistration } = require('./requestContextMiddleware');

const SLOW_REQUEST_MS = Number(process.env.SLOW_REQUEST_MS || 2000);
const MAX_CAPTURED_BODY = 4096;
const TUS_PATH_PATTERN = /\/upload\/tus\/([^/?]+)/;
const STATIC_ASSET_PATTERN = /\.[a-z0-9]{2,5}$/i;
const QUIET_PATHS = [/^\/api\/health$/, /^\/api\/identities\/prembly-config$/];

/**
 * Decodes anything a response body can legally be written as. A Uint8Array
 * stringifies to a comma-separated byte list, which would put gibberish in the
 * log instead of the reason the request failed.
 */
const decodeChunk = (chunk) => {
    if (chunk === null || chunk === undefined) return '';
    if (Buffer.isBuffer(chunk)) return chunk.toString('utf8');
    if (ArrayBuffer.isView(chunk)) {
        return Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength).toString('utf8');
    }
    if (typeof chunk === 'string') return chunk;
    return String(chunk);
};

/**
 * Captures the beginning of a response body so a failed request records *why*
 * it failed. A bare status code is not diagnosable: `422` without the message
 * leaves nothing to act on.
 */
const captureBody = (res) => {
    let captured = '';
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    res.write = (chunk, ...rest) => {
        if (captured.length < MAX_CAPTURED_BODY) {
            captured += decodeChunk(chunk);
            if (captured.length > MAX_CAPTURED_BODY) captured = captured.slice(0, MAX_CAPTURED_BODY);
        }
        return originalWrite(chunk, ...rest);
    };

    res.end = (chunk, ...rest) => {
        if (chunk && captured.length < MAX_CAPTURED_BODY) {
            captured += decodeChunk(chunk);
            if (captured.length > MAX_CAPTURED_BODY) captured = captured.slice(0, MAX_CAPTURED_BODY);
        }
        return originalEnd(chunk, ...rest);
    };

    return () => captured;
};

/**
 * Pulls the human-readable reason out of an error body: JSON `message`/`error`
 * when present, otherwise the raw text.
 */
const extractErrorMessage = (rawBody) => {
    const body = (rawBody || '').trim();
    if (!body) return undefined;
    try {
        const parsed = JSON.parse(body);
        if (parsed && typeof parsed === 'object') {
            if (typeof parsed.message === 'string') return parsed.message;
            if (typeof parsed.error === 'string') return parsed.error;
        }
    } catch {
        // Not JSON: fall through to the raw text.
    }
    return body.length > 300 ? `${body.slice(0, 300)}…` : body;
};

const levelForResponse = (req, res) => {
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';

    const path = req.originalUrl || req.url || '';
    if (QUIET_PATHS.some((pattern) => pattern.test(path.split('?')[0]))) return 'debug';
    if ((req.method === 'GET' || req.method === 'HEAD') && STATIC_ASSET_PATTERN.test(path.split('?')[0])) return 'debug';
    if (res.statusCode === 304) return 'debug';
    return 'info';
};

/**
 * Logs every request with its outcome, duration and failure reason.
 *
 * Mounted before the tus handler so resumable uploads are visible: they used to
 * bypass the request log entirely, which is why upload failures produced no
 * server-side evidence at all.
 */
const requestLoggingMiddleware = (req, res, next) => {
    const startedAt = process.hrtime.bigint();
    const getBody = captureBody(res);
    const path = req.originalUrl || req.url || '';
    const tusMatch = TUS_PATH_PATTERN.exec(path);

    // Uploads are identified by id, so a failure can be traced to one transfer.
    if (tusMatch) {
        setContextRegistration({ uploadId: decodeURIComponent(tusMatch[1]) });
    }

    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        const duration = Math.round(durationMs * 100) / 100;
        const isFailure = res.statusCode >= 400;
        const level = levelForResponse(req, res);

        const meta = {
            type: 'http_request',
            statusCode: res.statusCode,
            durationMs: duration
        };

        if (duration >= SLOW_REQUEST_MS) {
            meta.slow = true;
            meta.slowThresholdMs = SLOW_REQUEST_MS;
        }
        if (req.ip) meta.ip = req.ip;
        if (req.get?.('user-agent')) meta.userAgent = req.get('user-agent');
        if (res.getHeader('content-length')) meta.bytes = Number(res.getHeader('content-length')) || null;
        if (isFailure) meta.errorMessage = extractErrorMessage(getBody());
        if (res.locals?.logMeta) Object.assign(meta, res.locals.logMeta);

        const method = level === 'debug' ? 'debug' : level;
        logger[method](`HTTP ${req.method} ${path} ${res.statusCode} (${duration}ms)`, meta);
    });

    // A socket that dies mid-request must not vanish from the logs.
    res.on('close', () => {
        if (res.writableFinished) return;
        logger.warn(`HTTP ${req.method} ${path} aborted by client`, {
            type: 'http_request',
            statusCode: res.statusCode,
            durationMs: Math.round(Number(process.hrtime.bigint() - startedAt) / 1e5) / 10,
            aborted: true
        });
    });

    next();
};

module.exports = { requestLoggingMiddleware, extractErrorMessage, SLOW_REQUEST_MS };
