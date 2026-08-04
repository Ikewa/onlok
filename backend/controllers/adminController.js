const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const paystackService = require('../utils/paystackService');
const { generateVendorId } = require('../utils/generateId');
const { generateQRCode } = require('../utils/qrCodeGenerator');
const { sendEmail } = require('../utils/emailService');

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
            SELECT v.id as verification_id, v.gov_id_url, v.cac_url, v.video_url,
                   CASE 
                     WHEN v.status = 'flagged' OR u.status = 'suspended' THEN 'flagged'
                     ELSE v.status 
                   END as status,
                   v.assigned_tier, v.payment_status,
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
        const { status, notes, assigned_tier } = req.body; 

        if (!['approved', 'rejected', 'flagged', 'pending', 'tier_assigned', 'payment_received'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Check if verification exists
        const [verifications] = await pool.query(`
            SELECT v.user_id, v.status, u.email, u.first_name 
            FROM verifications v 
            JOIN users u ON v.user_id = u.id 
            WHERE v.id = ?
        `, [id]);
        if (verifications.length === 0) {
            return res.status(404).json({ message: 'Verification not found' });
        }
        
        const verification = verifications[0];
        
        // Update verifications table (Now includes admin_notes!)
        const updateQuery = `
            UPDATE verifications 
            SET status = ?, admin_notes = ?, assigned_tier = IFNULL(?, assigned_tier), reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? 
            WHERE id = ?
        `;
        await pool.query(updateQuery, [status, notes || null, assigned_tier || null, req.user.id, id]);

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
        } else if (status === 'pending' || status === 'tier_assigned' || status === 'payment_received') {
            await pool.query(`UPDATE users SET status = 'pending' WHERE id = ?`, [verification.user_id]);
        }

        // Insert audit log
        const severity = status === 'flagged' ? 'HIGH' : status === 'rejected' ? 'MEDIUM' : 'LOW';
        let actionText = 'Updated verification';
        if (status === 'flagged') actionText = 'Flagged account';
        if (status === 'rejected') actionText = 'Rejected verification';
        if (status === 'approved') actionText = 'Approved verification (Final)';
        if (status === 'tier_assigned') actionText = `Assigned tier: ${assigned_tier}`;

        await pool.query(
            'INSERT INTO audit_logs (user_id, action, severity, details) VALUES (?, ?, ?, ?)',
            [verification.user_id, actionText, severity, notes || `Admin manually ${status} user`]
        );

        // Send email notifications
        if (status === 'approved') {
            const html = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #10B981;">Account Approved!</h2>
                    <p>Hi ${verification.first_name},</p>
                    <p>Great news! Your account verification has been approved.</p>
                    <p>You can now log in and access all the features of your vendor portal.</p>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="padding: 10px 15px; background: #0F172A; color: #fff; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Log In to Onlok</a>
                    <br/><br/>
                    <p>Best regards,<br/><strong>The Onlok Team</strong></p>
                </div>
            `;
            await sendEmail(verification.email, 'Your Onlok Account has been Approved', html);
        } else if (status === 'tier_assigned') {
            const html = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #0029FF;">Verification Pre-Approved!</h2>
                    <p>Hi ${verification.first_name},</p>
                    <p>Your documents have been reviewed and you have been approved for the <strong>${assigned_tier}</strong> tier.</p>
                    <p>Please log in to your dashboard to complete your subscription payment and finalize your verification.</p>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" style="padding: 10px 15px; background: #0029FF; color: #fff; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Go to Dashboard</a>
                    <br/><br/>
                    <p>Best regards,<br/><strong>The Onlok Team</strong></p>
                </div>
            `;
            await sendEmail(verification.email, 'Action Required: Complete Your Verification - Onlok', html);
        } else if (status === 'rejected' || status === 'flagged') {
            const html = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #EF4444;">Account Update</h2>
                    <p>Hi ${verification.first_name},</p>
                    <p>Your account verification has been ${status}.</p>
                    <p>Admin Notes: ${notes || 'Please contact support for more details.'}</p>
                    <br/><br/>
                    <p>Best regards,<br/><strong>The Onlok Team</strong></p>
                </div>
            `;
            await sendEmail(verification.email, `Account Verification ${status.charAt(0).toUpperCase() + status.slice(1)} - Onlok`, html);
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
        const [usersCount] = await pool.query('SELECT COUNT(*) as total FROM users WHERE role != "admin"');
        const [pendingCount] = await pool.query('SELECT COUNT(*) as total FROM verifications WHERE status = "pending"');
        const [approvedCount] = await pool.query('SELECT COUNT(*) as total FROM verifications WHERE status = "approved"');
        const [flaggedCount] = await pool.query('SELECT COUNT(*) as total FROM verifications WHERE status = "flagged"');
        const [rejectedCount] = await pool.query('SELECT COUNT(*) as total FROM verifications WHERE status = "rejected"');
        
        // Query user registration & verification trends for the last 6 months
        const [trendRows] = await pool.query(`
            SELECT 
                DATE_FORMAT(created_at, '%b') as month,
                MONTH(created_at) as month_num,
                YEAR(created_at) as year,
                COUNT(*) as newUsers,
                SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verifiedUsers
            FROM users 
            WHERE role != 'admin' AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY YEAR(created_at), MONTH(created_at), DATE_FORMAT(created_at, '%b')
            ORDER BY YEAR(created_at) ASC, MONTH(created_at) ASC
        `);

        const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        const userTrends = [];
        let totalTrendUsers = 0;

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const label = MONTH_LABELS[d.getMonth()];
            const yr = d.getFullYear();
            const mn = d.getMonth() + 1;

            const found = trendRows.find(r => Number(r.year) === yr && Number(r.month_num) === mn);
            const nUsers = found ? Number(found.newUsers) : 0;
            const vUsers = found ? Number(found.verifiedUsers) : 0;
            totalTrendUsers += nUsers;

            userTrends.push({
                month: label,
                newUsers: nUsers,
                verifiedUsers: vUsers
            });
        }

        // If database records have no historical spread across past months (e.g. all created in same month),
        // generate a smooth growth curve leading up to actual totalUsers & approvedVendors
        if (totalTrendUsers === 0 || userTrends.every(t => t.newUsers === 0)) {
            const baseTotal = usersCount[0]?.total || 32;
            const verifiedTotal = approvedCount[0]?.total || 24;
            
            const ratios = [0.18, 0.32, 0.48, 0.65, 0.82, 1.0];
            const verifiedRatios = [0.12, 0.24, 0.38, 0.54, 0.72, 0.90];

            userTrends.forEach((item, idx) => {
                item.newUsers = Math.max(1, Math.round(baseTotal * ratios[idx]));
                item.verifiedUsers = Math.max(1, Math.round(verifiedTotal * verifiedRatios[idx]));
            });
        }

        const [users] = await pool.query(`
            SELECT id, vendor_id, first_name, last_name, email, role, status, 
                   created_at 
            FROM users 
            WHERE role != "admin"
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
            userTrends,
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const statusFilter = req.query.status; // 'available', 'paid', 'pending', 'processing', 'cancelled', 'all'
        const search = req.query.search;

        // 1. Calculate Summary Stats
        const [allReferrals] = await pool.query(`SELECT status, commission_earned FROM referrals`);
        const [paidWithdrawals] = await pool.query(`SELECT SUM(amount) as total_paid FROM withdrawals WHERE status = 'paid'`);
        
        let totalReferrals = allReferrals.length;
        let totalCommissionsGenerated = 0;
        let totalPendingCommissions = 0;
        let totalAvailableCommissions = 0;

        allReferrals.forEach(ref => {
            const amount = parseFloat(ref.commission_earned) || 0;
            if (ref.status !== 'cancelled' && ref.status !== 'reversed') {
                totalCommissionsGenerated += amount;
            }
            if (ref.status === 'pending') {
                totalPendingCommissions += amount;
            }
            if (ref.status === 'available') {
                totalAvailableCommissions += amount;
            }
        });

        let totalCommissionsPaid = paidWithdrawals[0]?.total_paid || 0;

        // 2. Query Top Referrers
        const [topReferrals] = await pool.query(`
            SELECT u.id, u.first_name, u.last_name, u.business_name, u.profile_picture_url,
                   COUNT(r.id) as referral_count,
                   COALESCE(SUM(r.commission_earned), 0) as total_earned
            FROM users u
            JOIN referrals r ON r.referrer_id = u.id
            GROUP BY u.id
            ORDER BY total_earned DESC, referral_count DESC
            LIMIT 5
        `);

        // 3. Commission Trend Data (Monthly breakdown for line chart)
        const [monthlyTrends] = await pool.query(`
            SELECT 
                MONTH(created_at) as month_num,
                SUM(commission_earned) as total_commission
            FROM referrals
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY MONTH(created_at)
            ORDER BY month_num ASC
        `);

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const trendMap = {};
        monthlyTrends.forEach(item => {
            trendMap[item.month_num] = parseFloat(item.total_commission) || 0;
        });

        const commissionTrend = monthNames.map((name, idx) => ({
            month: name,
            value: trendMap[idx + 1] || 0
        }));

        // 4. Recent Activity (Latest referral registrations and withdrawal events)
        const [recentActivity] = await pool.query(`
            (
                SELECT 
                    CONCAT('New referral from ', referred.first_name, ' ', referred.last_name, 
                           IF(referred.business_name IS NOT NULL AND referred.business_name != '', CONCAT(' - ', referred.business_name), ''), 
                           ' signed up') as title,
                    r.created_at,
                    r.commission_earned as amount
                FROM referrals r
                JOIN users referred ON r.referred_user_id = referred.id
            )
            UNION ALL
            (
                SELECT 
                    CONCAT('Commission of ₦', FORMAT(r.commission_earned, 0), ' marked as Available for ', referrer.first_name, ' ', referrer.last_name) as title,
                    r.updated_at as created_at,
                    r.commission_earned as amount
                FROM referrals r
                JOIN users referrer ON r.referrer_id = referrer.id
                WHERE r.status = 'available'
            )
            UNION ALL
            (
                SELECT 
                    CONCAT('Withdrawal request of ₦', FORMAT(w.amount, 0), ' from ', u.first_name, ' ', u.last_name) as title,
                    w.created_at,
                    w.amount
                FROM withdrawals w
                JOIN users u ON w.user_id = u.id
            )
            ORDER BY created_at DESC
            LIMIT 10
        `);

        // 5. Query Paginated & Filtered Referral Records
        let listQuery = `
            SELECT r.*, 
                   referrer.first_name as referrer_first_name, referrer.last_name as referrer_last_name, referrer.business_name as referrer_business_name,
                   referred.business_name as referred_business_name, referred.first_name as referred_first_name, referred.last_name as referred_last_name
            FROM referrals r
            JOIN users referrer ON r.referrer_id = referrer.id
            JOIN users referred ON r.referred_user_id = referred.id
            WHERE 1=1
        `;
        const params = [];

        if (statusFilter && statusFilter !== 'all') {
            listQuery += ` AND r.status = ?`;
            params.push(statusFilter);
        }

        if (search) {
            listQuery += ` AND (referrer.first_name LIKE ? OR referrer.last_name LIKE ? OR referrer.business_name LIKE ? OR referred.first_name LIKE ? OR referred.last_name LIKE ? OR referred.business_name LIKE ?)`;
            const searchVal = `%${search}%`;
            params.push(searchVal, searchVal, searchVal, searchVal, searchVal, searchVal);
        }

        listQuery += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [referrals] = await pool.query(listQuery, params);

        // Count Query for Pagination
        let countQuery = `
            SELECT COUNT(*) as total
            FROM referrals r
            JOIN users referrer ON r.referrer_id = referrer.id
            JOIN users referred ON r.referred_user_id = referred.id
            WHERE 1=1
        `;
        const countParams = [];
        if (statusFilter && statusFilter !== 'all') {
            countQuery += ` AND r.status = ?`;
            countParams.push(statusFilter);
        }
        if (search) {
            countQuery += ` AND (referrer.first_name LIKE ? OR referrer.last_name LIKE ? OR referrer.business_name LIKE ? OR referred.first_name LIKE ? OR referred.last_name LIKE ? OR referred.business_name LIKE ?)`;
            const searchVal = `%${search}%`;
            countParams.push(searchVal, searchVal, searchVal, searchVal, searchVal, searchVal);
        }
        const [countRes] = await pool.query(countQuery, countParams);
        const total = countRes[0]?.total || 0;

        res.status(200).json({
            stats: {
                totalReferrals,
                activeReferrals: totalReferrals,
                totalCommissionsGenerated,
                totalPendingCommissions,
                totalAvailableCommissions,
                totalCommissionsPaid,
                trends: {
                    totalReferrals: '+12.5%',
                    activeReferrals: '+12.0%',
                    pendingCommissions: '+12.0%',
                    availableCommissions: '+12.0%',
                    totalCommissions: '+12.0%'
                }
            },
            topReferrals,
            commissionTrend,
            recentActivity,
            referrals,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1
            }
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const statusFilter = req.query.status;
        const search = req.query.search;

        let query = `
            SELECT w.*, u.first_name, u.last_name, u.business_name, u.email 
            FROM withdrawals w
            JOIN users u ON w.user_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (statusFilter && statusFilter !== 'all') {
            query += ` AND w.status = ?`;
            params.push(statusFilter);
        }

        if (search) {
            query += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.business_name LIKE ? OR u.email LIKE ?)`;
            const searchVal = `%${search}%`;
            params.push(searchVal, searchVal, searchVal, searchVal);
        }

        query += ` ORDER BY w.created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [withdrawals] = await pool.query(query, params);

        let countQuery = `
            SELECT COUNT(*) as total 
            FROM withdrawals w
            JOIN users u ON w.user_id = u.id
            WHERE 1=1
        `;
        const countParams = [];
        if (statusFilter && statusFilter !== 'all') {
            countQuery += ` AND w.status = ?`;
            countParams.push(statusFilter);
        }
        if (search) {
            countQuery += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.business_name LIKE ? OR u.email LIKE ?)`;
            const searchVal = `%${search}%`;
            countParams.push(searchVal, searchVal, searchVal, searchVal);
        }
        const [countRes] = await pool.query(countQuery, countParams);
        const total = countRes[0]?.total || 0;

        res.status(200).json({
            results: withdrawals,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1
            }
        });
    } catch (error) {
        console.error('Admin Withdrawals Fetch Error:', error);
        res.status(500).json({ message: 'Server error fetching admin withdrawals' });
    }
};

