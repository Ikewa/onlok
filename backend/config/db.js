const mysql = require('mysql2/promise');
require('dotenv').config();
const logger = require('../utils/logger');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test the connection
pool.getConnection()
    .then(connection => {
        logger.info('Connected to MySQL', { type: 'database', database: process.env.DB_NAME });
        connection.release();
    })
    .catch(err => {
        logger.error('Failed to connect to MySQL', {
            error: err,
            type: 'database',
            database: process.env.DB_NAME,
            host: process.env.DB_HOST,
            hint: 'Every database-backed request will fail until this is resolved.'
        });
    });

module.exports = pool;
