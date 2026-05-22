console.log("--- BOOT SEQUENCE INITIATED ---");

try {
    const express = require('express');
    const cors = require('cors');
    const helmet = require('helmet');
    const morgan = require('morgan');
    const path = require('path');
    require('dotenv').config();
    
    console.log("1. All NPM Modules loaded successfully");

    const app = express();

    app.use(helmet({ crossOriginResourcePolicy: false }));
    app.use(cors({ origin: '*' })); // Simplified for testing
    app.use(express.json());
    app.use(morgan('dev'));
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
    
    console.log("2. Middlewares configured successfully");

    // Serve Frontend in Production
    const frontendDistPath = path.join(__dirname, '../frontend/dist');
    app.use(express.static(frontendDistPath));
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
    
    console.log("3. React routing configured successfully");

    const port = process.env.PORT || 5000;
    app.listen(port, '0.0.0.0', () => {
        console.log(`✅ REAL SERVER IS RUNNING ON PORT ${port} ✅`);
    });

} catch (error) {
    // THIS IS THE MAGIC PART. IT WILL CATCH THE SILENT CRASH!
    console.error("🚨 FATAL CRASH DETECTED 🚨");
    console.error(error.message);
    console.error(error.stack);
}