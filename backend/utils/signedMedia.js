const crypto = require('crypto');

const DEFAULT_TTL_MS = 15 * 60 * 1000;
const MEDIA_ROOT = '/uploads/';

const getSecret = () => process.env.JWT_SECRET || 'onlok-media-signing-secret';

const hmac = (value) =>
    crypto.createHmac('sha256', getSecret()).update(value).digest('hex');

/**
 * Media paths are stored in the database as `/uploads/...` without a query
 * string. Signing produces a short-lived URL that a browser can load directly
 * through an <img>/<video> tag, which a JWT Authorization header cannot do.
 */
const signMediaPath = (mediaPath, ttlMs = DEFAULT_TTL_MS) => {
    if (typeof mediaPath !== 'string' || !mediaPath.startsWith(MEDIA_ROOT)) return mediaPath;
    if (mediaPath.includes('?') || mediaPath.includes('#')) return mediaPath;

    const expiresAt = Date.now() + ttlMs;
    const signature = hmac(`${mediaPath}:${expiresAt}`);
    return `${mediaPath}?sig=${signature}&exp=${expiresAt}`;
};

const safeCompare = (a, b) => {
    const left = Buffer.from(String(a || ''), 'utf8');
    const right = Buffer.from(String(b || ''), 'utf8');
    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
};

/**
 * @returns {boolean} true when the signature is valid and unexpired.
 */
const verifyMediaSignature = (mediaPath, signature, expiresAt) => {
    if (typeof mediaPath !== 'string' || !mediaPath.startsWith(MEDIA_ROOT)) return false;
    if (!signature || !expiresAt) return false;

    const expiresAtNumber = Number(expiresAt);
    if (!Number.isFinite(expiresAtNumber) || expiresAtNumber < Date.now()) return false;

    return safeCompare(signature, hmac(`${mediaPath}:${expiresAtNumber}`));
};

/**
 * Strips an existing signature so a stored path can be re-signed.
 */
const stripMediaSignature = (mediaPath) => {
    if (typeof mediaPath !== 'string') return mediaPath;
    const queryIndex = mediaPath.indexOf('?');
    return queryIndex === -1 ? mediaPath : mediaPath.slice(0, queryIndex);
};

module.exports = {
    MEDIA_ROOT,
    signMediaPath,
    verifyMediaSignature,
    stripMediaSignature
};
