const assert = require('assert');

/**
 * Verifies the logging behaviour that diagnosis depends on:
 *  - every level emits valid JSON with the context columns
 *  - failures record *why*, not just a status
 *  - sensitive values never reach the output
 *  - the logger itself cannot throw or lose a line
 *  - background jobs are attributable
 */

const results = [];
const check = (name, actual, expected = true) => results.push([name, actual === expected]);
const eq = (name, actual, expected) => results.push([name, JSON.stringify(actual) === JSON.stringify(expected)]);

// Capture stdout/stderr so the assertions inspect real output.
const capture = () => {
    const lines = [];
    const originalOut = process.stdout.write.bind(process.stdout);
    const originalErr = process.stderr.write.bind(process.stderr);
    process.stdout.write = (chunk) => { lines.push(String(chunk)); return true; };
    process.stderr.write = (chunk) => { lines.push(String(chunk)); return true; };
    return {
        lines,
        parse: () => lines.map((line) => JSON.parse(line.trim())).filter(Boolean),
        restore: () => { process.stdout.write = originalOut; process.stderr.write = originalErr; }
    };
};

const logger = require('../utils/logger');
const { extractErrorMessage } = require('../middlewares/requestLoggingMiddleware');
const { runWithContext } = require('../middlewares/requestContextMiddleware');

// ─── 1. Log records are structured and complete ───────────────────────────────
{
    const sink = capture();
    logger.info('hello', { type: 'unit', statusCode: 200 });
    logger.error('boom', { type: 'unit' });
    logger.warn('careful');
    sink.restore();

    const records = sink.parse();
    check('three records emitted', records.length, 3);    check('every line is valid JSON', records.every((r) => typeof r.level === 'string'));
    eq('levels are correct', records.map((r) => r.level), ['INFO', 'ERROR', 'WARN']);
    check('message is present', records[0].message, 'hello');
    check('timestamp is ISO', !Number.isNaN(Date.parse(records[0].timestamp)));
    for (const field of ['traceId', 'userId', 'userEmail', 'applicationId', 'uploadId', 'method', 'path']) {
        check(`record carries ${field}`, field in records[0]);
    }
    eq('meta is nested, not flattened', records[0].meta, { type: 'unit', statusCode: 200 });
    check('errors go to stderr', sink.lines[1].includes('"level":"ERROR"'));
}

// ─── Scoped loggers ──────────────────────────────────────────────────────────
{
    const sink = capture();
    const child = logger.child({ job: 'worker-1', region: 'eu-west-1' });
    child.warn('scoped line', { type: 'unit' });
    logger.info('root line');
    sink.restore();

    const records = sink.parse();
    check('child binding is attached', records[0].job, 'worker-1');
    check('extra child binding is attached', records[0].region, 'eu-west-1');
    check('root logger has no job binding', records[1].job, null);
}

// ─── 2. Errors explain themselves ────────────────────────────────────────────
{
    const sink = capture();
    const cause = new Error('socket hang up');
    const err = new Error('Paystack verification failed', { cause });
    err.code = 'ECONNRESET';
    err.status = 502;
    logger.error('Payment failed', { error: err });
    sink.restore();

    const [record] = sink.parse();
    check('error name captured', record.error.name, 'Error');
    check('error message captured', record.error.message, 'Paystack verification failed');
    check('error code captured', record.error.code, 'ECONNRESET');
    check('http status captured', record.error.statusCode, 502);
    check('stack captured', typeof record.error.stack === 'string' && record.error.stack.includes('Error'));
    check('cause chain captured', record.error.cause.message, 'socket hang up');
}

{
    const sink = capture();
    const dbError = Object.assign(new Error("Table 'onlok.verifications' doesn't exist"), {
        code: 'ER_NO_SUCH_TABLE',
        errno: 1146,
        sqlState: '42S02',
        sql: 'SELECT * FROM verifications'
    });
    logger.error('Query failed', { error: dbError });
    sink.restore();
    const [record] = sink.parse();
    check('db error errno captured', record.error.dbError.errno, 1146);
    check('db error sql captured', record.error.dbError.sql, 'SELECT * FROM verifications');
}

{
    const sink = capture();
    const axiosError = Object.assign(new Error('Request failed with status code 422'), {
        isAxiosError: true,
        config: { url: 'https://api.paystack.co/transaction/verify/abc', method: 'post' },
        response: { status: 422, statusText: 'Unprocessable Entity', data: { message: 'Invalid reference' } }
    });
    logger.error('Upstream rejected', { error: axiosError });
    sink.restore();
    const [record] = sink.parse();
    check('upstream status captured', record.error.httpError.status, 422);
    check('upstream url captured', record.error.httpError.url, 'https://api.paystack.co/transaction/verify/abc');
    check('upstream body captured', record.error.httpError.responseData.message, 'Invalid reference');
}

{
    const sink = capture();
    logger.error('Threw a string', { error: 'something odd happened' });
    logger.error('Threw a plain object', { error: { weird: true, code: 'X' } });
    logger.error('Threw a number', { error: 42 });
    sink.restore();
    const records = sink.parse();
    check('string throw captured', records[0].error.message, 'something odd happened');
    check('object throw captured', records[1].error.code, 'X');
    check('number throw captured', records[2].error.message, '42');
}

