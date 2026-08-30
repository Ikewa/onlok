const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const paystackService = require('../utils/paystackService');
const paystackPlanService = require('../utils/paystackPlanService');
const { generateVendorId } = require('../utils/generateId');
const { generateQRCode } = require('../utils/qrCodeGenerator');
const { sendEmail } = require('../utils/emailService');
const logger = require('../utils/logger');

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
        logger.error('Admin Login Error', { error });
        res.status(500).json({ message: 'Server error during admin login' });
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
        logger.error('Admin Queue Error', { error });
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
                   v.gov_id_status, v.gov_id_notes,
                   v.cac_status, v.cac_notes,
                   v.video_status, v.video_notes,
                   CASE 
                     WHEN v.status = 'flagged' OR u.status = 'suspended' THEN 'flagged'
                     ELSE v.status 
                   END as status,
                   v.assigned_tier, v.payment_status,
                   v.admin_notes, v.submitted_at, v.reviewed_at,
                   u.id as user_id, u.first_name, u.last_name, u.email, u.vendor_id, u.business_name,
                   u.phone_number, u.business_address, u.country,
                   u.twitter_handle, u.instagram_handle, u.facebook_handle, u.tiktok_handle,
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
        logger.error('Admin Details Error', { error });
        res.status(500).json({ message: 'Server error fetching verification details' });
    }
};

