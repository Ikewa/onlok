const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
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
        callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// 🛑 ROUTES COMMENTED OUT FOR TESTING 🛑
// ==========================================
// const userRoutes = require('./routes/userRoute');
// const verificationRoutes = require('./routes/verificationRoute');
// const dashboardRoutes = require('./routes/dashboardRoute');
// const reportRoutes = require('./routes/reportRoute');
// const adminRoutes = require('./routes/adminRoute');

// app.use('/api/users', userRoutes);
// app.use('/api/verifications', verificationRoutes);
// app.use('/api/dashboard', dashboardRoutes);
// app.use('/api/reports', reportRoutes);
// app.use('/api/admin', adminRoutes);

// Test Route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Onlok API is running smoothly' });
});

// Serve Frontend in Production
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Start the server
const port = process.env.PORT || 5000;
const startServer = () => {
    app.listen(port, '0.0.0.0', () => {
        console.log(`✅ REAL SERVER IS RUNNING ON PORT ${port} ✅`);
    });
};
startServer();