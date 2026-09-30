const crypto = require('crypto');
const { getRequestContext } = require('../middlewares/requestContextMiddleware');

/**
 * Structured, fail-safe logger.
 *
 * Design goals, in order:
 *  1. It never throws and never loses a line. A logger that fails while
 *     formatting an error is the worst possible failure mode, so formatting is
 *     wrapped and falls back to a minimal record.
 *  2. Every line carries enough context to correlate: traceId, userId,
 *     applicationId, uploadId, job, method and path.
 *  3. Failures say *why*. Status codes alone are not diagnosable, so error
 *     bodies, error messages and stack traces are included.
 *  4. Background work gets the same treatment as request work, via
 *     `logger.child()` and `logger.runJob()`.
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const configuredLevel = String(process.env.LOG_LEVEL || 'info').toLowerCase();
const ACTIVE_LEVEL = LEVELS[configuredLevel] === undefined ? LEVELS.info : LEVELS[configuredLevel];

const MAX_MESSAGE_LENGTH = Number(process.env.LOG_MAX_MESSAGE || 1000);
const MAX_STACK_LENGTH = Number(process.env.LOG_MAX_STACK || 3000);
const MAX_STRING_LENGTH = Number(process.env.LOG_MAX_STRING || 300);

/**
 * Fields that must never reach the log output.
 */
const SENSITIVE_KEYS = /password|confirm_password|confirmpassword|token|secret|authorization|pin|cvv|card_number|creditcard|signature|api_?key|bearer|refresh/i;

const truncate = (value, max) => {
    if (typeof value !== 'string') return value;
    return value.length > max ? `${value.slice(0, max)}…[+${value.length - max} chars]` : value;
};

/**
 * Recursively redact sensitive keys and keep the payload log-safe.
 * Never throws: a getter that blows up is reported instead of swallowed.
 */
const sanitize = (obj, depth = 0, seen = new WeakSet()) => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return truncate(obj, MAX_STRING_LENGTH);
    if (typeof obj !== 'object') return obj;
    if (depth > 5) return '[Object]';

    if (Buffer.isBuffer(obj)) return `[Buffer ${obj.length} bytes]`;
    if (obj instanceof Date) return obj.toISOString();
    if (obj instanceof Error) return '[Error]';
    if (typeof obj.pipe === 'function') return '[Stream]';

    if (seen.has(obj)) return '[Circular]';
    seen.add(obj);

    if (Array.isArray(obj)) {
        const list = obj.slice(0, 50).map((item) => sanitize(item, depth + 1, seen));
        if (obj.length > 50) list.push(`…[+${obj.length - 50} items]`);
        return list;
    }

    const output = {};
    for (const key of Object.keys(obj)) {
        if (SENSITIVE_KEYS.test(key)) {
            output[key] = '[REDACTED]';
            continue;
        }
        let value;
        try {
            value = obj[key];
        } catch (error) {
            output[key] = `[Unreadable: ${error.message}]`;
            continue;
        }
        output[key] = typeof value === 'function' ? '[Function]' : sanitize(value, depth + 1, seen);
    }
    return output;
};

/**
 * Serialize an error, including the causes that actually explain it: MySQL
 * detail, axios detail, HTTP status codes and the `cause` chain.
 */
const serializeError = (err, depth = 0) => {
    if (err === null || err === undefined) return null;
    if (depth > 3) return { message: '[nested error omitted]' };

    // Thrown non-Errors: strings, numbers, plain objects.
    if (!(err instanceof Error)) {
        if (typeof err === 'string') return { name: 'ThrownValue', message: truncate(err, MAX_MESSAGE_LENGTH) };
        if (typeof err !== 'object') return { name: 'ThrownValue', message: String(err) };
        return {
            name: err.name || 'ThrownObject',
            message: err.message || JSON.stringify(sanitize(err)).slice(0, MAX_MESSAGE_LENGTH),
            ...(err.code ? { code: err.code } : {})
        };
    }

    const serialized = {
        name: err.name || 'Error',
        message: truncate(err.message || String(err), MAX_MESSAGE_LENGTH),
        code: err.code ?? null,
        statusCode: err.statusCode ?? err.status ?? err.status_code ?? null
    };

    if (err.stack) serialized.stack = truncate(err.stack, MAX_STACK_LENGTH);

    if (err.errno !== undefined || err.sqlState || err.sqlMessage) {
        serialized.dbError = {
            errno: err.errno ?? null,
            sqlState: err.sqlState ?? null,
            sqlMessage: truncate(err.sqlMessage || '', MAX_STRING_LENGTH),
            sql: truncate(err.sql || '', MAX_STRING_LENGTH)
        };
    }

    if (err.isAxiosError || err.response || err.config) {
        serialized.httpError = {
            url: truncate(err.config?.url || '', MAX_STRING_LENGTH),
            method: err.config?.method?.toUpperCase() || null,
            status: err.response?.status ?? null,
            statusText: err.response?.statusText ?? null,
            responseData: sanitize(err.response?.data ?? null)
        };
    }

    if (err.cause) serialized.cause = serializeError(err.cause, depth + 1);
    if (err.errors?.length) serialized.causes = err.errors.slice(0, 3).map((e) => serializeError(e, depth + 1));

    return serialized;
};

