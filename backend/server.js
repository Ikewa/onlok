const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();

// Middlewares
app.use(helmet({
    crossOriginResourcePolicy: false,
}));
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

// Serve Frontend in Production (Express Wrapper Strategy)
const frontendDistPath = path.join(__dirname, '../frontend/dist');

// We use express.static to serve the built React app
app.use(express.static(frontendDistPath));

// Catch-all route to serve index.html for client-side routing (React Router)
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Start the server
// Use the dynamically injected PORT from Hostinger, fallback to 5000 locally
const port = process.env.PORT || 5000;
const startServer = () => {
    // Adding '0.0.0.0' binds it to all available network interfaces
    app.listen(port, '0.0.0.0', () => {
        console.log(`Server is running on port ${port}`);
        console.log(`Serving frontend from: ${frontendDistPath}`);
    });
};

startServer();