// @desc    Update verification status
// @route   PUT /api/admin/verifications/:id/status
// @access  Private/Admin
const updateVerificationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            status,
            notes,
            assigned_tier,
            gov_id_status,
            gov_id_notes,
            cac_status,
            cac_notes,
            video_status,
            video_notes
        } = req.body; 

        if (!['approved', 'rejected', 'flagged', 'pending', 'tier_assigned', 'payment_received', 'revoked'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Check if verification exists
        const [verifications] = await pool.query(`
            SELECT v.user_id, v.status, v.assigned_tier, u.email, u.first_name 
            FROM verifications v 
            JOIN users u ON v.user_id = u.id 
            WHERE v.id = ?
        `, [id]);
        if (verifications.length === 0) {
            return res.status(404).json({ message: 'Verification not found' });
        }
        
        const verification = verifications[0];
        const finalTier = assigned_tier || verification.assigned_tier || '';
        
        // Update verifications table (including per-document feedback)
        const updateQuery = `
            UPDATE verifications 
            SET status = ?, 
                admin_notes = ?, 
                assigned_tier = IFNULL(?, assigned_tier),
                gov_id_status = IFNULL(?, gov_id_status),
                gov_id_notes = IFNULL(?, gov_id_notes),
                cac_status = IFNULL(?, cac_status),
                cac_notes = IFNULL(?, cac_notes),
                video_status = IFNULL(?, video_status),
                video_notes = IFNULL(?, video_notes),
                reviewed_at = CURRENT_TIMESTAMP, 
                reviewed_by = ? 
            WHERE id = ?
        `;
        await pool.query(updateQuery, [
            status,
            notes || null,
            assigned_tier || null,
            gov_id_status || null,
            gov_id_notes || null,
            cac_status || null,
            cac_notes || null,
            video_status || null,
            video_notes || null,
            req.user.id,
            id
        ]);

        // Auto-pause/cancel Paystack subscriptions if account is flagged (suspended) or rejected
        if (status === 'flagged' || status === 'rejected') {
            try {
                const [activeSubs] = await pool.query(
                    'SELECT id, paystack_subscription_code, paystack_email_token FROM subscriptions WHERE user_id = ? AND status = "active"',
                    [verification.user_id]
                );

                for (const sub of activeSubs) {
                    if (sub.paystack_subscription_code) {
                        try {
                            await paystackPlanService.disablePaystackSubscription(
                                sub.paystack_subscription_code,
                                sub.paystack_email_token
                            );
                        } catch (pErr) {
                            logger.warn('[Admin] Could not disable Paystack subscription', { error: pErr, userId: id });
                        }
                    }
                    const newSubStatus = status === 'flagged' ? 'suspended' : 'cancelled';
                    await pool.query('UPDATE subscriptions SET status = ? WHERE id = ?', [newSubStatus, sub.id]);
                }
            } catch (subErr) {
                logger.error('[Admin] Error processing subscription cancellation on status update', { error: subErr, userId: id });
            }
        }

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
        } else if (status === 'revoked') {
            // When revoked, the user is downgraded to pending and their badge is removed, 
            // but the verifications table keeps status 'revoked' so we know they were revoked and need to pay/reverify.
            await pool.query(`UPDATE users SET status = 'pending' WHERE id = ?`, [verification.user_id]);
            await pool.query(`DELETE FROM badges WHERE user_id = ? AND badge_type = "verified_vendor"`, [verification.user_id]);
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
        if (status === 'revoked') actionText = 'Revoked verification';

        await pool.query(
            'INSERT INTO audit_logs (user_id, action, severity, details) VALUES (?, ?, ?, ?)',
            [verification.user_id, actionText, severity, notes || `Admin manually ${status} user`]
        );

        // Helper for formatting document feedback list in email
        const renderDocBreakdown = () => {
            const items = [];
            if (gov_id_status) {
                const label = gov_id_status === 'approved' ? '✅ Approved' : gov_id_status === 'rejected' ? '❌ Rejected' : '⚠️ Pending';
                items.push(`<li><strong>Government ID:</strong> ${label} ${gov_id_notes ? `- <em>${gov_id_notes}</em>` : ''}</li>`);
            }
            if (cac_status) {
                const label = cac_status === 'approved' ? '✅ Approved' : cac_status === 'rejected' ? '❌ Rejected' : '⚠️ Pending';
                items.push(`<li><strong>CAC Document:</strong> ${label} ${cac_notes ? `- <em>${cac_notes}</em>` : ''}</li>`);
            }
            if (video_status) {
                const label = video_status === 'approved' ? '✅ Approved' : video_status === 'rejected' ? '❌ Rejected' : '⚠️ Pending';
                items.push(`<li><strong>Business Video:</strong> ${label} ${video_notes ? `- <em>${video_notes}</em>` : ''}</li>`);
            }
            if (items.length === 0) return '';
            return `<div style="margin: 15px 0; background: #F8FAFC; padding: 12px; border-radius: 6px; border: 1px solid #E2E8F0;"><strong style="color: #0F172A;">Document Breakdown:</strong><ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px;">${items.join('')}</ul></div>`;
        };

        // Send email notifications
        if (status === 'approved') {
            const html = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #10B981;">Account Fully Approved!</h2>
                    <p>Hi ${verification.first_name},</p>
                    <p>Great news! Your account verification has been successfully approved.</p>
                    <p>Welcome to the <strong>${finalTier.charAt(0).toUpperCase() + finalTier.slice(1)}</strong> tier! Your new verified vendor badge is now live on your profile.</p>
                    ${renderDocBreakdown()}
                    <p>You can now log in and access all features of your vendor portal.</p>
                    <a href="${process.env.FRONTEND_URL || 'https://app.onlok.net'}/login" style="padding: 10px 15px; background: #0F172A; color: #fff; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Log In to Onlok</a>
                    <br/><br/>
                    <p>Best regards,<br/><strong>The Onlok Team</strong></p>
                </div>
            `;
            await sendEmail(verification.email, 'Your Onlok Account has been Approved', html);
        } else if (status === 'tier_assigned') {
            const token = jwt.sign({ id: verification.user_id }, process.env.JWT_SECRET, { expiresIn: '24h' });
            const magicLink = `${process.env.FRONTEND_URL || 'https://app.onlok.net'}/magic-login?token=${token}`;
            const html = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #0029FF;">Verification Pre-Approved!</h2>
                    <p>Hi ${verification.first_name},</p>
                    <p>Your documents have been reviewed and you have been approved for the <strong>${finalTier}</strong> tier.</p>
                    ${renderDocBreakdown()}
                    <p>Click the button below to securely log in to your dashboard and complete your subscription payment to finalize your verification.</p>
                    <a href="${magicLink}" style="padding: 10px 15px; background: #0029FF; color: #fff; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Go to Dashboard</a>
                    <br/><br/>
                    <p>Best regards,<br/><strong>The Onlok Team</strong></p>
                </div>
            `;
            await sendEmail(verification.email, 'Action Required: Complete Your Verification - Onlok', html);
        } else if (status === 'pending' && (notes || gov_id_status || cac_status || video_status)) {
            const html = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #D97706;">Action Required: Information Requested</h2>
                    <p>Hi ${verification.first_name},</p>
                    <p>An admin has reviewed your verification submission and requested additional information:</p>
                    ${notes ? `
                    <div style="background: #FEFCE8; border-left: 4px solid #CA8A04; padding: 15px; margin: 15px 0; color: #854D0E; font-size: 14px;">
                        <strong>Admin Message:</strong><br/>
                        ${notes}
                    </div>` : ''}
                    ${renderDocBreakdown()}
                    <p>Please log into your dashboard to update your profile or resubmit requested documents.</p>
                    <a href="${process.env.FRONTEND_URL || 'https://app.onlok.net'}/dashboard/verification" style="padding: 10px 15px; background: #D97706; color: #fff; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Go to Verification Page</a>
                    <br/><br/>
                    <p>Best regards,<br/><strong>The Onlok Team</strong></p>
                </div>
            `;
            await sendEmail(verification.email, 'Action Required: Information Requested by Admin - Onlok', html);
        } else if (status === 'rejected' || status === 'flagged' || status === 'revoked') {
            const html = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #EF4444;">Account Update</h2>
                    <p>Hi ${verification.first_name},</p>
                    <p>Your account verification status has been marked as <strong>${status}</strong>.</p>
                    ${status === 'revoked' ? '<p>Please log in to your dashboard to complete payment or re-verify your account to restore your access.</p>' : ''}
                    ${notes ? `<p><strong>Admin Notes:</strong> ${notes}</p>` : ''}
                    ${renderDocBreakdown()}
                    <br/><br/>
                    <p>Best regards,<br/><strong>The Onlok Team</strong></p>
                </div>
            `;
            await sendEmail(verification.email, `Account Verification ${status.charAt(0).toUpperCase() + status.slice(1)} - Onlok`, html);
        }

        res.status(200).json({ message: `Verification ${status} successfully` });
    } catch (error) {
        logger.error('Admin Status Update Error', { error });
        res.status(500).json({ message: 'Server error updating status' });
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


        const [users] = await pool.query(`
            SELECT u.id, u.vendor_id, u.first_name, u.last_name, u.email, u.role, u.status, 
                   u.created_at, u.subscription_expires_at, s.tier, s.plan_name, s.status as subscription_status, s.next_payment_date 
            FROM users u
            LEFT JOIN subscriptions s ON u.active_subscription_id = s.id
            WHERE u.role != "admin"
            ORDER BY u.created_at DESC 
            LIMIT 50
        `);

        // Query revenue metrics from subscriptions
        const [totalRevResult] = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM subscriptions 
            WHERE status IN ('active', 'completed')
        `);
        const [yesterdayRevResult] = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM subscriptions 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) AND status IN ('active', 'completed')
        `);

        const totalRevenue = parseFloat(totalRevResult[0]?.total) || 0;
        const revenueFromYesterday = parseFloat(yesterdayRevResult[0]?.total) || 0;

        res.status(200).json({
            metrics: {
                totalUsers: usersCount[0].total,
                pendingVerifications: pendingCount[0].total,
                approvedVendors: approvedCount[0].total,
                flaggedAccounts: flaggedCount[0].total,
                rejectedVerifications: rejectedCount[0].total,
                totalRevenue,
                revenueFromYesterday
            },
            userTrends,
            users
        });
    } catch (error) {
        logger.error('Admin Dashboard Error', { error });
        res.status(500).json({ message: 'Server error fetching admin dashboard metrics' });
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
        logger.error('Admin Alerts Error', { error });
        res.status(500).json({ message: 'Server error fetching admin alerts' });
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
        logger.error('Admin Settings Fetch Error', { error });
        res.status(500).json({ message: 'Failed to fetch admin settings' });
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
        logger.error('Admin Settings Update Error', { error });
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
        logger.error('Admin Referrals Fetch Error', { error });
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
        logger.error('Admin Withdrawals Fetch Error', { error });
        res.status(500).json({ message: 'Server error fetching withdrawals' });
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
            logger.error(`Paystack Transfer Error for withdrawal #${id}`, { error: paystackErr, withdrawalId: id });
            await pool.query('UPDATE withdrawals SET failure_reason = ? WHERE id = ?', [paystackErr.message || 'Paystack Transfer Error', id]);
            return res.status(500).json({ message: `Paystack Transfer Failed: ${paystackErr.response?.data?.message || paystackErr.message}` });
        }
    } catch (error) {
        logger.error('Approve Withdrawal Admin Error', { error });
        res.status(500).json({ message: 'Server error approving withdrawal' });
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
        let approvedCount = 0;

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
                            approvedCount++;
                        } else {
                            await pool.query(
                                `UPDATE withdrawals SET status = 'failed', failure_reason = ? WHERE id = ?`,
                                [item.message || 'Paystack bulk transfer item failed', matchedWithdrawal.id]
                            );
                        }
                    }
                }
            } catch (bulkErr) {
                logger.error('Paystack Bulk Transfer Error', { error: bulkErr });
            }

            // Wait 5 seconds between batches if more remain to comply with Paystack rate limits
            if (i + BATCH_SIZE < validWithdrawals.length) {
                await new Promise((res) => setTimeout(res, 5000));
            }
        }

        await pool.query(
            'INSERT INTO audit_logs (user_id, action, severity, details) VALUES (NULL, ?, ?, ?)',
            ['Bulk Approve Withdrawals', 'HIGH', `Admin bulk approved withdrawals via Paystack.`]
        );

        res.status(200).json({
            message: `Processed ${ids.length} withdrawal(s). Approved: ${approvedCount}. Failed/Pending: ${ids.length - approvedCount}`
        });

    } catch (error) {
        logger.error('Bulk Approve Withdrawals Error', { error });
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
        logger.error('Reject Withdrawal Error', { error });
        res.status(500).json({ message: 'Server error rejecting withdrawal' });
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
        logger.error('Bulk Reject Withdrawals Error', { error });
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
        logger.error('Admin Update Withdrawal Error', { error });
        res.status(500).json({ message: 'Server error updating withdrawal' });
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
        logger.error('Admin Website Hits Fetch Error', { error });
        res.status(500).json({ message: 'Server error fetching website hit analytics' });
    }
};