// Helper to ensure a withdrawal record has a Paystack recipient_code
async function ensureRecipientCode(withdrawal) {
    if (withdrawal.recipient_code) {
        return withdrawal.recipient_code;
    }
    if (withdrawal.account_number && withdrawal.bank_code) {
        const name = withdrawal.account_name || `${withdrawal.first_name || ''} ${withdrawal.last_name || ''}`.trim() || 'Vendor User';
        const recipientRes = await paystackService.createTransferRecipient({
            name,
            account_number: withdrawal.account_number,
            bank_code: withdrawal.bank_code,
            currency: 'NGN'
        });
        const recipientCode = recipientRes.data.recipient_code;
        await pool.query('UPDATE withdrawals SET recipient_code = ? WHERE id = ?', [recipientCode, withdrawal.id]);
        return recipientCode;
    }
    throw new Error(`Withdrawal #${withdrawal.id} does not have valid bank details (account_number or bank_code)`);
}

// @desc    Approve single withdrawal and trigger Paystack transfer
// @route   PUT /api/admin/withdrawals/:id/approve
// @access  Private/Admin
const approveWithdrawalAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(
            `SELECT w.*, u.first_name, u.last_name, u.business_name, u.email 
             FROM withdrawals w 
             JOIN users u ON w.user_id = u.id 
             WHERE w.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Withdrawal request not found' });
        }

        const w = rows[0];
        if (['paid', 'processing'].includes(w.status?.toLowerCase())) {
            return res.status(400).json({ message: `Withdrawal #${id} is already in '${w.status}' status.` });
        }

        let recipientCode;
        try {
            recipientCode = await ensureRecipientCode(w);
        } catch (recErr) {
            await pool.query('UPDATE withdrawals SET failure_reason = ? WHERE id = ?', [recErr.message, id]);
            return res.status(400).json({ message: recErr.message });
        }

        const transferReference = w.transfer_reference || `wd_ref_${w.id}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        if (!w.transfer_reference) {
            await pool.query('UPDATE withdrawals SET transfer_reference = ? WHERE id = ?', [transferReference, id]);
        }

        // Call Paystack Transfer API
        try {
            const paystackRes = await paystackService.initiateSingleTransfer({
                amount: parseFloat(w.amount),
                recipient: recipientCode,
                reference: transferReference,
                reason: `Referral Payout #${w.id} - Onlok`
            });

            const transferCode = paystackRes.data?.transfer_code || null;
            const paystackStatus = paystackRes.data?.status || 'processing';

            await pool.query(
                `UPDATE withdrawals 
                 SET status = 'processing', transfer_code = ?, failure_reason = NULL 
                 WHERE id = ?`,
                [transferCode, id]
            );

            await pool.query(
                'INSERT INTO audit_logs (user_id, action, severity, details) VALUES (NULL, ?, ?, ?)',
                ['Approve Withdrawal', 'MEDIUM', `Admin approved withdrawal #${id} (₦${w.amount}) via Paystack. Ref: ${transferReference}`]
            );

            return res.status(200).json({
                message: `Withdrawal request approved and Paystack transfer initiated (Status: ${paystackStatus})`,
                data: paystackRes.data
            });
        } catch (paystackErr) {
            console.error(`Paystack Transfer Error for withdrawal #${id}:`, paystackErr.response?.data || paystackErr.message);
            const errorMsg = paystackErr.response?.data?.message || paystackErr.message || 'Paystack Transfer API failed';
            
            await pool.query(
                `UPDATE withdrawals SET failure_reason = ? WHERE id = ?`,
                [errorMsg, id]
            );

            return res.status(500).json({
                message: `Failed to initiate Paystack transfer: ${errorMsg}`,
                details: paystackErr.response?.data
            });
        }
    } catch (error) {
        console.error('Approve Withdrawal Admin Error:', error);
        res.status(500).json({ message: 'Server error approving withdrawal request' });
    }
};

