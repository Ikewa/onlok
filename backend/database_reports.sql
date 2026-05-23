-- Reports Table Migration
-- Run this against your onlok_db database

USE onlok_db;

CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id INT NULL,                -- NULL = anonymous report
    reported_vendor_id VARCHAR(20) NOT NULL,
    category ENUM('fraud', 'impersonation', 'harassment', 'inaccurate_information') NOT NULL,
    context TEXT NOT NULL,
    status ENUM('pending', 'reviewed', 'dismissed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL
);