// @desc    Check and sync status of a withdrawal transfer directly with Paystack
// @route   POST /api/admin/withdrawals/:id/sync-status
// @access  Private/Admin
const syncWithdrawalStatusAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(
            `SELECT id, status, transfer_reference, transfer_code, amount, failure_reason FROM withdrawals WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Withdrawal request not found' });
        }

        const w = rows[0];
        const refToVerify = w.transfer_reference || w.transfer_code;

        if (!refToVerify) {
            return res.status(400).json({ message: `Withdrawal #${id} has no transfer reference to verify on Paystack` });
        }

        try {
            const paystackRes = await paystackService.verifyTransfer(refToVerify);
            const data = paystackRes.data || {};
            const pStatus = (data.status || '').toLowerCase(); // 'success', 'failed', 'pending', 'reversed'

            let newStatus = w.status;
            let failureMsg = w.failure_reason;

            if (pStatus === 'success') {
                newStatus = 'paid';
                failureMsg = null;
            } else if (pStatus === 'failed' || pStatus === 'reversed') {
                newStatus = 'failed';
                failureMsg = data.gateway_response || data.reason || `Transfer ${pStatus} on Paystack`;
            } else if (pStatus === 'processing' || pStatus === 'pending') {
                newStatus = 'processing';
            }

            await pool.query(
                `UPDATE withdrawals SET status = ?, failure_reason = ?, transfer_code = COALESCE(?, transfer_code) WHERE id = ?`,
                [newStatus, failureMsg, data.transfer_code || null, id]
            );

            await pool.query(
                'INSERT INTO audit_logs (user_id, action, severity, details) VALUES (NULL, ?, ?, ?)',
                ['Sync Withdrawal Status', 'LOW', `Admin synced status for withdrawal #${id}. Paystack status: ${data.status} -> DB status: ${newStatus}`]
            );

            res.status(200).json({ status: true, message: `Sync completed for withdrawal #${id}`, withdrawal: rows[0] });
        } catch (pErr) {
            logger.error(`Paystack verifyTransfer error for withdrawal #${id}`, { error: pErr, withdrawalId: id });
            return res.status(400).json({ status: false, message: 'Server error syncing withdrawal status', error: pErr.message });
        }
    } catch (error) {
        logger.error('Sync Withdrawal Status Admin Error', { error });
        res.status(500).json({ status: false, message: 'Server error syncing withdrawal status', error: error.message });
    }
};

