const assert = require('assert');

// Load every module touched by the upload fixes to catch broken require graphs
// and bad exports. None of these start a server or run migrations.
const verificationController = require('../controllers/verificationController');
const tusUploadServer = require('../utils/tusUploadServer');
const verificationRoute = require('../routes/verificationRoute');
const adminController = require('../controllers/adminController');
const uploadMiddleware = require('../middlewares/uploadMiddleware');

const checks = [];
const check = (name, actual, expected = true) => checks.push([name, actual === expected]);

check(
    'controller exposes the unified upload API',
    ['createRegistrationApplication', 'submitVerification', 'getMyVerification', 'resubmitDocuments']
        .every((name) => typeof verificationController[name] === 'function')
);
check(
    'legacy chunk endpoints are gone',
    ['uploadSingleDocument', 'initChunkUpload', 'uploadChunk', 'completeChunkUpload']
        .some((name) => name in verificationController),
    false
);
check('verification route is an express router', typeof verificationRoute === 'function');
check('verification route exposes 4 routes', verificationRoute.stack.filter((layer) => layer.route).length, 4);
check('tus server factory is a function', typeof tusUploadServer.createTusUploadServer, 'function');
check('max upload size exported', tusUploadServer.MAX_UPLOAD_SIZE, 100 * 1024 * 1024);
check('admin controller still loads', typeof adminController.getVerificationDetails, 'function');
check('multer chunk storage removed', 'uploadChunkMulter' in uploadMiddleware, false);
check('multer single-doc storage removed', 'uploadSingleDoc' in uploadMiddleware, false);
check('avatar upload retained', Boolean(uploadMiddleware.uploadAvatar?.single), true);
check('tus directory is ensured at startup', uploadMiddleware.UPLOAD_DIR.length > 0);

// Regression guard: the request key names are part of the public API contract
// and must not be derived from the category name (that produced `gov_idUploadId`
// instead of `gov_id_upload_id`, which silently rejected every submission).
const EXPECTED_FIELD_KEYS = {
    gov_id: { uploadIdKey: 'gov_id_upload_id', urlKey: 'gov_id_url' },
    cac_document: { uploadIdKey: 'cac_upload_id', urlKey: 'cac_url' },
    video: { uploadIdKey: 'video_upload_id', urlKey: 'video_url' },
};

check(
    'all three document fields are declared',
    verificationController.DOCUMENT_FIELDS.length,
    Object.keys(EXPECTED_FIELD_KEYS).length
);
for (const { field, uploadIdKey, urlKey } of verificationController.DOCUMENT_FIELDS) {
    const expected = EXPECTED_FIELD_KEYS[field];
    check(`${field} upload id key`, uploadIdKey, expected?.uploadIdKey);
    check(`${field} url key`, urlKey, expected?.urlKey);
    check(`${field} key is snake_case`, /^[a-z0-9]+(_[a-z0-9]+)*$/.test(uploadIdKey) && /^[a-z0-9]+(_[a-z0-9]+)*$/.test(urlKey));
    check(`${field} category matches the field name`, field === verificationController.DOCUMENT_FIELDS.find((f) => f.field === field).category);
}

const failures = checks.filter(([, ok]) => !ok);
checks.forEach(([name, ok]) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`));
console.log(failures.length ? `\n${failures.length} FAILURE(S)` : `\nAll ${checks.length} checks passed`);
assert.strictEqual(failures.length, 0);
process.exit(0);
