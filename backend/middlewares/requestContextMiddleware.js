const { AsyncLocalStorage } = require('async_hooks');
const crypto = require('crypto');

const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Express middleware to initialize request context tracing store.
 *
 * The trace id is also echoed back on the response (`X-Trace-Id`) so a failing
 * request can be quoted by whoever hit it, and matched against the server log.
 */
const requestContextMiddleware = (req, res, next) => {
    const incomingTraceId = req.headers['x-trace-id'] || req.headers['x-request-id'] || req.id;
    const traceId = incomingTraceId || crypto.randomUUID();
    req.id = traceId;
    res.setHeader('X-Trace-Id', traceId);

    const store = {
        traceId,
        method: req.method,
        path: req.originalUrl || req.path,
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip,
        userId: null,
        userEmail: null,
        applicationId: null,
        uploadId: null
    };

    asyncLocalStorage.run(store, () => {
        next();
    });
};

/**
 * Helper to update user context in the active AsyncLocalStorage store once authenticated
 */
const setContextUser = (user) => {
    const store = asyncLocalStorage.getStore();
    if (store && user) {
        store.userId = user.id || user.userId || null;
        store.userEmail = user.email || null;
    }
};

/**
 * Attach resumable-upload context to the active store.
 */
const setContextRegistration = ({ applicationId, uploadId } = {}) => {
    const store = asyncLocalStorage.getStore();
    if (!store) return;
    if (applicationId) store.applicationId = applicationId;
    if (uploadId) store.uploadId = uploadId;
};

/**
 * Get current request context store
 */
const getRequestContext = () => {
    return asyncLocalStorage.getStore() || {};
};

/**
 * Run work outside of any HTTP request (cron jobs, queue workers, start-up
 * tasks) inside a context of its own, so its log lines are correlated the same
 * way request lines are instead of being anonymous.
 */
const runWithContext = (bindings, task) => {
    const store = {
        traceId: bindings?.traceId || crypto.randomUUID(),
        method: null,
        path: null,
        ip: null,
        userId: bindings?.userId ?? null,
        userEmail: bindings?.userEmail ?? null,
        applicationId: bindings?.applicationId ?? null,
        uploadId: bindings?.uploadId ?? null,
        job: bindings?.job ?? null
    };
    return asyncLocalStorage.run(store, () => task(store));
};

module.exports = {
    asyncLocalStorage,
    requestContextMiddleware,
    setContextUser,
    setContextRegistration,
    getRequestContext,
    runWithContext
};