// @desc    Get all payments & subscriptions for admin dashboard with search & metrics
// @route   GET /api/admin/payments
// @access  Private (Admin only)
const getPaymentsAdmin = async (req, res) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const offset = (page - 1) * limit;

        const { q, status, tier } = req.query;

        // Base query conditions
        const conditions = [];
        const params = [];

        if (q && q.trim()) {
            const searchTerm = `%${q.trim()}%`;
            conditions.push('(u.vendor_id LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR s.paystack_subscription_code LIKE ? OR s.paystack_plan_code LIKE ?)');
            params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (status && status !== 'all') {
            conditions.push('s.status = ?');
            params.push(status);
        }

        if (tier && tier !== 'all') {
            conditions.push('s.tier = ?');
            params.push(tier.toLowerCase());
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Aggregate Summary Metrics
        const [metricsRows] = await pool.query(`
            SELECT 
                COALESCE(SUM(amount), 0)                                      AS total_volume,
                COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0)    AS active_count,
                COALESCE(SUM(CASE WHEN status = 'attention' THEN 1 ELSE 0 END), 0) AS attention_count,
                COALESCE(SUM(CASE WHEN status IN ('cancelled', 'expired') THEN 1 ELSE 0 END), 0) AS inactive_count
            FROM subscriptions
        `);

        const metrics = metricsRows[0] || { total_volume: 0, active_count: 0, attention_count: 0, inactive_count: 0 };

        // Total matching count for pagination
        const [countRows] = await pool.query(
            `SELECT COUNT(*) AS total 
             FROM subscriptions s
             JOIN users u ON s.user_id = u.id
             ${whereClause}`,
            params
        );
        const total = countRows[0]?.total || 0;

        // Fetch paginated subscriptions with user & verification data
        const [rows] = await pool.query(
            `SELECT 
                s.id AS subscription_id,
                s.user_id,
                s.tier,
                s.plan_name,
                s.billing_cycle,
                s.amount,
                s.status,
                s.paystack_subscription_code,
                s.paystack_plan_code,
                s.paystack_authorization_code,
                s.paystack_customer_code,
                s.next_payment_date,
                s.created_at,
                s.updated_at,
                u.vendor_id,
                u.first_name,
                u.last_name,
                u.email,
                u.business_name,
                u.status AS user_status,
                u.profile_picture_url,
                v.payment_reference
             FROM subscriptions s
             JOIN users u ON s.user_id = u.id
             LEFT JOIN verifications v ON v.id = (SELECT id FROM verifications WHERE user_id = u.id ORDER BY submitted_at DESC LIMIT 1)
             ${whereClause}
             ORDER BY s.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.status(200).json({
            results: rows,
            total,
            page,
            limit,
            metrics: {
                totalVolume: Number(metrics.total_volume) || 0,
                activeCount: Number(metrics.active_count) || 0,
                attentionCount: Number(metrics.attention_count) || 0,
                inactiveCount: Number(metrics.inactive_count) || 0
            }
        });

    } catch (error) {
        logger.error('Admin Payments Fetch Error', { error });
        res.status(500).json({ message: 'Server error fetching payments list' });
    }
};

// @desc    Admin manual sync payment / subscription status with Paystack
// @route   POST /api/admin/payments/:id/sync
// @access  Private (Admin only)
const syncPaymentAdmin = async (req, res) => {
    try {
        const subId = parseInt(req.params.id, 10);
        if (!subId) {
            return res.status(400).json({ message: 'Invalid subscription ID' });
        }

        const [subs] = await pool.query(
            'SELECT s.*, u.email FROM subscriptions s JOIN users u ON s.user_id = u.id WHERE s.id = ?',
            [subId]
        );

        if (subs.length === 0) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        const sub = subs[0];
        const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
        if (!PAYSTACK_SECRET) {
            return res.status(500).json({ message: 'PAYSTACK_SECRET_KEY missing in server environment' });
        }

        let updatedStatus = sub.status;
        let paystackDetails = null;

        if (sub.paystack_subscription_code) {
            try {
                const response = await axios.get(
                    `https://api.paystack.co/subscription/${encodeURIComponent(sub.paystack_subscription_code)}`,
                    { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
                );
                paystackDetails = response.data?.data;
                if (paystackDetails) {
                    const psStatus = paystackDetails.status;
                    updatedStatus = psStatus === 'active' ? 'active' : psStatus === 'disabled' ? 'cancelled' : 'attention';
                }
            } catch (pErr) {
                logger.warn(`Admin Payment Sync Warning for sub #${subId}`, { error: pErr });
            }
        }

        await pool.query('UPDATE subscriptions SET status = ? WHERE id = ?', [updatedStatus, subId]);
        if (updatedStatus === 'active') {
            await pool.query('UPDATE users SET status = "verified" WHERE id = ?', [sub.user_id]);
            await pool.query('UPDATE verifications SET payment_status = "paid", status = "payment_received" WHERE user_id = ?', [sub.user_id]);
        }

        await pool.query(
            'INSERT INTO audit_logs (user_id, action, severity, details) VALUES (?, ?, ?, ?)',
            [req.user.id, 'Sync Payment Admin', 'LOW', `Admin synced payment #${subId} (Status: ${updatedStatus})`]
        );

        const [updatedRows] = await pool.query(
            'SELECT s.*, u.vendor_id, u.first_name, u.last_name, u.email FROM subscriptions s JOIN users u ON s.user_id = u.id WHERE s.id = ?',
            [subId]
        );

        res.status(200).json({
            status: true,
            message: `Subscription #${subId} synced successfully (Status: ${updatedStatus.toUpperCase()})`,
            subscription: updatedRows[0],
            paystackDetails
        });

    } catch (error) {
        logger.error('Sync Payment Admin Error', { error });
        res.status(500).json({ message: 'Failed to sync payment status with Paystack', error: error.message });
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
    syncWithdrawalStatusAdmin,
    getWebsiteHits,
    getPaymentsAdmin,
    syncPaymentAdmin
};
