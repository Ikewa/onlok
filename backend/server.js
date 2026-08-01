const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const pool = require('./config/db');
const runMigrations = require('./config/autoMigrate');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();

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
app.use(express.json());
app.use(morgan('dev'));

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
app.use(express.static(frontendDistPath));

// ==========================================
// THE FIX: Using native RegExp /.*/ instead of '*' string
// ==========================================
app.get(/.*/, (req, res) => {
    res.sendFile('index.html', { root: frontendDistPath }, (err) => {
        if (err) {
            console.error('Error sending index.html:', err);
            res.status(500).send('Frontend not found on server.');
        }
    });
});

// Auto-migrate: create tables, add missing columns, seed admin
runMigrations();

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
    console.log(`✅ ONLOK PRODUCTION SERVER IS LIVE ON PORT ${port} ✅`);
});