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
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Static folder for file uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const userRoutes = require('./routes/userRoute');
const verificationRoutes = require('./routes/verificationRoute');
const dashboardRoutes = require('./routes/dashboardRoute');

app.use('/api/users', userRoutes);
app.use('/api/verifications', verificationRoutes);
app.use('/api/dashboard', dashboardRoutes);

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
