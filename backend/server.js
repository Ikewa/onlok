const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const pool = require('./config/db');
const runMigrations = require('./config/autoMigrate');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const logger = require('./utils/logger');
require('dotenv').config();

const { requestContextMiddleware } = require('./middlewares/requestContextMiddleware');

const app = express();

// Trace ID & Request Context Tracing
app.use(requestContextMiddleware);

// Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
        const allowed = process.env.CORS_ORIGIN || 'http://localhost:5173';
        if (origin === allowed) return callback(null, true);
        
        // Whitelist Hostinger preview domains and actual live domain
        if (origin.includes('hostingersite.com') || origin.includes('onlok.net')) return callback(null, true);
        
        callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
}));
// Capture raw body for Paystack webhook HMAC verification.
// express.json()'s verify callback runs before the body is parsed,
// giving us the original bytes that Paystack signed.
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

// Structured HTTP Request Logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
        logger[level](`HTTP ${req.method} ${req.originalUrl || req.url} ${res.statusCode} (${duration}ms)`, {
            type: 'http_request',
            statusCode: res.statusCode,
            durationMs: duration
        });
    });
    next();
});


// Website hit tracking middleware
app.use(async (req, res, next) => {
    if (req.method === 'GET' && req.headers.accept && req.headers.accept.includes('text/html')) {
        try {
            await pool.query('INSERT INTO daily_site_hits (date) VALUES (CURRENT_DATE) ON DUPLICATE KEY UPDATE hits = hits + 1');
        } catch (e) {
            console.error('Hit tracking error:', e);
        }
    }
    next();
});

// Static folder for file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

// Routes
const userRoutes = require('./routes/userRoute');
const verificationRoutes = require('./routes/verificationRoute');
const dashboardRoutes = require('./routes/dashboardRoute');
const reportRoutes = require('./routes/reportRoute');
const adminRoutes = require('./routes/adminRoute');
const withdrawalRoutes = require('./routes/withdrawalRoute');
const premblyRoutes = require('./routes/premblyRoute');
const paymentRoutes = require('./routes/paymentRoute');
const identityRoutes = require('./routes/identityRoute');
const subscriptionRoutes = require('./routes/subscriptionRoute');

app.use('/api/users', userRoutes);
app.use('/api/verifications', verificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/admin/prembly', premblyRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/identities', identityRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Test Route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Onlok API is running smoothly' });
});

// Serve Frontend in Production (Express Wrapper Strategy)
const frontendDistPath = path.join(__dirname, 'client-dist');
const landingDistPath = path.join(__dirname, 'landing-dist');

const serveApp = express.static(frontendDistPath);
const serveLanding = express.static(landingDistPath);

app.use((req, res, next) => {
    // Route app.* to the React web app, otherwise default to the landing page
    if (req.hostname.startsWith('app.') || req.hostname === 'localhost') {
        serveApp(req, res, next);
    } else {
        serveLanding(req, res, next);
    }
});

// ==========================================
// THE FIX: Using native RegExp /.*/ instead of '*' string
// ==========================================
app.get(/.*/, (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    if (req.hostname.startsWith('app.') || req.hostname === 'localhost') {
        res.sendFile('index.html', { root: frontendDistPath }, (err) => {
            if (err) {
                console.error('Error sending app index.html:', err);
                res.status(500).send('Frontend not found on server. Did you build client-dist?');
            }
        });
    } else {
        res.sendFile('index.html', { root: landingDistPath }, (err) => {
            if (err) {
                console.error('Error sending landing index.html:', err);
                res.status(500).send('Landing page not found on server. Did you build landing-dist?');
            }
        });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    const statusCode = err.status || err.statusCode || 500;
    logger.error(`Unhandled Express Error: ${err.message}`, {
        error: err,
        statusCode,
        query: req.query,
        params: req.params,
        body: req.body
    });
    
    res.status(statusCode).json({
        status: 'error',
        message: err.message || 'Internal Server Error',
        traceId: req.id
    });
});

// Process-level Error Safety
process.on('uncaughtException', (err) => {
    logger.error(`CRITICAL: Uncaught Exception: ${err.message}`, { error: err });
});

process.on('unhandledRejection', (reason) => {
    logger.error(`CRITICAL: Unhandled Promise Rejection`, { error: reason });
});

// Auto-migrate: create tables, add missing columns, seed admin
runMigrations();

// Start cron jobs
const { startCronJobs } = require('./utils/cronJobs');
startCronJobs();

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
    logger.info(`ONLOK PRODUCTION SERVER IS LIVE ON PORT ${port}`);
});