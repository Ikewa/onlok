const { AsyncLocalStorage } = require('async_hooks');
const crypto = require('crypto');

const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Express middleware to initialize request context tracing store.
 */
const requestContextMiddleware = (req, res, next) => {
    const traceId = req.headers['x-trace-id'] || req.id || crypto.randomUUID();
    req.id = traceId;

    const store = {
        traceId,
        method: req.method,
        path: req.originalUrl || req.path,
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip,
        userId: null,
        userEmail: null
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
 * Get current request context store
 */
const getRequestContext = () => {
    return asyncLocalStorage.getStore() || {};
};

module.exports = {
    asyncLocalStorage,
    requestContextMiddleware,
    setContextUser,
    getRequestContext
};
