const path = require('path');

const ALLOWED_DOC_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
const ALLOWED_DOC_MIMES = [
    'image/jpeg',
    'image/jpg',
    'image/pjpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/x-pdf'
];

const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.mkv', '.webm', '.avi'];
const ALLOWED_VIDEO_MIMES = [
    'video/mp4',
    'video/quicktime',
    'video/x-matroska',
    'video/webm',
    'video/avi',
    'video/x-msvideo'
];

/**
 * Validates document files (ID card, CAC certificate).
 * @param {string} originalname
 * @param {string} mimetype
 * @returns {{ valid: boolean, error?: string }}
 */
function validateDocument(originalname, mimetype) {
    const ext = path.extname(originalname || '').toLowerCase();
    const isExtAllowed = ALLOWED_DOC_EXTENSIONS.includes(ext);
    const isMimeAllowed = ALLOWED_DOC_MIMES.includes(mimetype?.toLowerCase()) || (mimetype === 'application/octet-stream' && isExtAllowed);

    if (!isExtAllowed && !isMimeAllowed) {
        return {
            valid: false,
            error: 'Invalid document format. Allowed formats: JPG, PNG, WebP, PDF.'
        };
    }
    return { valid: true };
}

/**
 * Validates video files (business environment video).
 * @param {string} originalname
 * @param {string} mimetype
 * @returns {{ valid: boolean, error?: string }}
 */
function validateVideo(originalname, mimetype) {
    const ext = path.extname(originalname || '').toLowerCase();
    const isExtAllowed = ALLOWED_VIDEO_EXTENSIONS.includes(ext);
    const isMimeAllowed = ALLOWED_VIDEO_MIMES.includes(mimetype?.toLowerCase()) || (mimetype === 'application/octet-stream' && isExtAllowed);

    if (!isExtAllowed && !isMimeAllowed) {
        return {
            valid: false,
            error: 'Invalid video format. Allowed formats: MP4, MOV, MKV, WebM, AVI.'
        };
    }
    return { valid: true };
}

module.exports = {
    ALLOWED_DOC_EXTENSIONS,
    ALLOWED_DOC_MIMES,
    ALLOWED_VIDEO_EXTENSIONS,
    ALLOWED_VIDEO_MIMES,
    validateDocument,
    validateVideo
};