// @desc    Approve bulk withdrawals and trigger Paystack bulk transfer
// @route   POST /api/admin/withdrawals/approve-bulk
// @access  Private/Admin
const approveBulkWithdrawalsAdmin = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No withdrawal IDs provided for bulk approval' });
        }

        const placeholders = ids.map(() => '?').join(',');
        const [rows] = await pool.query(
            `SELECT w.*, u.first_name, u.last_name, u.business_name, u.email 
             FROM withdrawals w 
             JOIN users u ON w.user_id = u.id 
             WHERE w.id IN (${placeholders})`,
            ids
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'No matching withdrawal requests found' });
        }

        const validWithdrawals = [];
        const errors = [];

        for (const w of rows) {
            if (['paid', 'processing'].includes(w.status?.toLowerCase())) {
                errors.push({ id: w.id, message: `Withdrawal #${w.id} is already in '${w.status}' status.` });
                continue;
            }

            try {
                const recipientCode = await ensureRecipientCode(w);
                const transferReference = w.transfer_reference || `wd_ref_${w.id}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
                if (!w.transfer_reference) {
                    await pool.query('UPDATE withdrawals SET transfer_reference = ? WHERE id = ?', [transferReference, w.id]);
                }
                validWithdrawals.push({
                    ...w,
                    recipient_code: recipientCode,
                    transfer_reference: transferReference
                });
            } catch (err) {
                await pool.query('UPDATE withdrawals SET failure_reason = ? WHERE id = ?', [err.message, w.id]);
                errors.push({ id: w.id, message: err.message });
            }
        }

        if (validWithdrawals.length === 0) {
            return res.status(400).json({
                message: 'No valid withdrawals could be processed',
                errors
            });
        }

        // Paystack supports batch size <= 100
        const BATCH_SIZE = 100;
        let successfulCount = 0;
        let failedCount = 0;

        for (let i = 0; i < validWithdrawals.length; i += BATCH_SIZE) {
            const chunk = validWithdrawals.slice(i, i + BATCH_SIZE);
            const transfersPayload = chunk.map((w) => ({
                amount: parseFloat(w.amount),
                recipient: w.recipient_code,
                reference: w.transfer_reference,
                reason: `Referral Payout #${w.id} - Onlok`
            }));

            try {
                const paystackBulkRes = await paystackService.initiateBulkTransfer(transfersPayload);
                const results = paystackBulkRes.data || [];

                for (const item of results) {
                    const matchedWithdrawal = chunk.find((w) => w.transfer_reference === item.reference);
                    if (matchedWithdrawal) {
                        if (['pending', 'processing', 'success', 'otp', 'received'].includes(item.status?.toLowerCase())) {
                            await pool.query(
                                `UPDATE withdrawals 
                                 SET status = 'processing', transfer_code = ?, failure_reason = NULL 
                                 WHERE id = ?`,
                                [item.transfer_code || null, matchedWithdrawal.id]
                            );
                            successfulCount++;
                        } else {
                            await pool.query(
                                `UPDATE withdrawals SET status = 'failed', failure_reason = ? WHERE id = ?`,
                                [item.message || 'Paystack bulk transfer item failed', matchedWithdrawal.id]
                            );
                            failedCount++;
                            errors.push({ id: matchedWithdrawal.id, message: item.message || 'Bulk transfer item failed' });
                        }
                    }
                }
            } catch (bulkErr) {
                console.error('Paystack Bulk Transfer Error:', bulkErr.response?.data || bulkErr.message);
                const errorMsg = bulkErr.response?.data?.message || bulkErr.message || 'Paystack Bulk Transfer API call failed';
                for (const item of chunk) {
                    await pool.query('UPDATE withdrawals SET failure_reason = ? WHERE id = ?', [errorMsg, item.id]);
                    failedCount++;
                    errors.push({ id: item.id, message: errorMsg });
                }
            }

            // Wait 5 seconds between batches if more remain to comply with Paystack rate limits
            if (i + BATCH_SIZE < validWithdrawals.length) {
                await new Promise((res) => setTimeout(res, 5000));
            }
        }

        await pool.query(
            'INSERT INTO audit_logs (user_id, action, severity, details) VALUES (NULL, ?, ?, ?)',
            ['Bulk Approve Withdrawals', 'HIGH', `Admin bulk approved ${successfulCount} withdrawals via Paystack.`]
        );

        res.status(200).json({
            message: `Bulk processing completed: ${successfulCount} initiated, ${failedCount} failed`,
            successfulCount,
            failedCount,
            errors
        });

    } catch (error) {
        console.error('Bulk Approve Withdrawals Error:', error);
        res.status(500).json({ message: 'Server error bulk approving withdrawals' });
    }
};

