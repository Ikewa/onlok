const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// @desc    Auth admin & get token
// @route   POST /api/admin/login
// @access  Public
const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await pool.query('SELECT * FROM users WHERE email = ? AND role = "admin"', [email]);

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid admin credentials' });
        }

        const admin = users[0];
        const isMatch = await bcrypt.compare(password, admin.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid admin credentials' });
        }

        const token = jwt.sign(
            { id: admin.id, role: admin.role, vendor_id: admin.vendor_id },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            id: admin.id,
            first_name: admin.first_name,
            last_name: admin.last_name,
            email: admin.email,
            role: admin.role,
            token
        });
    } catch (error) {
        console.error('Admin Login Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
// @desc    Get all verifications (Queue)
// @route   GET /api/admin/verifications
// @access  Private/Admin
const getVerificationQueue = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const statusFilter = req.query.status; // 'pending', 'approved', 'rejected', 'flagged', 'all'
        const search = req.query.search;

        let query = `
            SELECT v.id as verification_id, v.status, v.submitted_at, 
                   u.id as user_id, u.first_name, u.last_name, u.email, u.vendor_id, u.business_name,
                   (CASE WHEN u.business_name IS NOT NULL AND u.business_name != '' THEN 'Business' ELSE 'Individual' END) as type
            FROM verifications v
            JOIN users u ON v.user_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (statusFilter && statusFilter !== 'all') {
            query += ` AND v.status = ?`;
            params.push(statusFilter);
        }

        if (search) {
            query += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.vendor_id LIKE ?)`;
            const searchVal = `%${search}%`;
            params.push(searchVal, searchVal, searchVal, searchVal);
        }

        query += ` ORDER BY v.submitted_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await pool.query(query, params);

        // Get total count for pagination
        let countQuery = `SELECT COUNT(*) as total FROM verifications v JOIN users u ON v.user_id = u.id WHERE 1=1`;
        const countParams = [];
        if (statusFilter && statusFilter !== 'all') {
            countQuery += ` AND v.status = ?`;
            countParams.push(statusFilter);
        }
        if (search) {
            countQuery += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.vendor_id LIKE ?)`;
            const searchVal = `%${search}%`;
            countParams.push(searchVal, searchVal, searchVal, searchVal);
        }
        const [countResult] = await pool.query(countQuery, countParams);
        const total = countResult[0].total;

        res.status(200).json({
            results: rows,
            page,
            totalPages: Math.ceil(total / limit),
            total
        });
    } catch (error) {
        console.error('Admin Queue Error:', error);
        res.status(500).json({ message: 'Server error fetching verification queue' });
    }
};

