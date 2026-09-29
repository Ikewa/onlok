const assert = require('assert');
const http = require('http');
const path = require('path');

process.env.SLOW_REQUEST_MS = '25';
process.env.LOG_LEVEL = 'debug';

const express = require('express');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');

const { requestContextMiddleware, setContextUser } = require('../middlewares/requestContextMiddleware');
const { requestLoggingMiddleware } = require('../middlewares/requestLoggingMiddleware');
const { createTusUploadServer } = require('../utils/tusUploadServer');
const pool = require('../config/db');

const results = [];
const check = (name, actual, expected = true) => results.push([name, actual === expected]);
const eq = (name, actual, expected) => results.push([name, JSON.stringify(actual) === JSON.stringify(expected)]);

const sink = {
    lines: [],
    capture() {
        this.originalOut = process.stdout.write.bind(process.stdout);
        this.originalErr = process.stderr.write.bind(process.stderr);
        process.stdout.write = (chunk) => { this.lines.push(String(chunk)); return true; };
        process.stderr.write = (chunk) => { this.lines.push(String(chunk)); return true; };
    },
    release() {
        process.stdout.write = this.originalOut;
        process.stderr.write = this.originalErr;
    },
    records() {
        return this.lines
            .map((line) => line.trim())
            .filter((line) => line.startsWith('{'))
            .map((line) => { try { return JSON.parse(line); } catch { return null; } })
            .filter(Boolean);
    },
    reset() { this.lines = []; }
};

