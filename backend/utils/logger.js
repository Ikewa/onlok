/**
 * Custom zero-dependency structured logger
 * Outputs JSON format suitable for log aggregation.
 */
const formatMessage = (level, message, meta = {}) => {
    // If an Error object is passed as meta or inside meta, format it nicely
    if (meta instanceof Error) {
        meta = { error: meta.message, stack: meta.stack };
    }

    return JSON.stringify({
        timestamp: new Date().toISOString(),
        level: level.toUpperCase(),
        message,
        ...meta
    });
};

const logger = {
    info: (message, meta) => console.log(formatMessage('info', message, meta)),
    error: (message, meta) => console.error(formatMessage('error', message, meta)),
    warn: (message, meta) => console.warn(formatMessage('warn', message, meta)),
    debug: (message, meta) => console.debug(formatMessage('debug', message, meta)),
};

module.exports = logger;
