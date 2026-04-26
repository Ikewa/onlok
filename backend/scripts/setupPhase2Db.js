const pool = require('../config/db');

async function setup() {
  try {
    console.log('Adding activity columns to users table...');
    try {
        await pool.query('ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL DEFAULT NULL');
    } catch(e) { if(!e.message.includes('Duplicate column name')) throw e; }
    
    try {
        await pool.query('ALTER TABLE users ADD COLUMN activity_score INT DEFAULT 0');
    } catch(e) { if(!e.message.includes('Duplicate column name')) throw e; }

    console.log('Creating audit_logs table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        action VARCHAR(255) NOT NULL,
        severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    console.log('Creating admin_settings table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('Seeding initial data...');
    // Seed settings
    await pool.query(`
      INSERT IGNORE INTO admin_settings (setting_key, setting_value) VALUES 
      ('auto_approve_tier1', 'false'),
      ('maintenance_mode', 'false'),
      ('risk_threshold_score', '80')
    `);

    // Add some mock audit logs if empty
    const [logs] = await pool.query('SELECT COUNT(*) as c FROM audit_logs');
    if (logs[0].c === 0) {
      // get a random user
      const [users] = await pool.query('SELECT id FROM users LIMIT 3');
      if (users.length > 0) {
         const uid = users[0].id;
         await pool.query(`
           INSERT INTO audit_logs (user_id, action, severity, details) VALUES 
           (?, 'login_failed', 'medium', 'Multiple failed login attempts detected.'),
           (?, 'verification_submitted', 'low', 'User submitted documents for identity verification.'),
           (NULL, 'system_restart', 'high', 'Admin initiated system reboot.')
         `, [uid, uid]);
      }
    }

    // Update some mock activity for existing users
    await pool.query('UPDATE users SET last_login = DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 HOUR), activity_score = 45 WHERE id > 0 LIMIT 2');
    await pool.query('UPDATE users SET last_login = DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 DAY), activity_score = 12 WHERE id > 2 LIMIT 5');

    console.log('Phase 2 DB Setup Complete!');
  } catch (err) {
    console.error('Error setting up DB:', err);
  } finally {
    process.exit(0);
  }
}

setup();
