const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setup() {
    try {
        console.log("Connecting to MySQL to create database...");
        
        // Connect without database selected
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: true
        });

        // Read the SQL script
        const sqlScript = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf-8');

        // Execute the script
        console.log("Executing database.sql script...");
        await connection.query(sqlScript);

        console.log("Database and tables created successfully!");
        await connection.end();
        process.exit(0);

    } catch (err) {
        console.error("Setup failed:", err);
        process.exit(1);
    }
}

setup();
