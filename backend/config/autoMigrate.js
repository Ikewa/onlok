/**
 * autoMigrate.js
 * ──────────────────────────────────────────────────────────────────
 * Runs automatically on every server startup.
 * - Creates all tables (IF NOT EXISTS) — safe on a brand-new DB
 * - Adds any new columns (ALTER TABLE) — safe on an existing DB
 * - Seeds the default admin account
 *
 * HOW TO ADD A NEW TABLE OR COLUMN:
 *   - New table  → add a CREATE TABLE block in createTables()
 *   - New column → add an entry to the COLUMN_MIGRATIONS array
 * ──────────────────────────────────────────────────────────────────
 */

const pool = require('./db');
const bcrypt = require('bcrypt');

// ─────────────────────────────────────────────────────────────────
// 1.  CREATE TABLES (safe: all use IF NOT EXISTS)
// ─────────────────────────────────────────────────────────────────
async function createTables() {
    // Users
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            vendor_id       VARCHAR(20) UNIQUE NULL,
            first_name      TEXT NOT NULL,
            last_name       TEXT NOT NULL,
            business_name   VARCHAR(255) NOT NULL,
            email           VARCHAR(255) UNIQUE NOT NULL,
            password_hash   VARCHAR(255) NOT NULL,
            phone_number    VARCHAR(20) NOT NULL,
            role            ENUM('vendor','admin') DEFAULT 'vendor',
            status          ENUM('pending','verified','rejected','suspended') DEFAULT 'pending',
            twitter_handle  VARCHAR(255) NULL,
            instagram_handle VARCHAR(255) NULL,
            facebook_handle VARCHAR(255) NULL,
            tiktok_handle   VARCHAR(255) NULL,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    // Verifications
    await pool.query(`
        CREATE TABLE IF NOT EXISTS verifications (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            user_id       INT NOT NULL,
            gov_id_url    VARCHAR(255) NOT NULL,
            video_url     VARCHAR(255) NOT NULL,
            status        ENUM('pending','approved','rejected','flagged') DEFAULT 'pending',
            admin_notes   TEXT NULL,
            submitted_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reviewed_at   TIMESTAMP NULL,
            reviewed_by   INT NULL,
            FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    // Badges
    await pool.query(`
        CREATE TABLE IF NOT EXISTS badges (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            user_id    INT NOT NULL,
            badge_type ENUM('basic','verified_vendor','premium') DEFAULT 'basic',
            issued_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Vendor Profiles
    await pool.query(`
        CREATE TABLE IF NOT EXISTS vendor_profiles (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            user_id      INT UNIQUE NOT NULL,
            profile_link VARCHAR(255) UNIQUE NOT NULL,
            qr_code_url  TEXT,
            views        INT DEFAULT 0,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Reports
    await pool.query(`
        CREATE TABLE IF NOT EXISTS reports (
            id                  INT AUTO_INCREMENT PRIMARY KEY,
            reporter_id         INT NULL,
            reported_vendor_id  VARCHAR(20) NOT NULL,
            category            ENUM('fraud','impersonation','harassment','inaccurate_information') NOT NULL,
            context             TEXT NOT NULL,
            status              ENUM('pending','reviewed','dismissed') DEFAULT 'pending',
            created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    // Admin Settings
    await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_settings (
            setting_key   VARCHAR(50) PRIMARY KEY,
            setting_value TEXT NOT NULL
        )
    `);

    // Audit Logs
    await pool.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            user_id    INT NULL,
            action     VARCHAR(255) NOT NULL,
            severity   ENUM('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'LOW',
            details    TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    console.log('✅ [AutoMigrate] All tables verified / created.');
}

// ─────────────────────────────────────────────────────────────────
// 2.  COLUMN MIGRATIONS
//     Add an entry here whenever you add a new column to any table.
//     Each entry: { table, column, definition }
// ─────────────────────────────────────────────────────────────────
const COLUMN_MIGRATIONS = [
    // Social handles (added after initial launch)
    { table: 'users', column: 'twitter_handle',   definition: 'VARCHAR(255) NULL AFTER status' },
    { table: 'users', column: 'instagram_handle', definition: 'VARCHAR(255) NULL AFTER twitter_handle' },
    { table: 'users', column: 'facebook_handle',  definition: 'VARCHAR(255) NULL AFTER instagram_handle' },
    { table: 'users', column: 'tiktok_handle',    definition: 'VARCHAR(255) NULL AFTER facebook_handle' },

    // Verifications enhancements
    { table: 'verifications', column: 'admin_notes', definition: 'TEXT NULL AFTER status' },
    { table: 'verifications', column: 'flagged',     definition: "ENUM('pending','approved','rejected','flagged') NULL AFTER admin_notes" },

    // ── ADD NEW COLUMNS BELOW THIS LINE ──────────────────────────
    // Example:
    // { table: 'users', column: 'bio', definition: 'TEXT NULL AFTER tiktok_handle' },
];

async function addMissingColumns() {
    for (const { table, column, definition } of COLUMN_MIGRATIONS) {
        try {
            await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
            console.log(`✅ [AutoMigrate] Added column: ${table}.${column}`);
        } catch (err) {
            // ER_DUP_FIELDNAME = column already exists → skip silently
            if (err.code !== 'ER_DUP_FIELDNAME') {
                console.warn(`⚠️  [AutoMigrate] ${table}.${column}: ${err.message}`);
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────
// 3.  SEED DEFAULT ADMIN (runs every startup, resets password)
// ─────────────────────────────────────────────────────────────────
async function seedAdmin() {
    try {
        const hash = await bcrypt.hash('admin123', 10);
        const [existing] = await pool.query('SELECT id FROM users WHERE email = "admin@onlok.com"');
        if (existing.length === 0) {
            await pool.query(
                `INSERT INTO users (vendor_id, first_name, last_name, business_name, email, password_hash, phone_number, role, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'admin', 'verified')`,
                ['ONL-ADMIN-01', 'Admin', 'User', 'Onlok', 'admin@onlok.com', hash, '0000000000']
            );
            console.log('✅ [AutoMigrate] Seeded admin@onlok.com');
        } else {
            await pool.query(
                'UPDATE users SET password_hash = ?, role = "admin" WHERE email = "admin@onlok.com"',
                [hash]
            );
            console.log('✅ [AutoMigrate] Admin account verified / password reset.');
        }
    } catch (err) {
        console.error('❌ [AutoMigrate] Admin seed failed:', err.message);
    }
}

// ─────────────────────────────────────────────────────────────────
// 4.  MAIN EXPORT — called once from server.js on startup
// ─────────────────────────────────────────────────────────────────
async function runMigrations() {
    console.log('🔄 [AutoMigrate] Running schema migrations...');
    try {
        await createTables();
        await addMissingColumns();
        await seedAdmin();
        console.log('🎉 [AutoMigrate] All migrations complete.');
    } catch (err) {
        console.error('❌ [AutoMigrate] Migration failed:', err.message);
    }
}

module.exports = runMigrations;