// ─── 3. Sensitive data never leaks ───────────────────────────────────────────
{
    const sink = capture();
    logger.info('Auth attempt', {
        password: 'hunter2',
        token: 'eyJhbGciOi.JIUzI1NiJ9',
        authorization: 'Bearer abc',
        nested: { apiKey: 'sk_live_x', safe: 'visible' },
        list: [{ card_number: '4111111111111111' }]
    });
    sink.restore();
    const [record] = sink.parse();
    check('password redacted', record.meta.password, '[REDACTED]');
    check('token redacted', record.meta.token, '[REDACTED]');
    check('authorization redacted', record.meta.authorization, '[REDACTED]');
    check('nested api key redacted', record.meta.nested.apiKey, '[REDACTED]');
    check('nested safe value kept', record.meta.nested.safe, 'visible');
    check('list item redacted', record.meta.list[0].card_number, '[REDACTED]');
    check('no secret anywhere in the line', sink.lines[0].includes('hunter2'), false);
}

// ─── 4. The logger cannot fail or lose a line ────────────────────────────────
{
    const sink = capture();
    const hostile = {
        get boom() { throw new Error('getter exploded'); }
    };
    const circular = { name: 'loop' };
    circular.self = circular;

    logger.info('hostile meta', { error: hostile });
    logger.info('circular meta', { payload: circular });
    logger.info('a very long message', 'x'.repeat(5000));
    logger.info('binary-ish meta', { buf: Buffer.alloc(10) });
    logger.info(function () { return 'function message'; });
    sink.restore();

    const records = sink.parse();
    check('all lines survived', records.length, 5);
    check('throwing getter did not break logging', records[0].error.message.includes('[Unreadable: getter exploded]'));
    check('circular structure is marked', JSON.stringify(records[1]).includes('[Circular]'));
    check('long message is truncated', records[2].message.length < 1200);
    check('buffer is summarised', records[3].meta.buf, '[Buffer 10 bytes]');
    check('function message still logged', records[4].message.startsWith('function'));
}

{
    // A meta value that cannot be serialized must still produce a line.
    const sink = capture();
    const nasty = { toJSON() { throw new Error('nope'); } };
    logger.info('bad toJSON', { payload: nasty });
    sink.restore();
    check('a line was still produced', sink.parse().length, 1);
}

// ─── 5. Response body capture turns status codes into reasons ────────────────
{
    eq('json message extracted', extractErrorMessage('{"message":"A completed gov_id upload is required."}'),
        'A completed gov_id upload is required.');
    eq('error field extracted', extractErrorMessage('{"error":"quota exceeded"}'), 'quota exceeded');
    eq('non-json body kept', extractErrorMessage('Frontend not found'), 'Frontend not found');
    eq('empty body handled', extractErrorMessage(''), undefined);
    eq('huge body truncated', extractErrorMessage('y'.repeat(900)).length, 301);
}

// ─── 6. Background jobs are attributable ─────────────────────────────────────
(async () => {
    const sink = capture();
    await logger.runJob('registration-outbox', async (jobLogger) => {
        jobLogger.info('processing 3 events', { type: 'job_step' });
    });
    await logger.runJob('paystack-backfill', async () => {
        throw new Error('Paystack API unreachable');
    }).catch(() => {});
    sink.restore();

    const records = sink.parse();
    const finished = records.find((r) => /Job finished/.test(r.message));
    const failed = records.find((r) => /Job failed/.test(r.message));
    const step = records.find((r) => r.message === 'processing 3 events');

    check('job finish is logged', Boolean(finished));
    check('job name is attached', finished.job, 'registration-outbox');
    check('job has a trace id', typeof finished.traceId === 'string' && finished.traceId.length > 0);
    check('job duration is recorded', typeof finished.meta.durationMs === 'number');
    check('step logs share the job trace id', step.traceId, finished.traceId);
    check('job failure is logged', Boolean(failed));
    check('job failure carries the cause', failed.error.message, 'Paystack API unreachable');
    check('job failure keeps the job name', failed.job, 'paystack-backfill');
    check('two jobs get distinct trace ids', finished.traceId !== failed.traceId);

    // ─── 7. Scoped loggers and ad-hoc contexts ────────────────────────────────
    const sink2 = capture();
    await runWithContext({ userId: 99, job: 'manual' }, async () => {
        logger.info('inside ad-hoc context');
    });
    sink2.restore();
    const scoped = sink2.parse()[0];
    check('ad-hoc context supplies userId', scoped.userId, 99);
    check('ad-hoc context supplies a trace id', typeof scoped.traceId === 'string' && scoped.traceId.length > 0);
})().catch((error) => {
    process.stderr.write(`SCRIPT ERROR ${error.stack}\n`);
    process.exitCode = 1;
}).then(() => {
    // Written synchronously: process.exit() would drop buffered stdout on a pipe.
    const failures = results.filter(([, ok]) => !ok);
    for (const [name, ok] of results) {
        if (!ok) process.stdout.write(`FAIL  ${name}\n`);
    }
    process.stdout.write(`\n${results.length - failures.length}/${results.length} logging checks passed\n`);
    if (failures.length) {
        process.stdout.write(`${failures.length} FAILED\n`);
        process.exitCode = 1;
    }
});
