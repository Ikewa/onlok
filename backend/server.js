const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const pool = require('./config/db');
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

app.use('/api/users', userRoutes);
app.use('/api/verifications', verificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// Test Route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Onlok API is running smoothly' });
});

// Serve Frontend in Production (Express Wrapper Strategy)
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// ==========================================
// THE FIX: Using native RegExp /.*/ instead of '*' string
// ==========================================
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Auto-seed Admin Account on Startup (Ensures Live DB gets the admin)
(async () => {
    try {
        const hash = await bcrypt.hash('admin123', 10);
        const [existing] = await pool.query('SELECT id FROM users WHERE email = "admin@onlok.com"');
        if (existing.length === 0) {
            await pool.query(
                "INSERT INTO users (vendor_id, first_name, last_name, business_name, email, password_hash, phone_number, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'admin', 'verified')",
                ['ONL-ADMIN-01', 'Admin', 'User', 'Onlok', 'admin@onlok.com', hash, '0000000000']
            );
            console.log('✅ Auto-seeded admin@onlok.com into DB.');
        } else {
            await pool.query('UPDATE users SET password_hash = ?, role = "admin" WHERE email = "admin@onlok.com"', [hash]);
            console.log('✅ Auto-reset admin@onlok.com password in DB.');
        }
    } catch (err) {
        console.error('Failed to auto-seed admin:', err.message);
    }
})();

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
    console.log(`✅ ONLOK PRODUCTION SERVER IS LIVE ON PORT ${port} ✅`);
});