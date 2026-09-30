const path = require('path');
const fs = require('fs');

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

const UPLOAD_CATEGORIES = {
    gov_id: { kind: 'document', maxSize: 15 * 1024 * 1024 },
    cac_document: { kind: 'document', maxSize: 15 * 1024 * 1024 },
    video: { kind: 'video', maxSize: 100 * 1024 * 1024 }
};

const GENERIC_MIME = 'application/octet-stream';

const normalizeExtension = (originalname) =>
    path.extname(originalname || '').toLowerCase().replace(/[^a-z0-9.]/g, '');

const normalizeMime = (mimetype) =>
    typeof mimetype === 'string' ? mimetype.toLowerCase().split(';')[0].trim() : '';

/**
 * Validates a file by extension and MIME type.
 * Both the extension and the declared MIME type must be on the allowlist
 * (a generic octet-stream MIME is only accepted when the extension is allowed).
 * Anything looser lets an attacker store a `.html` or `.svg` payload under a
 * spoofed `image/jpeg` MIME type and have it served from the app's own origin.
 */
function validateAgainst(originalname, mimetype, { extensions, mimes, label }) {
    const ext = normalizeExtension(originalname);
    const mime = normalizeMime(mimetype);

    if (!extensions.includes(ext)) {
        return { valid: false, error: `Invalid file extension. Allowed formats: ${label}.` };
    }

    if (!mimes.includes(mime) && mime !== GENERIC_MIME) {
        return { valid: false, error: `Invalid file type. Allowed formats: ${label}.` };
    }

    return { valid: true };
}

/**
 * Validates document files (ID card, CAC certificate).
 * @param {string} originalname
 * @param {string} mimetype
 * @returns {{ valid: boolean, error?: string }}
 */
function validateDocument(originalname, mimetype) {
    return validateAgainst(originalname, mimetype, {
        extensions: ALLOWED_DOC_EXTENSIONS,
        mimes: ALLOWED_DOC_MIMES,
        label: 'JPG, PNG, WebP, PDF'
    });
}

/**
 * Validates video files (business environment video).
 * @param {string} originalname
 * @param {string} mimetype
 * @returns {{ valid: boolean, error?: string }}
 */
function validateVideo(originalname, mimetype) {
    return validateAgainst(originalname, mimetype, {
        extensions: ALLOWED_VIDEO_EXTENSIONS,
        mimes: ALLOWED_VIDEO_MIMES,
        label: 'MP4, MOV, MKV, WebM, AVI'
    });
}

function getCategoryConfig(category) {
    return UPLOAD_CATEGORIES[category] || null;
}

/**
 * Returns the extension a file may be stored with, or null when the file is
 * not an accepted upload. Stored names are always derived from this allowlist
 * so user input can never introduce a servable extension such as `.html`.
 */
function resolveSafeExtension(category, originalname) {
    const config = getCategoryConfig(category);
    if (!config) return null;
    const ext = normalizeExtension(originalname);
    const allowed = config.kind === 'video' ? ALLOWED_VIDEO_EXTENSIONS : ALLOWED_DOC_EXTENSIONS;
    return allowed.includes(ext) ? ext : null;
}

// ─── Content sniffing ─────────────────────────────────────────────────────────
// Uploaded bytes are inspected after the transfer completes. A mismatch is only
// reported when the payload is *recognisably* a different family, so unusual
// but legitimate files are never rejected.
const SIGNATURES = [
    { family: 'image', label: 'an image', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
    { family: 'image', label: 'an image', test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
    {
        family: 'image',
        label: 'a WebP image',
        test: (b) => b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP'
    },
    { family: 'image', label: 'a GIF image', test: (b) => b.slice(0, 3).toString('ascii') === 'GIF' },
    { family: 'document', label: 'a PDF document', test: (b) => b.slice(0, 5).toString('ascii') === '%PDF-' },
    { family: 'archive', label: 'a ZIP archive', test: (b) => b[0] === 0x50 && b[1] === 0x4b },
    {
        family: 'archive',
        label: 'a compressed archive',
        test: (b) => b[0] === 0x1f && b[1] === 0x8b
    },
    { family: 'executable', label: 'an executable', test: (b) => b[0] === 0x7f && b[1] === 0x45 && b[2] === 0x4c && b[3] === 0x46 },
    { family: 'executable', label: 'a Windows executable', test: (b) => b[0] === 0x4d && b[1] === 0x5a },
    { family: 'markup', label: 'markup or script content', test: (b) => /^<(!doctype html|html|script|svg|\?xml)/i.test(b.toString('utf8', 0, 32).trim()) },
    { family: 'video', label: 'a video container', test: (b) => b.slice(4, 8).toString('ascii') === 'ftyp' },
    { family: 'video', label: 'a Matroska video', test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
    {
        family: 'video',
        label: 'an AVI video',
        test: (b) => b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'AVI '
    }
];

const ALLOWED_CONTENT_FAMILIES = {
    document: new Set(['image', 'document']),
    video: new Set(['video'])
};

/**
 * Detects the content family of a buffer. Returns null when the content is not
 * recognisable, which is treated as "not enough evidence to reject".
 */
function detectContentFamily(buffer) {
    if (!buffer || buffer.length < 4) return null;
    const match = SIGNATURES.find((signature) => {
        try {
            return signature.test(buffer);
        } catch {
            return false;
        }
    });
    return match ? { family: match.family, label: match.label } : null;
}

/**
 * Verifies that what was actually written to disk matches the declared category.
 * @param {string} category
 * @param {string} filePath
 * @returns {Promise<{ valid: boolean, error?: string }>}
 */
async function assertContentMatchesCategory(category, filePath) {
    const config = getCategoryConfig(category);
    if (!config) return { valid: false, error: 'Unknown upload category.' };

    let handle;
    let buffer;
    try {
        handle = await fs.promises.open(filePath, 'r');
        buffer = Buffer.alloc(64);
        const { bytesRead } = await handle.read(buffer, 0, 64, 0);
        buffer = buffer.subarray(0, bytesRead);
    } catch (error) {
        return { valid: false, error: 'Uploaded file could not be read back for verification.' };
    } finally {
        await handle?.close();
    }

    const detected = detectContentFamily(buffer);
    if (!detected) return { valid: true };

    if (!ALLOWED_CONTENT_FAMILIES[config.kind].has(detected.family)) {
        return {
            valid: false,
            error: `File content does not match the declared format. Received ${detected.label}.`
        };
    }

    return { valid: true };
}

module.exports = {
    ALLOWED_DOC_EXTENSIONS,
    ALLOWED_DOC_MIMES,
    ALLOWED_VIDEO_EXTENSIONS,
    ALLOWED_VIDEO_MIMES,
    UPLOAD_CATEGORIES,
    validateDocument,
    validateVideo,
    getCategoryConfig,
    resolveSafeExtension,
    detectContentFamily,
    assertContentMatchesCategory
};
