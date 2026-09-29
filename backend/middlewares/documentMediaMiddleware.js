const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { verifyMediaSignature } = require('../utils/signedMedia');
const { UPLOAD_DIR } = require('./uploadMiddleware');

// Verification documents and business videos must never be world readable:
// they are served from the same origin as the app. Avatars and report
// attachments keep their existing public behaviour.
const LEGACY_DOCUMENT_PATTERN =
    /^(?:\d+|null)-(?:file|doc|gov_id|cac_document|business_video|video)-\d+\.[a-z0-9]{1,8}$/i;

const decodePath = (rawPath) => {
    try {
        return decodeURIComponent(rawPath);
    } catch {
        return null;
    }
};

/**
 * @returns {'passthrough'|'document'|'deny'}
 */
const classifyRequest = (relativePath) => {
    if (!relativePath || relativePath.includes('..') || relativePath.includes('\0')) return 'deny';

    const segments = relativePath.split('/').filter(Boolean);
    if (segments.length === 0) return 'passthrough';

    if (segments[0] === 'tus') {
        if (segments.length !== 2) return 'deny';
        // The tus sidecar leaks the original filename and internal upload URLs.
        if (segments[1].toLowerCase().endsWith('.json')) return 'deny';
        return 'document';
    }

    if (segments.length === 1 && LEGACY_DOCUMENT_PATTERN.test(segments[0])) return 'document';

    return 'passthrough';
};

const hasValidJwt = (req) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return false;
    try {
        jwt.verify(header.slice(7).trim(), process.env.JWT_SECRET);
        return true;
    } catch {
        return false;
    }
};

// tus stores files without an extension, so express.static cannot infer a
// content type. Read the sidecar to serve the declared type inline instead of
// as an octet-stream download.
const applyTusContentHeaders = (res, uploadId) => {
    try {
        const sidecarPath = path.join(UPLOAD_DIR, 'tus', `${uploadId}.json`);
        const info = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
        const mimeType = info?.metadata?.filetype;

        if (typeof mimeType === 'string' && /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(mimeType)) {
            res.type(mimeType);
        }

        const fileName = String(info?.metadata?.filename || 'document')
            .replace(/[^\w.\- ]+/g, '_')
            .slice(0, 120);
        res.setHeader(
            'Content-Disposition',
            `inline; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
        );
    } catch {
        // Sidecar missing or unreadable: fall back to the default content type.
    }
};

const documentMediaGuard = (req, res, next) => {
    const relativePath = decodePath(req.path);

    if (relativePath === null) {
        return res.status(400).json({ message: 'Malformed media path.' });
    }

    const classification = classifyRequest(`/${relativePath}`.replace(/^\/+/, ''));

    if (classification === 'passthrough') return next();

    if (classification === 'deny') {
        return res.status(403).json({ message: 'This file is not available.' });
    }

    const mediaPath = `/uploads/${relativePath.replace(/^\/+/, '')}`;
    const signature = req.query.sig;
    const expiresAt = req.query.exp;

    if (!verifyMediaSignature(mediaPath, signature, expiresAt) && !hasValidJwt(req)) {
        return res.status(403).json({ message: 'This file is not available.' });
    }

    if (mediaPath.startsWith('/uploads/tus/')) {
        applyTusContentHeaders(res, path.basename(relativePath));
    }

    res.setHeader('Cache-Control', 'private, no-store');
    return next();
};

module.exports = { documentMediaGuard };