const CONTEXT_FIELDS = ['traceId', 'userId', 'userEmail', 'applicationId', 'uploadId', 'job', 'runId', 'method', 'path'];

const buildRecord = (level, message, meta, bindings) => {
    const context = getRequestContext();
    let errorDetails = null;
    let extraMeta = {};

    if (meta instanceof Error) {
        errorDetails = serializeError(meta);
    } else if (meta && typeof meta === 'object') {
        const { error, err, ...rest } = meta;
        if (error !== undefined) errorDetails = serializeError(error);
        else if (err !== undefined) errorDetails = serializeError(err);
        extraMeta = rest;
    } else if (meta !== undefined && meta !== null) {
        extraMeta = { value: meta };
    }

    const sanitizedMeta = sanitize(extraMeta) || {};
    const record = { timestamp: new Date().toISOString(), level: level.toUpperCase() };

    for (const field of CONTEXT_FIELDS) {
        record[field] = context[field] ?? bindings?.[field] ?? sanitizedMeta[field] ?? null;
    }
    // Scope bindings that are not part of the context columns (job, runId, ...).
    if (bindings) {
        for (const [key, value] of Object.entries(bindings)) {
            if (!(key in record)) record[key] = sanitize(value);
        }
    }

    record.message = truncate(typeof message === 'string' ? message : String(message), MAX_MESSAGE_LENGTH);
    if (errorDetails) record.error = errorDetails;
    if (Object.keys(sanitizedMeta).length > 0) record.meta = sanitizedMeta;

    return record;
};

const write = (level, message, meta, bindings) => {
    if (LEVELS[level] > ACTIVE_LEVEL) return;

    let line;
    try {
        line = JSON.stringify(buildRecord(level, message, meta, bindings));
    } catch (error) {
        // Formatting must never take down the process or lose the line.
        try {
            line = JSON.stringify({
                timestamp: new Date().toISOString(),
                level: level.toUpperCase(),
                message: typeof message === 'string' ? truncate(message, MAX_MESSAGE_LENGTH) : String(message),
                logError: { message: error.message }
            });
        } catch {
            line = `{"level":"${level.toUpperCase()}","message":"unloggable record"}`;
        }
    }

    try {
        if (level === 'error') process.stderr.write(`${line}\n`);
        else process.stdout.write(`${line}\n`);
    } catch {
        // stdout/stderr closed (tests, piped processes): nothing else to do.
    }
};

const createLogger = (bindings = {}) => {
    const log = (level) => (message, meta) => write(level, message, meta, bindings);

    const scoped = {
        traceId: bindings.traceId,
        runId: bindings.runId,
        job: bindings.job,
        child: (extra) => createLogger({ ...bindings, ...extra }),
        info: log('info'),
        warn: log('warn'),
        error: log('error'),
        debug: log('debug'),

        /**
         * Runs a background job with a fresh trace id, start/finish logging,
         * duration and full error capture. Background work previously produced
         * unattributable `traceId: null` lines.
         */
        runJob: async (name, task, jobOptions = {}) => {
            const traceId = crypto.randomUUID();
            const jobLogger = createLogger({ ...bindings, traceId, job: name, runId: `${Date.now()}` });
            const startedAt = Date.now();
            jobLogger.debug(`Job started: ${name}`, jobOptions.meta || {});

            try {
                const result = await task(jobLogger);
                jobLogger.info(`Job finished: ${name}`, { durationMs: Date.now() - startedAt });
                return result;
            } catch (error) {
                jobLogger.error(`Job failed: ${name}`, { error, durationMs: Date.now() - startedAt });
                throw error;
            }
        }
    };

    return scoped;
};

const root = createLogger();

module.exports = {
    ...root,
    child: root.child,
    runJob: root.runJob,
    serializeError,
    sanitize,
    level: configuredLevel,
    activeLevel: ACTIVE_LEVEL
};
