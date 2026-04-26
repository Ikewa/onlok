const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Default values for missing env vars
const PORT = process.env.PORT || 5000;

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (Postman, curl, mobile apps)
        if (!origin) return callback(null, true);
        // In development, allow any localhost port
        if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
        // In production, match the configured origin
        const allowed = process.env.CORS_ORIGIN || 'http://localhost:5173';
        if (origin === allowed) return callback(null, true);
        callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// Static folder for file uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Start the server
const startServer = () => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};

startServer();
