const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateVendorId } = require('../utils/generateId');
const { generateQRCode } = require('../utils/qrCodeGenerator');

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

        // Derive a unified display status:
        // If verifications.status is 'flagged' OR users.status is 'suspended' => show as 'flagged'
        let query = `
            SELECT v.id as verification_id,
                   CASE 
                     WHEN v.status = 'flagged' OR u.status = 'suspended' THEN 'flagged'
                     ELSE v.status 
                   END as status,
                   v.submitted_at, 
                   u.id as user_id, u.first_name, u.last_name, u.email, u.vendor_id, u.business_name,
                   (CASE WHEN u.business_name IS NOT NULL AND u.business_name != '' THEN 'Business' ELSE 'Individual' END) as type
            FROM verifications v
            JOIN users u ON v.user_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (statusFilter && statusFilter !== 'all') {
            if (statusFilter === 'flagged') {
                // Catch records where either verifications OR users table marks it as flagged/suspended
                query += ` AND (v.status = 'flagged' OR u.status = 'suspended')`;
            } else {
                query += ` AND v.status = ? AND u.status != 'suspended'`;
                params.push(statusFilter);
            }
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
            if (statusFilter === 'flagged') {
                countQuery += ` AND (v.status = 'flagged' OR u.status = 'suspended')`;
            } else {
                countQuery += ` AND v.status = ? AND u.status != 'suspended'`;
                countParams.push(statusFilter);
            }
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
            SELECT v.id as verification_id, v.gov_id_url, v.video_url,
                   CASE 
                     WHEN v.status = 'flagged' OR u.status = 'suspended' THEN 'flagged'
                     ELSE v.status 
                   END as status,
                   v.admin_notes, v.submitted_at, v.reviewed_at,
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
        const { status, notes } = req.body; // 'approved', 'rejected', 'flagged', 'pending'

        if (!['approved', 'rejected', 'flagged', 'pending'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Check if verification exists
        const [verifications] = await pool.query('SELECT user_id, status FROM verifications WHERE id = ?', [id]);
        if (verifications.length === 0) {
            return res.status(404).json({ message: 'Verification not found' });
        }
        
        const verification = verifications[0];
        
        // Update verifications table (Now includes admin_notes!)
        const updateQuery = `
            UPDATE verifications 
            SET status = ?, admin_notes = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? 
            WHERE id = ?
        `;
        await pool.query(updateQuery, [status, notes || null, req.user.id, id]);

        // Update Users Table based on action
        if (status === 'approved') {
            // Fetch user to check if they already have a vendor_id
            const [userRows] = await pool.query('SELECT vendor_id FROM users WHERE id = ?', [verification.user_id]);
            let vendor_id = userRows[0]?.vendor_id;

            if (!vendor_id) {
                vendor_id = await generateVendorId('NG');
                const profileLink = `https://onlok.com/profile/${vendor_id}`;
                const qrCodeUrl = await generateQRCode(profileLink);

                // Update user with new vendor_id
                await pool.query(`UPDATE users SET status = 'verified', vendor_id = ? WHERE id = ?`, [vendor_id, verification.user_id]);
                
                // Insert Vendor Profile
                await pool.query(`INSERT INTO vendor_profiles (user_id, profile_link, qr_code_url) VALUES (?, ?, ?)`, [verification.user_id, profileLink, qrCodeUrl]);
            } else {
                await pool.query(`UPDATE users SET status = 'verified' WHERE id = ?`, [verification.user_id]);
            }

            const [existingBadges] = await pool.query('SELECT id FROM badges WHERE user_id = ? AND badge_type = "verified_vendor"', [verification.user_id]);
            if (existingBadges.length === 0) {
                await pool.query(`INSERT INTO badges (user_id, badge_type) VALUES (?, 'verified_vendor')`, [verification.user_id]);
            }
            
            // Mark referral as available
            await pool.query(`UPDATE referrals SET status = 'available' WHERE referred_user_id = ? AND status = 'pending'`, [verification.user_id]);
        } else if (status === 'rejected') {
            await pool.query(`UPDATE users SET status = 'rejected' WHERE id = ?`, [verification.user_id]);
            await pool.query(`DELETE FROM badges WHERE user_id = ? AND badge_type = "verified_vendor"`, [verification.user_id]);
        } else if (status === 'flagged') {
            await pool.query(`UPDATE users SET status = 'suspended' WHERE id = ?`, [verification.user_id]);
        } else if (status === 'pending') {
            await pool.query(`UPDATE users SET status = 'pending' WHERE id = ?`, [verification.user_id]);
        }

        // Insert audit log
        const severity = status === 'flagged' ? 'HIGH' : status === 'rejected' ? 'MEDIUM' : 'LOW';
        const actionText = status === 'flagged' ? 'Flagged account' : status === 'rejected' ? 'Rejected verification' : 'Approved verification';
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, severity, details) VALUES (?, ?, ?, ?)',
            [verification.user_id, actionText, severity, notes || `Admin manually ${status} user`]
        );

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
        const [rejectedCount] = await pool.query('SELECT COUNT(*) as total FROM verifications WHERE status = "rejected"');
        
        const [users] = await pool.query(`
            SELECT id, vendor_id, first_name, last_name, email, role, status, 
                   created_at 
            FROM users 
            ORDER BY created_at DESC 
            LIMIT 50
        `);

        res.status(200).json({
            metrics: {
                totalUsers: usersCount[0].total,
                pendingVerifications: pendingCount[0].total,
                approvedVendors: approvedCount[0].total,
                flaggedAccounts: flaggedCount[0].total,
                rejectedVerifications: rejectedCount[0].total
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
        
        // Insert audit log for settings change
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, severity, details) VALUES (NULL, ?, ?, ?)',
            ['Updated system settings', 'LOW', 'Admin updated global configuration settings']
        );

        res.status(200).json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Admin Settings Update Error:', error);
        res.status(500).json({ message: 'Server error updating settings' });
    }
};

