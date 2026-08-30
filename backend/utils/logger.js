const { getRequestContext } = require('../middlewares/requestContextMiddleware');

/**
 * Sensitive fields to automatically mask in log output
 */
const SENSITIVE_KEYS = /password|confirm_password|confirmpassword|token|secret|authorization|pin|cvv|card_number|creditcard/i;

/**
 * Recursively sanitize an object to redact sensitive keys
 */
const sanitize = (obj, depth = 0) => {
    if (depth > 5 || obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitize(item, depth + 1));
    }

    // Handle Buffer / Stream objects
    if (Buffer.isBuffer(obj)) {
        return `[Buffer ${obj.length} bytes]`;
    }

    const sanitizedObj = {};
    for (const [key, value] of Object.entries(obj)) {
        if (SENSITIVE_KEYS.test(key)) {
            sanitizedObj[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            sanitizedObj[key] = sanitize(value, depth + 1);
        } else {
            sanitizedObj[key] = value;
        }
    }
    return sanitizedObj;
};

/**
 * Serialize Error objects (including Axios, MySQL, and Custom Errors) into rich diagnostic objects
 */
const serializeError = (err) => {
    if (!err) return null;

    if (!(err instanceof Error) && typeof err === 'object') {
        return sanitize(err);
    }

    const errObj = {
        name: err.name || 'Error',
        message: err.message || String(err),
        code: err.code || null,
        stack: err.stack || null
    };

    // MySQL / Database Error Details
    if (err.sqlMessage || err.sqlState || err.sql) {
        errObj.dbError = {
            sqlMessage: err.sqlMessage,
            sqlState: err.sqlState,
            errno: err.errno,
            sql: err.sql
        };
    }

    // Axios HTTP Client Error Details (Paystack, Prembly, External APIs)
    if (err.isAxiosError || err.response || err.config) {
        errObj.axiosError = {
            url: err.config?.url || null,
            method: err.config?.method?.toUpperCase() || null,
            status: err.response?.status || null,
            statusText: err.response?.statusText || null,
            responseData: sanitize(err.response?.data || null)
        };
    }

    return errObj;
};

/**
 * Formats a log record with traceId, userId, timestamp, level, and metadata
 */
const formatMessage = (level, message, meta = {}) => {
    const context = getRequestContext();

    let errorDetails = null;
    let extraMeta = {};

    if (meta instanceof Error) {
        errorDetails = serializeError(meta);
    } else if (typeof meta === 'object' && meta !== null) {
        const { error, err, ...rest } = meta;
        if (error || err) {
            errorDetails = serializeError(error || err);
        }
        extraMeta = rest;
    } else if (meta !== undefined) {
        extraMeta = { value: meta };
    }

    const sanitizedMeta = sanitize(extraMeta);

    const logEntry = {
        timestamp: new Date().toISOString(),
        level: level.toUpperCase(),
        traceId: context.traceId || sanitizedMeta.traceId || null,
        userId: context.userId || sanitizedMeta.userId || null,
        userEmail: context.userEmail || sanitizedMeta.userEmail || null,
        method: context.method || sanitizedMeta.method || null,
        path: context.path || sanitizedMeta.path || null,
        message,
        ...(errorDetails ? { error: errorDetails } : {}),
        ...(Object.keys(sanitizedMeta).length > 0 ? { meta: sanitizedMeta } : {})
    };

    return JSON.stringify(logEntry);
};

const logger = {
    info: (message, meta) => console.log(formatMessage('info', message, meta)),
    error: (message, meta) => console.error(formatMessage('error', message, meta)),
    warn: (message, meta) => console.warn(formatMessage('warn', message, meta)),
    debug: (message, meta) => console.debug(formatMessage('debug', message, meta)),
    serializeError,
    sanitize
};

module.exports = logger;
