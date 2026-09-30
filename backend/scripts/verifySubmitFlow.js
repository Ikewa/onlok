const fs = require('fs');
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { UPLOAD_DIR } = require('../middlewares/uploadMiddleware');
const controller = require('../controllers/verificationController');

const BASE = { host: '127.0.0.1', port: 5000 };
const USER_ID = 26;
const token = jwt.sign(
    { id: USER_ID, role: 'vendor', vendor_id: null, email: 'rareplayer3@gmail.com' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
);

const request = (options, body) => new Promise((resolve, reject) => {
    const req = http.request({ ...BASE, ...options }, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
});

const meta = (obj) => Object.entries(obj)
    .map(([k, v]) => `${k} ${Buffer.from(String(v)).toString('base64')}`)
    .join(',');

/** Performs a complete tus upload over HTTP and returns the upload id. */
const tusUpload = async (category, filename, filetype, body) => {
    const created = await request({
        method: 'POST',
        path: '/api/verifications/upload/tus',
        headers: {
            Authorization: `Bearer ${token}`,
            'Tus-Resumable': '1.0.0',
            'Upload-Length': String(body.length),
            'Upload-Metadata': meta({ filename, filetype, 'upload-category': category }),
        },
    }, null);
    if (created.status !== 201) throw new Error(`create failed: ${created.status} ${created.body}`);

    const uploadId = decodeURIComponent(created.headers.location.split('?')[0].split('/').pop());
    const half = Math.floor(body.length / 2);
    for (const [offset, chunk] of [[0, body.subarray(0, half)], [half, body.subarray(half)]]) {
        const patched = await request({
            method: 'PATCH',
            path: `/api/verifications/upload/tus/${uploadId}`,
            headers: {
                Authorization: `Bearer ${token}`,
                'Tus-Resumable': '1.0.0',
                'Content-Type': 'application/offset+octet-stream',
                'Upload-Offset': String(offset),
                'Content-Length': String(chunk.length),
            },
        }, chunk);
        if (patched.status !== 204) throw new Error(`patch failed: ${patched.status} ${patched.body}`);
    }
    return uploadId;
};

const jpeg = (size) => {
    const buf = Buffer.alloc(size, 0x20);
    buf[0] = 0xff; buf[1] = 0xd8; buf[2] = 0xff; buf[3] = 0xe0;
    buf[size - 2] = 0xff; buf[size - 1] = 0xd9;
    return buf;
};

const mp4 = (size) => {
    const buf = Buffer.alloc(size, 0x00);
    buf.write('ftypisom', 4, 'ascii');
    return buf;
};

const call = async (handler, body) => {
    let code = null;
    let payload = null;
    const res = {
        status(c) { code = c; return res; },
        json(p) { payload = p; return res; },
    };
    await handler({ user: { id: USER_ID }, body, headers: { 'idempotency-key': `probe-${Date.now()}-${Math.random()}` } }, res);
    return { code, payload };
};

const results = [];
const expect = (name, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    results.push([name, ok]);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (got ${JSON.stringify(actual)})`}`);
};

(async () => {
    const [[userRow], [beforeCount], [appRow]] = await Promise.all([
        pool.query('SELECT status FROM users WHERE id = ?', [USER_ID]),
        pool.query('SELECT COUNT(*) AS n FROM verifications WHERE user_id = ?', [USER_ID]),
        pool.query('SELECT application_id, status FROM registration_applications WHERE user_id = ?', [USER_ID]),
    ]);
    const snapshot = {
        userStatus: userRow[0]?.status,
        verifications: Number(beforeCount[0].n),
        applicationStatus: appRow[0]?.status,
        applicationId: appRow[0]?.application_id,
    };
    console.log('snapshot:', snapshot, '\n');

    const application = await call(controller.createRegistrationApplication, {});
    const applicationId = application.payload.application_id;
    console.log('application_id:', applicationId, '\n');

    const govIdId = await tusUpload('gov_id', 'id.jpg', 'image/jpeg', jpeg(200 * 1024));
    const videoId = await tusUpload('video', 'business.mp4', 'video/mp4', mp4(400 * 1024));
    const probeIds = [govIdId, videoId];
    console.log('uploaded:', probeIds.join(', '), '\n');

    const [rows] = await pool.query('SELECT upload_id, user_id, application_id, category, status FROM upload_sessions WHERE upload_id IN (?)', [probeIds]);
    console.log('upload_sessions:', rows, '\n');

    const submit = await call(controller.submitVerification, {
        application_id: applicationId,
        gov_id_upload_id: govIdId,
        video_upload_id: videoId,
    });
    expect('submit with upload ids succeeds', [submit.code, submit.payload.verification_id > 0], [200, true]);

    const [[record]] = await pool.query('SELECT gov_id_url, video_url, status, gov_id_status, video_status FROM verifications WHERE user_id = ?', [USER_ID]);
    console.log('\nverification record:', record);
    expect('gov id url stored from upload', record.gov_id_url, `/uploads/tus/${govIdId}`);
    expect('video url stored from upload', record.video_url, `/uploads/tus/${videoId}`);
    expect('record queued for review', record.status, 'pending');

    const resubmit = await call(controller.resubmitDocuments, { video_upload_id: videoId });
    expect('resubmit single document succeeds', resubmit.code, 200);

    const noVideo = await call(controller.submitVerification, {
        application_id: applicationId,
        gov_id_upload_id: govIdId,
    });
    expect('partial submit keeps existing video', noVideo.code, 200);

    const forgedId = await call(controller.submitVerification, {
        application_id: applicationId,
        gov_id_upload_id: 'deadbeefdeadbeefdeadbeefdeadbeef',
        video_upload_id: videoId,
    });
    expect('upload id owned by nobody is rejected', forgedId.code, 422);

    const swapped = await call(controller.submitVerification, {
        application_id: applicationId,
        gov_id_upload_id: videoId,
        video_upload_id: govIdId,
    });
    expect('wrong category for the field is rejected', swapped.code, 422);

    const forgedUrl = await call(controller.resubmitDocuments, { gov_id_url: 'https://evil.example.com/x.jpg' });
    expect('arbitrary URL on resubmit is rejected', forgedUrl.code, 422);

    const forgedLegacy = await call(controller.resubmitDocuments, { video_url: '/uploads/19-gov_id-123.jpg' });
    expect('foreign legacy path on resubmit is rejected', forgedLegacy.code, 422);

    const me = await call(controller.getMyVerification, {});
    expect('record is returned to its owner', me.code, 200);
    expect('media urls are signed', String(me.payload.gov_id_url).includes('sig='), true);
    expect('mime type is exposed', me.payload.gov_id_mime, 'image/jpeg');

    console.log('\n--- restoring state ---');
    await pool.query('DELETE FROM registration_outbox WHERE aggregate_id = ? AND JSON_EXTRACT(payload, "$.userId") = ?', [applicationId, USER_ID]);
    await pool.query('DELETE FROM registration_idempotency WHERE user_id = ? AND application_id = ?', [USER_ID, applicationId]);
    await pool.query('DELETE FROM verifications WHERE user_id = ?', [USER_ID]);
    await pool.query('DELETE FROM upload_sessions WHERE upload_id IN (?)', [probeIds]);
    await pool.query('UPDATE users SET status = ? WHERE id = ?', [snapshot.userStatus, USER_ID]);
    await pool.query('UPDATE registration_applications SET status = ? WHERE user_id = ?', [snapshot.applicationStatus, USER_ID]);
    for (const id of probeIds) {
        for (const suffix of ['', '.json']) {
            const file = path.join(UPLOAD_DIR, 'tus', `${id}${suffix}`);
            if (fs.existsSync(file)) fs.unlinkSync(file);
        }
    }

    const [[afterUser], [afterVerifications], [afterUploads], [afterApp]] = await Promise.all([
        pool.query('SELECT status FROM users WHERE id = ?', [USER_ID]),
        pool.query('SELECT COUNT(*) AS n FROM verifications WHERE user_id = ?', [USER_ID]),
        pool.query('SELECT COUNT(*) AS n FROM upload_sessions WHERE upload_id IN (?)', [probeIds]),
        pool.query('SELECT status FROM registration_applications WHERE user_id = ?', [USER_ID]),
    ]);
    expect('user status restored', afterUser[0].status, snapshot.userStatus);
    expect('verification rows restored', Number(afterVerifications[0].n), snapshot.verifications);
    expect('probe uploads removed', Number(afterUploads[0].n), 0);
    expect('application status restored', afterApp[0].status, snapshot.applicationStatus);

    const failures = results.filter(([, ok]) => !ok);
    console.log(failures.length ? `\n${failures.length} FAILURE(S)` : `\nAll ${results.length} checks passed`);
    await pool.end();
    process.exit(failures.length ? 1 : 0);
})().catch((error) => {
    console.error('SCRIPT ERROR', error);
    process.exit(1);
});