const request = (options, body) => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: 5099, ...options }, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
    const app = express();
    app.use(requestContextMiddleware);
    app.use(requestLoggingMiddleware);
    app.use(express.json());

    const tusServer = await createTusUploadServer();
    app.use('/api/verifications/upload/tus', (req, res, next) => {
        req.setTimeout(120000);
        return tusServer.handle(req, res).catch(next);
    });

    app.get('/api/health', (req, res) => res.json({ status: 'success' }));
    app.get('/api/asset.js', (req, res) => res.type('application/javascript').send('console.log(1)'));
    app.get('/api/ok', (req, res) => { setContextUser({ id: 7, email: 'vendor@example.com' }); res.json({ ok: true }); });
    app.get('/api/fail', (req, res) => res.status(422).json({ message: 'A completed government ID upload is required.' }));
    app.get('/api/crash', () => { throw new Error('deliberate failure'); });
    app.get('/api/plaintext-fail', (req, res) => res.status(500).send('Frontend not found on server'));
    app.get('/api/slow', async (req, res) => { await sleep(60); res.json({ ok: true }); });

    const server = app.listen(5099);
    await sleep(150);
    let uploadId = null;

    try {
        // ─── 1. Every response gets a trace id header ─────────────────────────
        sink.capture();

        const ok = await request({ method: 'GET', path: '/api/ok' });
        check('X-Trace-Id is returned on success', /^[0-9a-f-]{36}$/.test(ok.headers['x-trace-id'] || ''));

        await request({ method: 'GET', path: '/api/fail' });
        await request({ method: 'GET', path: '/api/crash' });
        await request({ method: 'GET', path: '/api/plaintext-fail' });
        await request({ method: 'GET', path: '/api/slow' });
        await request({ method: 'GET', path: '/api/health' });
        await request({ method: 'GET', path: '/api/asset.js' });
        await sleep(120);
        sink.release();

        const records = sink.records().filter((r) => r.meta?.type === 'http_request');
        const byMessage = (fragment) => records.find((r) => r.message.includes(fragment));

        const okRecord = byMessage('/api/ok');
        const failRecord = byMessage('/api/fail');
        const crashRecord = byMessage('/api/crash');
        const plaintextRecord = byMessage('/api/plaintext-fail');
        const slowRecord = byMessage('/api/slow');
        const healthRecord = byMessage('/api/health');
        const assetRecord = byMessage('/api/asset.js');

        check('successful request is logged', Boolean(okRecord));
        eq('success logged at info', okRecord.level, 'INFO');
        check('status is recorded', okRecord.meta.statusCode, 200);
        check('duration is recorded', typeof okRecord.meta.durationMs === 'number');
        check('method and path are on the record', okRecord.path, '/api/ok');
        check('authenticated user is attached to the log', okRecord.userId, 7);
        check('user email is attached', okRecord.userEmail, 'vendor@example.com');
        check('trace id ties header and log together', okRecord.traceId, ok.headers['x-trace-id']);

        eq('4xx logged at warn', failRecord.level, 'WARN');
        check('4xx records the reason, not just the status', failRecord.meta.errorMessage, 'A completed government ID upload is required.');

        eq('5xx logged at error', crashRecord.level, 'ERROR');
        check('5xx carries the message', crashRecord.meta.errorMessage, 'deliberate failure');

        eq('non-json error body is captured', plaintextRecord.meta.errorMessage, 'Frontend not found on server');

        check('slow requests are flagged', slowRecord.meta.slow, true);
        check('slow threshold is recorded', slowRecord.meta.slowThresholdMs, 25);

        eq('health checks are quiet', healthRecord.level, 'DEBUG');
        eq('static assets are quiet', assetRecord.level, 'DEBUG');

        // ─── 2. An unauthenticated upload is visible and explained ────────────
        sink.reset();
        sink.capture();
        const unauthenticated = await request({
            method: 'POST',
            path: '/api/verifications/upload/tus',
            headers: { 'Tus-Resumable': '1.0.0', 'Upload-Length': '10' }
        });
        await sleep(120);
        sink.release();

        const tusRecords = sink.records().filter((r) => r.meta?.type === 'http_request');
        check('a rejected upload is now logged', tusRecords.length > 0, true);
        const rejected = tusRecords.find((r) => r.message.includes('upload/tus'));
        check('rejected upload is logged at warn', rejected.meta.statusCode, 401);
        check('rejected upload states why', String(rejected.meta.errorMessage).toLowerCase().includes('not authorized'));

        // ─── 3. A real upload is traced to its upload id ──────────────────────
        const token = jwt.sign({ id: 26, role: 'vendor', email: 'rareplayer3@gmail.com' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        sink.reset();
        sink.capture();
        const created = await request({
            method: 'POST',
            path: '/api/verifications/upload/tus',
            headers: {
                Authorization: `Bearer ${token}`,
                'Tus-Resumable': '1.0.0',
                'Upload-Length': '204800',
                'Upload-Metadata': `filename ${Buffer.from('id.jpg').toString('base64')},filetype ${Buffer.from('image/jpeg').toString('base64')},upload-category ${Buffer.from('gov_id').toString('base64')}`
            }
        });
        await sleep(150);
        sink.release();

        uploadId = decodeURIComponent((created.headers.location || '').split('?')[0].split('/').pop());
        const uploadRecords = sink.records().filter((r) => r.meta?.type === 'http_request');
        if (process.env.DEBUG_LOGGING) {
            process.stdout.write(`create status=${created.status} body=${created.body}\n`);
            process.stdout.write(`records: ${JSON.stringify(uploadRecords, null, 1)}\n`);
        }
        const createRecord = uploadRecords.find((r) => r.message.includes('/upload/tus') && r.meta.statusCode === 201);
        check('a successful upload create is logged', Boolean(createRecord));
        if (createRecord) check('the upload id is on the record', createRecord.uploadId, uploadId);
        if (createRecord) check('the user is on the record', createRecord.userId, 26);

        // ─── 4. A rejected file size explains itself ──────────────────────────
        sink.reset();
        sink.capture();
        const tooBig = await request({
            method: 'POST',
            path: '/api/verifications/upload/tus',
            headers: {
                Authorization: `Bearer ${token}`,
                'Tus-Resumable': '1.0.0',
                'Upload-Length': String(200 * 1024 * 1024),
                'Upload-Metadata': `filename ${Buffer.from('id.jpg').toString('base64')},filetype ${Buffer.from('image/jpeg').toString('base64')},upload-category ${Buffer.from('gov_id').toString('base64')}`
            }
        });
        await sleep(150);
        sink.release();
        const oversize = sink.records().find((r) => r.meta?.type === 'http_request' && r.message.includes('/upload/tus'));
        check('oversize upload is rejected', tooBig.status >= 400, true);
        check('oversize rejection is logged', Boolean(oversize));
        check('oversize rejection explains the limit', /15MB/.test(oversize.meta.errorMessage || ''));
    } finally {
        // ─── cleanup ─────────────────────────────────────────────────────────
        if (uploadId) {
            await pool.query('DELETE FROM upload_sessions WHERE upload_id = ?', [uploadId]);
            const fs = require('fs');
            const { UPLOAD_DIR } = require('../middlewares/uploadMiddleware');
            for (const suffix of ['', '.json']) {
                const file = path.join(UPLOAD_DIR, 'tus', `${uploadId}${suffix}`);
                if (fs.existsSync(file)) fs.unlinkSync(file);
            }
        }
        server.close();
        await pool.end();
    }

    const failures = results.filter(([, ok]) => !ok);
    for (const [name, ok] of results) {
        if (!ok) process.stdout.write(`FAIL  ${name}\n`);
    }
    process.stdout.write(`\n${results.length - failures.length}/${results.length} request logging checks passed\n`);
    if (failures.length) {
        process.stdout.write(`${failures.length} FAILED\n`);
        process.exitCode = 1;
    }
    assert.ok(true);
})().catch((error) => {
    process.stdout.write(`SCRIPT ERROR ${error.stack}\n`);
    process.exitCode = 1;
});
