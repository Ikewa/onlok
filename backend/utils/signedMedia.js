const crypto = require('crypto');

const DEFAULT_TTL_MS = 15 * 60 * 1000;
const MEDIA_ROOT = '/uploads/';
// Only plain, traversal-free paths below /uploads/ may ever be signed.
const SIGNABLE_MEDIA_PATH = /^\/uploads\/(?!.*\.\.)[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;

const getSecret = () => process.env.JWT_SECRET || 'onlok-media-signing-secret';

const hmac = (value) =>
    crypto.createHmac('sha256', getSecret()).update(value).digest('hex');

const isSignable = (mediaPath) =>
    typeof mediaPath === 'string' &&
    SIGNABLE_MEDIA_PATH.test(mediaPath) &&
    !mediaPath.includes('?') &&
    !mediaPath.includes('#');

/**
 * Media paths are stored in the database as `/uploads/...` without a query
 * string. Signing produces a short-lived URL that a browser can load directly
 * through an <img>/<video> tag, which a JWT Authorization header cannot do.
 */
const signMediaPath = (mediaPath, ttlMs = DEFAULT_TTL_MS) => {
    if (!isSignable(mediaPath)) return mediaPath;

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
    if (!isSignable(mediaPath)) return false;
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