// @desc    Get mock users
// @route   GET /api/admin/mock-users
// @access  Public (Temporary)
const getMockUsers = (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const mockDataPath = path.join(__dirname, '..', 'mock_users.json');
        if (fs.existsSync(mockDataPath)) {
            const data = fs.readFileSync(mockDataPath, 'utf8');
            res.status(200).json(JSON.parse(data));
        } else {
            res.status(404).json({ message: 'Mock data not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error reading mock data' });
    }
};

// @desc    Get all referrals and global stats
// @route   GET /api/admin/referrals
// @access  Private/Admin
const getReferralsAdmin = async (req, res) => {
    try {
        const [referrals] = await pool.query(`
            SELECT r.*, 
                   referrer.first_name as referrer_first_name, referrer.last_name as referrer_last_name,
                   referred.business_name as referred_business_name, referred.first_name as referred_first_name, referred.last_name as referred_last_name
            FROM referrals r
            JOIN users referrer ON r.referrer_id = referrer.id
            JOIN users referred ON r.referred_user_id = referred.id
            ORDER BY r.created_at DESC
        `);

        let totalReferrals = referrals.length;
        let totalCommissionsGenerated = 0;
        let totalPendingCommissions = 0;
        let totalAvailableCommissions = 0;

        referrals.forEach(ref => {
            if (ref.status !== 'cancelled' && ref.status !== 'reversed') {
                totalCommissionsGenerated += parseFloat(ref.commission_earned);
            }
            if (ref.status === 'pending') {
                totalPendingCommissions += parseFloat(ref.commission_earned);
            }
            if (ref.status === 'available') {
                totalAvailableCommissions += parseFloat(ref.commission_earned);
            }
        });

        // Also get total paid from withdrawals
        const [paidWithdrawals] = await pool.query(`SELECT SUM(amount) as total_paid FROM withdrawals WHERE status = 'paid'`);
        let totalCommissionsPaid = paidWithdrawals[0].total_paid || 0;

        res.status(200).json({
            stats: {
                totalReferrals,
                totalCommissionsGenerated,
                totalPendingCommissions,
                totalAvailableCommissions,
                totalCommissionsPaid
            },
            referrals
        });
    } catch (error) {
        console.error('Admin Referrals Fetch Error:', error);
        res.status(500).json({ message: 'Server error fetching admin referrals' });
    }
};

// @desc    Get all withdrawals
// @route   GET /api/admin/withdrawals
// @access  Private/Admin
const getWithdrawalsAdmin = async (req, res) => {
    try {
        const [withdrawals] = await pool.query(`
            SELECT w.*, u.first_name, u.last_name, u.email 
            FROM withdrawals w
            JOIN users u ON w.user_id = u.id
            ORDER BY w.created_at DESC
        `);
        res.status(200).json(withdrawals);
    } catch (error) {
        console.error('Admin Withdrawals Fetch Error:', error);
        res.status(500).json({ message: 'Server error fetching admin withdrawals' });
    }
};

// @desc    Update withdrawal status
// @route   PUT /api/admin/withdrawals/:id/status
// @access  Private/Admin
const updateWithdrawalStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['processing', 'paid', 'failed'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        await pool.query('UPDATE withdrawals SET status = ? WHERE id = ?', [status, id]);

        // Insert audit log
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, severity, details) VALUES (NULL, ?, ?, ?)',
            ['Update withdrawal status', 'LOW', `Admin updated withdrawal ${id} to ${status}`]
        );

        res.status(200).json({ message: 'Withdrawal status updated successfully' });
    } catch (error) {
        console.error('Admin Update Withdrawal Error:', error);
        res.status(500).json({ message: 'Server error updating withdrawal status' });
    }
};

// @desc    Get website hits
// @route   GET /api/admin/website-hits
// @access  Private/Admin
const getWebsiteHits = async (req, res) => {
    try {
        const { period } = req.query; // 'week', 'month', 'quarterly'
        let dateCondition = '';
        
        if (period === 'week') {
            dateCondition = 'date >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)';
        } else if (period === 'month') {
            dateCondition = 'date >= DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH)';
        } else if (period === 'quarterly') {
            dateCondition = 'date >= DATE_SUB(CURRENT_DATE, INTERVAL 3 MONTH)';
        } else {
            // default to all time
            dateCondition = '1=1';
        }

        const query = `SELECT SUM(hits) as total_hits FROM daily_site_hits WHERE ${dateCondition}`;
        const [rows] = await pool.query(query);
        
        res.status(200).json({ totalHits: rows[0].total_hits || 0 });
    } catch (error) {
        console.error('Admin Website Hits Fetch Error:', error);
        res.status(500).json({ message: 'Server error fetching website hits' });
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
    updateSettings,
    getMockUsers,
    getReferralsAdmin,
    getWithdrawalsAdmin,
    updateWithdrawalStatus,
    getWebsiteHits
};