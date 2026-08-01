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
    // Global metrics / Stats
    await pool.query(`
        CREATE TABLE IF NOT EXISTS daily_site_hits (
            date DATE PRIMARY KEY,
            hits INT DEFAULT 1
        )
    `);

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
            tiktok_handle          VARCHAR(255) NULL,
            profile_picture_url    VARCHAR(500) NULL,
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
            cac_url       VARCHAR(255) NULL,
            video_url     VARCHAR(255) NOT NULL,
            status        ENUM('pending','tier_assigned','payment_received','approved','rejected','flagged') DEFAULT 'pending',
            assigned_tier VARCHAR(50) NULL,
            payment_status ENUM('unpaid','paid') DEFAULT 'unpaid',
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
            reference_number    VARCHAR(50) UNIQUE NULL,
            reporter_id         INT NULL,
            reported_vendor_id  VARCHAR(50) NOT NULL,
            contact_email       VARCHAR(255) NULL,
            phone_number        VARCHAR(20) NULL,
            is_whatsapp         BOOLEAN DEFAULT FALSE,
            category            ENUM('fraud','impersonation','harassment','inaccurate_information', 'others') NOT NULL,
            context             TEXT NOT NULL,
            evidence_files      JSON NULL,
            status              ENUM('pending','reviewed','dismissed') DEFAULT 'pending',
            priority            ENUM('low','medium','high') DEFAULT 'medium',
            created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    // Add new columns if the table already existed before this update.
    // Each statement has its own try/catch so one failure doesn't skip the rest.
    const alterQueries = [
        "ALTER TABLE users MODIFY COLUMN vendor_id VARCHAR(20) NULL",
        "ALTER TABLE verifications ADD COLUMN cac_url VARCHAR(255) NULL AFTER gov_id_url",
        "ALTER TABLE reports ADD COLUMN reference_number VARCHAR(50) UNIQUE NULL AFTER id",
        "ALTER TABLE reports ADD COLUMN contact_email VARCHAR(255) NULL AFTER reported_vendor_id",
        "ALTER TABLE reports ADD COLUMN phone_number VARCHAR(20) NULL AFTER contact_email",
        "ALTER TABLE reports ADD COLUMN is_whatsapp BOOLEAN DEFAULT FALSE AFTER phone_number",
        "ALTER TABLE reports ADD COLUMN evidence_files JSON NULL AFTER context",
        "ALTER TABLE reports ADD COLUMN priority ENUM('low','medium','high') DEFAULT 'medium' AFTER status",
        "ALTER TABLE reports MODIFY COLUMN reported_vendor_id VARCHAR(50) NOT NULL",
        "ALTER TABLE reports MODIFY COLUMN category ENUM('fraud','impersonation','harassment','inaccurate_information', 'others') NOT NULL",
        "ALTER TABLE verifications MODIFY COLUMN status ENUM('pending','tier_assigned','payment_received','approved','rejected','flagged') DEFAULT 'pending'",
    ];
    for (const sql of alterQueries) {
        try {
            await pool.query(sql);
        } catch (err) {
            // ER_DUP_FIELDNAME  = column already exists (safe to ignore)
            // ER_DUP_KEYNAME    = unique key already exists (safe to ignore)
            const ignored = ['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME'];
            if (!ignored.includes(err.code)) {
                console.log(`Notice: ALTER TABLE skipped — ${err.message}`);
            }
        }
    }

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

    // Referrals
    await pool.query(`
        CREATE TABLE IF NOT EXISTS referrals (
            id                 INT AUTO_INCREMENT PRIMARY KEY,
            referrer_id        INT NOT NULL,
            referred_user_id   INT NOT NULL,
            subscription_plan  VARCHAR(50) NOT NULL,
            amount_paid        DECIMAL(10,2) NOT NULL,
            commission_earned  DECIMAL(10,2) NOT NULL,
            status             ENUM('pending','available','processing','paid','withdrawn','cancelled','reversed') DEFAULT 'pending',
            created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Withdrawals
    await pool.query(`
        CREATE TABLE IF NOT EXISTS withdrawals (
            id                  INT AUTO_INCREMENT PRIMARY KEY,
            user_id             INT NOT NULL,
            amount              DECIMAL(10,2) NOT NULL,
            status              ENUM('pending','processing','paid','failed','rejected','reversed') DEFAULT 'pending',
            payment_method      VARCHAR(255) NULL,
            account_details     VARCHAR(255) NULL,
            bank_code           VARCHAR(50) NULL,
            bank_name           VARCHAR(255) NULL,
            account_number      VARCHAR(50) NULL,
            account_name        VARCHAR(255) NULL,
            recipient_code      VARCHAR(100) NULL,
            transfer_code       VARCHAR(100) NULL,
            transfer_reference  VARCHAR(100) UNIQUE NULL,
            failure_reason      TEXT NULL,
            created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Report Notes — internal admin-only notes per complaint
    await pool.query(`
        CREATE TABLE IF NOT EXISTS report_notes (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            report_id  INT NOT NULL,
            admin_id   INT NOT NULL,
            note       TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
            FOREIGN KEY (admin_id)  REFERENCES users(id)   ON DELETE CASCADE
        )
    `);

    // Report Timeline — immutable ordered event log per complaint
    await pool.query(`
        CREATE TABLE IF NOT EXISTS report_timeline (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            report_id   INT NOT NULL,
            event_type  VARCHAR(100) NOT NULL,
            description TEXT NOT NULL,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
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
    { table: 'verifications', column: 'assigned_tier', definition: 'VARCHAR(50) NULL AFTER status' },
    { table: 'verifications', column: 'payment_status', definition: "ENUM('unpaid','paid') DEFAULT 'unpaid' AFTER assigned_tier" },
    { table: 'verifications', column: 'flagged',     definition: "ENUM('pending','tier_assigned','payment_received','approved','rejected','flagged') NULL AFTER admin_notes" },

    // ── ADD NEW COLUMNS BELOW THIS LINE ──────────────────────────
    { table: 'users', column: 'referred_by', definition: 'INT NULL AFTER vendor_id' },
    // Update referrals status enum
    { table: 'referrals', column: 'status', definition: "ENUM('pending','available','processing','paid','withdrawn','cancelled','reversed') DEFAULT 'pending' AFTER commission_earned" },
    { table: 'reports', column: 'is_whatsapp', definition: 'BOOLEAN DEFAULT FALSE AFTER phone_number' },
    // Profile picture
    { table: 'users', column: 'profile_picture_url', definition: 'VARCHAR(500) NULL AFTER tiktok_handle' },
    // Withdrawals enhancements
    { table: 'withdrawals', column: 'account_details', definition: 'VARCHAR(255) NULL AFTER payment_method' },
    { table: 'withdrawals', column: 'bank_code',          definition: 'VARCHAR(50) NULL AFTER payment_method' },
    { table: 'withdrawals', column: 'bank_name',          definition: 'VARCHAR(255) NULL AFTER bank_code' },
    { table: 'withdrawals', column: 'account_number',     definition: 'VARCHAR(50) NULL AFTER bank_name' },
    { table: 'withdrawals', column: 'account_name',       definition: 'VARCHAR(255) NULL AFTER account_number' },
    { table: 'withdrawals', column: 'recipient_code',     definition: 'VARCHAR(100) NULL AFTER account_name' },
    { table: 'withdrawals', column: 'transfer_code',      definition: 'VARCHAR(100) NULL AFTER recipient_code' },
    { table: 'withdrawals', column: 'transfer_reference', definition: 'VARCHAR(100) NULL AFTER transfer_code' },
    { table: 'withdrawals', column: 'failure_reason',     definition: 'TEXT NULL AFTER transfer_reference' },
    // Saved bank details for users
    { table: 'users', column: 'bank_code',               definition: 'VARCHAR(50) NULL' },
    { table: 'users', column: 'bank_name',               definition: 'VARCHAR(255) NULL' },
    { table: 'users', column: 'account_number',          definition: 'VARCHAR(50) NULL' },
    { table: 'users', column: 'account_name',            definition: 'VARCHAR(255) NULL' },
    { table: 'users', column: 'paystack_recipient_code', definition: 'VARCHAR(100) NULL' },
    { table: 'reports', column: 'assigned_to', definition: 'VARCHAR(255) NULL AFTER priority' },
    // Password reset fields
    { table: 'users', column: 'reset_password_token', definition: 'VARCHAR(255) NULL AFTER updated_at' },
    { table: 'users', column: 'reset_password_expires', definition: 'BIGINT NULL AFTER reset_password_token' },
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
    try {
        await pool.query(`ALTER TABLE withdrawals MODIFY COLUMN status ENUM('pending','processing','paid','failed','rejected','reversed') DEFAULT 'pending'`);
    } catch (err) {
        // ignore if not needed
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
// 3.5 SEED DEFAULT TEST USER (runs every startup, resets password)
// ─────────────────────────────────────────────────────────────────
async function seedTestUser() {
    try {
        const hash = await bcrypt.hash('test1234', 10);
        const [existing] = await pool.query('SELECT id FROM users WHERE email = "test@onlok.com"');
        if (existing.length === 0) {
            await pool.query(
                `INSERT INTO users (vendor_id, first_name, last_name, business_name, email, password_hash, phone_number, role, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'vendor', 'pending')`,
                ['ONL-TEST-01', 'Test', 'Vendor', 'Test Business', 'test@onlok.com', hash, '08012345678']
            );
            console.log('✅ [AutoMigrate] Seeded test@onlok.com');
        } else {
            await pool.query(
                'UPDATE users SET password_hash = ?, status = "pending" WHERE email = "test@onlok.com"',
                [hash]
            );
            console.log('✅ [AutoMigrate] Test account reset.');
        }
    } catch (err) {
        console.error('❌ [AutoMigrate] Test user seed failed:', err.message);
    }
}
// ─────────────────────────────────────────────────────────────────
// 3.6 SEED DEMO VENDORS, REFERRALS & WITHDRAWALS FOR TESTING
// ─────────────────────────────────────────────────────────────────
async function seedReferralsAndWithdrawals() {
    try {
        const hash = await bcrypt.hash('password123', 10);
        
        // Seed demo vendor accounts if not present
        const demoVendors = [
            { vendor_id: 'ONL-VD-01', first_name: 'Muhammad Munir', last_name: 'Musa', business_name: 'Amgautos&Sons', email: 'muhammad@amgautos.com' },
            { vendor_id: 'ONL-VD-02', first_name: 'Ahmed', last_name: 'Ibrahim', business_name: 'TechHub Solutions', email: 'ahmed@techhub.com' },
            { vendor_id: 'ONL-VD-03', first_name: 'Grace', last_name: 'Okafor', business_name: 'Graceful Designs', email: 'grace@designs.com' },
            { vendor_id: 'ONL-VD-04', first_name: 'Chidi', last_name: 'Okeke', business_name: 'Okeke Enterprises', email: 'chidi@okeke.com' },
            { vendor_id: 'ONL-VD-05', first_name: 'Bisi', last_name: 'Akande', business_name: 'Akande Logistics', email: 'bisi@akande.com' }
        ];

        const userIds = {};

        for (const v of demoVendors) {
            const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [v.email]);
            if (rows.length === 0) {
                const [result] = await pool.query(
                    `INSERT INTO users (vendor_id, first_name, last_name, business_name, email, password_hash, phone_number, role, status)
                     VALUES (?, ?, ?, ?, ?, ?, '08012345678', 'vendor', 'verified')`,
                    [v.vendor_id, v.first_name, v.last_name, v.business_name, v.email, hash]
                );
                userIds[v.email] = result.insertId;
            } else {
                userIds[v.email] = rows[0].id;
            }
        }

        // Seed Referrals if table is empty
        const [refCount] = await pool.query('SELECT COUNT(*) as total FROM referrals');
        if (refCount[0].total === 0) {
            const m = userIds['muhammad@amgautos.com'];
            const a = userIds['ahmed@techhub.com'];
            const g = userIds['grace@designs.com'];
            const c = userIds['chidi@okeke.com'];
            const b = userIds['bisi@akande.com'];

            const sampleReferrals = [
                [m, a, 'Premium Plan', 25000.00, 3000.00, 'available'],
                [m, g, 'Premium Plan', 25000.00, 3000.00, 'paid'],
                [m, c, 'Premium Plan', 25000.00, 3000.00, 'pending'],
                [m, b, 'Premium Plan', 25000.00, 3000.00, 'processing'],
                [a, g, 'Premium Plan', 25000.00, 3000.00, 'cancelled']
            ];

            for (const ref of sampleReferrals) {
                await pool.query(
                    `INSERT INTO referrals (referrer_id, referred_user_id, subscription_plan, amount_paid, commission_earned, status)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    ref
                );
            }
            console.log('✅ [AutoMigrate] Seeded referral database entries.');
        }

        // Seed Withdrawals if table is empty
        const [withCount] = await pool.query('SELECT COUNT(*) as total FROM withdrawals');
        if (withCount[0].total === 0) {
            const m = userIds['muhammad@amgautos.com'];
            const g = userIds['grace@designs.com'];
            const c = userIds['chidi@okeke.com'];

            const sampleWithdrawals = [
                [m, 25000.00, 'paid', 'Bank Transfer', '01273638474\nAmazon Bank'],
                [g, 25000.00, 'failed', 'Bank Transfer', '01273638474\nAmazon Bank'],
                [c, 25000.00, 'processing', 'Bank Transfer', '01273638474\nAmazon Bank']
            ];

            for (const w of sampleWithdrawals) {
                await pool.query(
                    `INSERT INTO withdrawals (user_id, amount, status, payment_method, account_details)
                     VALUES (?, ?, ?, ?, ?)`,
                    w
                );
            }
            console.log('✅ [AutoMigrate] Seeded withdrawal database entries.');
        }
    } catch (err) {
        console.error('❌ [AutoMigrate] Referral/Withdrawal seed failed:', err.message);
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
        await seedTestUser();
        await seedReferralsAndWithdrawals();
        console.log('🎉 [AutoMigrate] All migrations complete.');
    } catch (err) {
        console.error('❌ [AutoMigrate] Migration failed:', err.message);
    }
}

module.exports = runMigrations;