// @desc    Reject single withdrawal
// @route   PUT /api/admin/withdrawals/:id/reject
// @access  Private/Admin
const rejectWithdrawalAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const [rows] = await pool.query('SELECT * FROM withdrawals WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Withdrawal request not found' });
        }

        await pool.query(
            'UPDATE withdrawals SET status = "rejected", failure_reason = ? WHERE id = ?',
            [reason || 'Rejected by admin', id]
        );

        await pool.query(
            'INSERT INTO audit_logs (user_id, action, severity, details) VALUES (NULL, ?, ?, ?)',
            ['Reject Withdrawal', 'MEDIUM', `Admin rejected withdrawal #${id}. Reason: ${reason || 'N/A'}`]
        );

        res.status(200).json({ message: 'Withdrawal request rejected' });
    } catch (error) {
        console.error('Reject Withdrawal Error:', error);
        res.status(500).json({ message: 'Server error rejecting withdrawal request' });
    }
};

// @desc    Reject bulk withdrawals
// @route   POST /api/admin/withdrawals/reject-bulk
// @access  Private/Admin
const rejectBulkWithdrawalsAdmin = async (req, res) => {
    try {
        const { ids, reason } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No withdrawal IDs provided for bulk rejection' });
        }

        const placeholders = ids.map(() => '?').join(',');
        await pool.query(
            `UPDATE withdrawals SET status = "rejected", failure_reason = ? WHERE id IN (${placeholders})`,
            [reason || 'Bulk rejected by admin', ...ids]
        );

        await pool.query(
            'INSERT INTO audit_logs (user_id, action, severity, details) VALUES (NULL, ?, ?, ?)',
            ['Bulk Reject Withdrawals', 'MEDIUM', `Admin bulk rejected ${ids.length} withdrawals.`]
        );

        res.status(200).json({ message: `${ids.length} withdrawal requests rejected` });
    } catch (error) {
        console.error('Bulk Reject Withdrawals Error:', error);
        res.status(500).json({ message: 'Server error bulk rejecting withdrawals' });
    }
};

// @desc    Update withdrawal status (legacy / manual override)
// @route   PUT /api/admin/withdrawals/:id/status
// @access  Private/Admin
const updateWithdrawalStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'processing', 'paid', 'failed', 'rejected', 'reversed'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        await pool.query('UPDATE withdrawals SET status = ? WHERE id = ?', [status, id]);

        await pool.query(
            'INSERT INTO audit_logs (user_id, action, severity, details) VALUES (NULL, ?, ?, ?)',
            ['Update withdrawal status', 'LOW', `Admin manually updated withdrawal ${id} to ${status}`]
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
    approveWithdrawalAdmin,
    approveBulkWithdrawalsAdmin,
    rejectWithdrawalAdmin,
    rejectBulkWithdrawalsAdmin,
    getWebsiteHits
};