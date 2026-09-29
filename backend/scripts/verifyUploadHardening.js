const assert = require('assert');
const { validateDocument, validateVideo, resolveSafeExtension, detectContentFamily, getCategoryConfig } = require('../utils/fileValidator');
const { signMediaPath, verifyMediaSignature, stripMediaSignature } = require('../utils/signedMedia');
const { documentMediaGuard } = require('../middlewares/documentMediaMiddleware');

const checks = [];
const check = (name, actual, expected = true) => checks.push([name, actual === expected]);

check('jpeg accepted', validateDocument('id.jpg', 'image/jpeg').valid);
check('generic mime with allowed ext accepted', validateDocument('id.png', 'application/octet-stream').valid);
check('html extension with image mime REJECTED', validateDocument('evil.html', 'image/jpeg').valid, false);
check('pdf accepted', validateDocument('c.pdf', 'application/pdf').valid);
check('extensionless rejected', validateDocument('id', 'image/jpeg').valid, false);
check('svg rejected', validateDocument('id.svg', 'image/svg+xml').valid, false);
check('doc with video mime REJECTED', validateDocument('id.jpg', 'video/mp4').valid, false);
check('mp4 accepted', validateVideo('v.mp4', 'video/mp4').valid);
check('html not a storable video ext', resolveSafeExtension('video', 'v.html'), null);
check('doc category capped at 15MB', getCategoryConfig('gov_id').maxSize, 15 * 1024 * 1024);
check('video category capped at 100MB', getCategoryConfig('video').maxSize, 100 * 1024 * 1024);
check('unknown category rejected', getCategoryConfig('bogus'), null);

check('jpeg content detected', detectContentFamily(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])).family, 'image');
check('pdf content detected', detectContentFamily(Buffer.from('%PDF-1.7')).family, 'document');
check('html content detected', detectContentFamily(Buffer.from('<!DOCTYPE html><html>')).family, 'markup');
check('elf content detected', detectContentFamily(Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0, 0])).family, 'executable');
check('zip content detected', detectContentFamily(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0])).family, 'archive');
check('mp4 content detected', detectContentFamily(Buffer.from([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70])).family, 'video');
check('unknown content is not rejected', detectContentFamily(Buffer.from([1, 2, 3, 4, 5])), null);

const signed = signMediaPath('/uploads/tus/abc123');
const [signedPath, signedQuery] = signed.split('?');
const sig = new URLSearchParams(signedQuery).get('sig');
const exp = new URLSearchParams(signedQuery).get('exp');

check('valid signature accepted', verifyMediaSignature(signedPath, sig, exp));
check('signature bound to path', verifyMediaSignature('/uploads/tus/other', sig, exp), false);
check('tampered signature rejected', verifyMediaSignature(signedPath, `${sig.slice(0, -2)}00`, exp), false);
check('missing signature rejected', verifyMediaSignature(signedPath, null, exp), false);
check('expired signature rejected', verifyMediaSignature(signedPath, sig, String(Date.now() - 1000)), false);
check('traversal path is never signed', signMediaPath('/uploads/../etc/passwd'), '/uploads/../etc/passwd');
check('signature stripped from stored path', stripMediaSignature('/uploads/tus/a?sig=x&exp=1'), '/uploads/tus/a');

const guard = (path, query = {}) => {
    const out = { code: 200, nextCalled: false, headers: {} };
    const res = {
        status(code) { out.code = code; return res; },
        json() { return res; },
        setHeader(key, value) { out.headers[key] = value; },
        type(value) { out.headers['Content-Type'] = value; },
    };
    documentMediaGuard({ path, query, headers: {} }, res, () => { out.nextCalled = true; });
    return out;
};

check('tus sidecar is blocked', guard('/tus/abc123.json').code, 403);
check('tus file without signature is blocked', guard('/tus/abc123').code, 403);
check('blocked request does not continue', guard('/tus/abc123').nextCalled, false);
check('tus file with valid signature passes', guard('/tus/abc123', { sig, exp }).nextCalled);
check('signed tus file gets its content type', guard('/tus/abc123', { sig, exp }).headers['Content-Type'], 'application/pdf');
check('signed tus file is served inline', String(guard('/tus/abc123', { sig, exp }).headers['Content-Disposition'] || '').startsWith('inline;'));
check('avatars stay public', guard('/avatars/a-1.jpg').nextCalled);
check('reports stay public', guard('/reports/x.png').nextCalled);
check('path traversal blocked', guard('/tus/../../etc/passwd').code, 403);
check('legacy gov id file is protected', guard('/19-gov_id-123.jpg').code, 403);
check('signature does not transfer to another file', guard('/19-gov_id-123.jpg', { sig, exp }).code, 403);

const failures = checks.filter(([, ok]) => !ok);
checks.forEach(([name, ok]) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`));
console.log(failures.length ? `\n${failures.length} FAILURE(S)` : `\nAll ${checks.length} checks passed`);
process.exit(failures.length ? 1 : 0);