// @desc    Get detailed info for a single verification
// @route   GET /api/admin/verifications/:id
// @access  Private/Admin
const getVerificationDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT v.id as verification_id, v.gov_id_url, v.video_url, v.status, v.submitted_at, v.reviewed_at,
                   u.id as user_id, u.first_name, u.last_name, u.email, u.vendor_id, u.business_name,
                   (CASE WHEN u.business_name IS NOT NULL AND u.business_name != '' THEN 'Business' ELSE 'Individual' END) as type
            FROM verifications v
            JOIN users u ON v.user_id = u.id
            WHERE v.id = ?
        `;
        const [rows] = await pool.query(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Verification request not found' });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Admin Details Error:', error);
        res.status(500).json({ message: 'Server error fetching verification details' });
    }
};

// @desc    Update verification status
// @route   PUT /api/admin/verifications/:id/status
// @access  Private/Admin
const updateVerificationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body; // 'approved', 'rejected', 'flagged'

        if (!['approved', 'rejected', 'flagged', 'pending'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Check if verification exists
        const [verifications] = await pool.query('SELECT user_id, status FROM verifications WHERE id = ?', [id]);
        if (verifications.length === 0) {
            return res.status(404).json({ message: 'Verification not found' });
        }
        
        const verification = verifications[0];
        
        // Prevent changing status if it's already approved/rejected/flagged unless needed? Usually fine to update.
        
        // Update verifications table
        const updateQuery = `
            UPDATE verifications 
            SET status = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? 
            WHERE id = ?
        `;
        await pool.query(updateQuery, [status, req.user.id, id]);

        // If approved, update user status to 'verified'
        if (status === 'approved') {
            await pool.query(`UPDATE users SET status = 'verified' WHERE id = ?`, [verification.user_id]);
            // Also generate the first badge if they don't have one (e.g. Identity Verified)
            const [existingBadges] = await pool.query('SELECT id FROM badges WHERE user_id = ? AND badge_type = "identity_verified"', [verification.user_id]);
            if (existingBadges.length === 0) {
                await pool.query(`INSERT INTO badges (user_id, badge_type) VALUES (?, 'identity_verified')`, [verification.user_id]);
            }
        } else if (status === 'rejected' || status === 'flagged') {
            // Might want to update user status to rejected/flagged if needed, or leave user status as pending
            if (status === 'rejected' && verification.status === 'approved') {
                 // Downgrade user if they were previously approved
                 await pool.query(`UPDATE users SET status = 'pending' WHERE id = ?`, [verification.user_id]);
                 await pool.query(`DELETE FROM badges WHERE user_id = ? AND badge_type = "identity_verified"`, [verification.user_id]);
            }
        }

        res.status(200).json({ message: `Verification ${status} successfully` });
    } catch (error) {
        console.error('Admin Status Update Error:', error);
        res.status(500).json({ message: 'Server error updating verification status' });
    }
};

// @desc    Get dashboard metrics & user management list
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardMetrics = async (req, res) => {
    try {
        const [usersCount] = await pool.query('SELECT COUNT(*) as total FROM users');
        const [pendingCount] = await pool.query('SELECT COUNT(*) as total FROM verifications WHERE status = "pending"');
        const [approvedCount] = await pool.query('SELECT COUNT(*) as total FROM verifications WHERE status = "approved"');
        const [flaggedCount] = await pool.query('SELECT COUNT(*) as total FROM verifications WHERE status = "flagged"');
        
        // Fetch recent users + their activity for User Management
        const [users] = await pool.query(`
            SELECT id, vendor_id, first_name, last_name, email, role, status, 
                   created_at, last_login, activity_score 
            FROM users 
            ORDER BY created_at DESC 
            LIMIT 50
        `);

        res.status(200).json({
            metrics: {
                totalUsers: usersCount[0].total,
                pendingVerifications: pendingCount[0].total,
                approvedVendors: approvedCount[0].total,
                flaggedAccounts: flaggedCount[0].total
            },
            users
        });
    } catch (error) {
        console.error('Admin Dashboard Error:', error);
        res.status(500).json({ message: 'Server error fetching dashboard metrics' });
    }
};

// @desc    Get security alerts and audit logs
// @route   GET /api/admin/alerts
// @access  Private/Admin
const getAlerts = async (req, res) => {
    try {
        const [logs] = await pool.query(`
            SELECT a.id, a.action, a.severity, a.details, a.created_at, 
                   u.first_name, u.last_name, u.email 
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.created_at DESC
            LIMIT 100
        `);
        res.status(200).json(logs);
    } catch (error) {
        console.error('Admin Alerts Error:', error);
        res.status(500).json({ message: 'Server error fetching alerts' });
    }
};

// @desc    Get admin settings
// @route   GET /api/admin/settings
// @access  Private/Admin
const getSettings = async (req, res) => {
    try {
        const [settings] = await pool.query('SELECT setting_key, setting_value FROM admin_settings');
        // Convert to key-value object
        const settingsObj = {};
        settings.forEach(s => { settingsObj[s.setting_key] = s.setting_value; });
        res.status(200).json(settingsObj);
    } catch (error) {
        console.error('Admin Settings Fetch Error:', error);
        res.status(500).json({ message: 'Server error fetching settings' });
    }
};

// @desc    Update admin settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
const updateSettings = async (req, res) => {
    try {
        const settings = req.body;
        for (const [key, value] of Object.entries(settings)) {
            await pool.query(
                'INSERT INTO admin_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                [key, String(value), String(value)]
            );
        }
        res.status(200).json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Admin Settings Update Error:', error);
        res.status(500).json({ message: 'Server error updating settings' });
    }
};

module.exports = {
    adminLogin,
    getVerificationQueue,
    getVerificationDetails,
    updateVerificationStatus,
    getDashboardMetrics,
    getAlerts,
    getSettings,
    updateSettings
};
