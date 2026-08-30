const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { AVATAR_DIR } = require('../middlewares/uploadMiddleware');
const { generateVendorId } = require('../utils/generateId');
const { generateQRCode } = require('../utils/qrCodeGenerator');
const crypto = require('crypto');
const { sendEmail } = require('../utils/emailService');
const logger = require('../utils/logger');

// Generate JWT
const generateToken = (id, role, vendor_id) => {
    return jwt.sign({ id, role, vendor_id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

// @desc    Register a new vendor
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { first_name, last_name, business_name, email, password, phone_number, business_address, country_code, twitter_handle, instagram_handle, facebook_handle, tiktok_handle, referred_by } = req.body;

        if (!first_name || !last_name || !business_name || !email || !password || !phone_number) {
            return res.status(400).json({ message: 'Please add all fields' });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and symbol.' });
        }

        // Check if user exists
        const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Vendor already exists with that email' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Handle Referral
        let referrerId = null;
        if (referred_by) {
            const [referrerRows] = await pool.query('SELECT id FROM users WHERE vendor_id = ?', [referred_by]);
            if (referrerRows.length > 0) {
                referrerId = referrerRows[0].id;
            }
        }

        // Create user with null vendor_id (will be generated later upon admin approval)
        const query = `
            INSERT INTO users (vendor_id, referred_by, first_name, last_name, business_name, email, password_hash, phone_number, business_address, twitter_handle, instagram_handle, facebook_handle, tiktok_handle) 
            VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [referrerId, first_name, last_name, business_name, email, hashedPassword, phone_number, business_address || null, twitter_handle || null, instagram_handle || null, facebook_handle || null, tiktok_handle || null]);

        const newUserId = result.insertId;

        // If there is a referrer, create a pending referral record
        if (referrerId) {
            await pool.execute(`
                INSERT INTO referrals (referrer_id, referred_user_id, subscription_plan, amount_paid, commission_earned, status)
                VALUES (?, ?, 'Signup', 0.00, 5000.00, 'pending')
            `, [referrerId, newUserId]);
        }


        res.status(201).json({
            id: newUserId,
            vendor_id: null,
            first_name,
            last_name,
            email,
            token: generateToken(newUserId, 'vendor', null)
        });

    } catch (error) {
        logger.error('Registration Error', { error });
        res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
};

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { vendor_id, password } = req.body;

        if (!vendor_id || !password) {
            return res.status(400).json({ message: 'Please provide your Onlok ID and password' });
        }

        // Check if input is email or vendor_id
        let user;
        if (vendor_id.includes('@')) {
            const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [vendor_id]);
            user = rows[0];
        } else {
            const [rows] = await pool.query('SELECT * FROM users WHERE vendor_id = ?', [vendor_id]);
            user = rows[0];
        }

        // Check password
        if (user && (await bcrypt.compare(password, user.password_hash))) {
            res.status(200).json({
                id: user.id,
                vendor_id: user.vendor_id,
                first_name: user.first_name,
                last_name: user.last_name,
                business_name: user.business_name,
                email: user.email,
                role: user.role,
                status: user.status,
                token: generateToken(user.id, user.role, user.vendor_id)
            });
        } else {
            res.status(401).json({ message: 'Invalid Onlok ID / Email or password' });
        }

    } catch (error) {
        logger.error('Login Error', { error });
        res.status(500).json({ message: 'Server error during login', error: error.message });
    }
};

// @desc    Magic Link Login (Auto-login from email)
// @route   POST /api/users/magic-login
// @access  Public
const magicLogin = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ message: 'Token is required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid or expired magic link' });
        }
        
        const user = users[0];
        
        // Generate new session token
        const sessionToken = generateToken(user.id, user.role, user.vendor_id);
        
        res.status(200).json({
            id: user.id,
            vendor_id: user.vendor_id,
            first_name: user.first_name,
            last_name: user.last_name,
            business_name: user.business_name,
            email: user.email,
            role: user.role,
            status: user.status,
            token: sessionToken
        });
    } catch (error) {
        console.error('Magic Login Error:', error);
        res.status(401).json({ message: 'Invalid or expired magic link' });
    }
};

// @desc    Get user data
// @route   GET /api/users/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, vendor_id, first_name, last_name, business_name, email, phone_number, business_address, country, role, status, badge_type, subscription_expires_at, active_subscription_id, profile_picture_url FROM users WHERE id = ?',
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        logger.error('Get Me Error', { error });
        res.status(500).json({ message: 'Server error fetching profile', error: error.message });
    }
};

// @desc    Get all users (vendors)
// @route   GET /api/users
// @access  Public or Admin (Configure as needed)
const getUsers = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, vendor_id, first_name, last_name, business_name, email, phone_number, business_address, country, role, status, created_at FROM users');
        res.status(200).json(rows);
    } catch (error) {
        logger.error('Get Users Error', { error });
        res.status(500).json({ message: 'Server error fetching users', error: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/:id
// @access  Private
const updateUser = async (req, res) => {
    try {
        // Security check: Only allow users to update their own profile unless admin
        if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
            return res.status(403).json({ message: 'Not authorized to update this profile' });
        }

        const { first_name, last_name, business_name, phone_number, business_address, country } = req.body;

        // Build query dynamically
        let updates = [];
        let values = [];
        if (first_name) { updates.push('first_name = ?'); values.push(first_name); }
        if (last_name) { updates.push('last_name = ?'); values.push(last_name); }
        if (business_name) { updates.push('business_name = ?'); values.push(business_name); }
        if (phone_number) { updates.push('phone_number = ?'); values.push(phone_number); }
        if (business_address !== undefined) { updates.push('business_address = ?'); values.push(business_address); }
        if (country !== undefined) { updates.push('country = ?'); values.push(country); }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No valid fields provided for update' });
        }

        const setClause = updates.join(', ');
        values.push(parseInt(req.params.id));

        const query = `UPDATE users SET ${setClause} WHERE id = ?`;
        await pool.execute(query, values);

        res.status(200).json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Update Error:', error);
        res.status(500).json({ message: 'Server error during update' });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private
const deleteUser = async (req, res) => {
    try {
        // Security check: Only admin or the user themselves can delete
        if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
            return res.status(403).json({ message: 'Not authorized to delete this profile' });
        }

        const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [parseInt(req.params.id)]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        logger.error('Delete Error', { error });
        res.status(500).json({ message: 'Server error deleting account', error: error.message });
    }
};

// @desc    Get user referrals and withdrawals
// @route   GET /api/users/referrals
// @access  Private
const getReferrals = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Automatically move pending > 7 days to available
        await pool.query(`
            UPDATE referrals 
            SET status = 'available' 
            WHERE referrer_id = ? 
              AND status = 'pending' 
              AND created_at <= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `, [userId]);

        // 2. Fetch all referrals with user details
        const [referrals] = await pool.query(`
            SELECT r.id, r.subscription_plan, r.amount_paid, r.commission_earned, r.status, r.created_at, 
                   u.business_name, u.first_name, u.last_name
            FROM referrals r
            JOIN users u ON r.referred_user_id = u.id
            WHERE r.referrer_id = ?
            ORDER BY r.created_at DESC
        `, [userId]);

        // 3. Fetch withdrawals
        const [withdrawals] = await pool.query(`
            SELECT id, amount, status, payment_method, created_at 
            FROM withdrawals 
            WHERE user_id = ?
            ORDER BY created_at DESC
        `, [userId]);

        // 4. Calculate stats
        let pendingEarnings = 0;
        let availableEarnings = 0;
        let lifetimeEarnings = 0;
        let totalWithdrawn = 0;
        let pendingWithdrawals = 0;
        let successfulReferrals = 0;

        referrals.forEach(r => {
            if (r.status !== 'cancelled') {
                lifetimeEarnings += parseFloat(r.commission_earned);
                successfulReferrals++;
            }
            if (r.status === 'pending') {
                pendingEarnings += parseFloat(r.commission_earned);
            } else if (r.status === 'available') {
                availableEarnings += parseFloat(r.commission_earned);
            }
        });

        withdrawals.forEach(w => {
            if (w.status === 'paid') {
                totalWithdrawn += parseFloat(w.amount);
            } else if (w.status === 'processing') {
                pendingWithdrawals += parseFloat(w.amount);
            }
        });

        // The current wallet balance is the sum of available referrals minus any withdrawals that are processing or paid
        // Since we are not changing referral status to 'withdrawn' explicitly (unless we want to), it's safer to deduct withdrawals.
        const currentWalletBalance = availableEarnings - totalWithdrawn - pendingWithdrawals;

        // But if we want Available Earnings to show just available minus withdrawals:
        // Actually, let's keep availableEarnings as the gross available, and currentWalletBalance as net available.
        // The spec says: Available Earnings = Sum of all commissions with Available status.
        // So Available Earnings in UI should be the currentWalletBalance if they want to see what they can withdraw.
        const netAvailable = currentWalletBalance > 0 ? currentWalletBalance : 0;

        // 4. Fetch saved user bank details
        const [userRows] = await pool.query(
            'SELECT bank_code, bank_name, account_number, account_name FROM users WHERE id = ?',
            [userId]
        );
        const bankDetails = userRows.length > 0 ? userRows[0] : null;

        res.status(200).json({
            stats: {
                totalReferrals: referrals.length,
                successfulReferrals,
                pendingEarnings,
                availableEarnings: netAvailable,
                lifetimeEarnings,
                totalWithdrawn,
                pendingWithdrawals,
                currentWalletBalance: netAvailable
            },
            bankDetails,
            referrals,
            withdrawals
        });
    } catch (error) {
        logger.error('Get Referrals Error', { error });
        res.status(500).json({ message: 'Failed to fetch referral performance metrics.' });
    }
};

// ─── MAGIC BYTES for image validation (Layer 2 security) ────────────────────
const MAGIC_BYTES = [
    { bytes: [0xFF, 0xD8, 0xFF], type: 'jpeg' },           // JPEG
    { bytes: [0x89, 0x50, 0x4E, 0x47], type: 'png' },      // PNG
    { bytes: [0x52, 0x49, 0x46, 0x46], type: 'webp' },     // WebP (RIFF header)
];

const isValidImageMagicBytes = (filePath) => {
    try {
        const buf = Buffer.alloc(4);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buf, 0, 4, 0);
        fs.closeSync(fd);
        return MAGIC_BYTES.some(({ bytes }) => bytes.every((b, i) => buf[i] === b));
    } catch {
        return false;
    }
};

// ─── Safe old-file deletion ───────────────────────────────────────────────────
const safeDeleteOldAvatar = (oldUrl) => {
    if (!oldUrl) return;
    // Only delete files that live inside uploads/avatars/ — never anything else
    if (!oldUrl.startsWith('/uploads/avatars/')) return;
    const filename = path.basename(oldUrl);
    // Reject any filename containing path traversal characters
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return;
    const fullPath = path.join(AVATAR_DIR, filename);
    // Final absolute-path check ensures we stay inside AVATAR_DIR
    if (!fullPath.startsWith(AVATAR_DIR)) return;
    fs.unlink(fullPath, (err) => {
        try {
            if (err && err.code !== 'ENOENT') {
                logger.warn('Failed to delete old avatar file', { error: err });
            }
        } catch (err) {
            logger.warn('Failed to delete old avatar file', { error: err });
        }
    });
};

// @desc    Upload / update profile picture
// @route   POST /api/users/me/avatar
// @access  Private
const uploadProfilePicture = async (req, res) => {
    const uploadedFilePath = req.file ? req.file.path : null;

    try {
        // 1. Multer should have set req.file — guard just in case
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided.' });
        }

        // 2. Magic bytes check (Layer 2 — defeats polyglot/renamed files)
        if (!isValidImageMagicBytes(uploadedFilePath)) {
            fs.unlink(uploadedFilePath, () => { });
            return res.status(400).json({ message: 'Invalid image file. Only JPEG, PNG, and WebP are accepted.' });
        }

        // 3. Per-user rate limit: reject if profile was updated within last 60 seconds
        const [userRows] = await pool.query(
            'SELECT updated_at, profile_picture_url FROM users WHERE id = ?',
            [req.user.id]
        );
        if (userRows.length === 0) {
            fs.unlink(uploadedFilePath, () => { });
            return res.status(404).json({ message: 'User not found.' });
        }
        const { updated_at, profile_picture_url: oldUrl } = userRows[0];
        const secondsSinceUpdate = (Date.now() - new Date(updated_at).getTime()) / 1000;
        if (secondsSinceUpdate < 60) {
            fs.unlink(uploadedFilePath, () => { });
            return res.status(429).json({ message: 'Please wait a moment before uploading another picture.' });
        }

        // 4. Resize to 400×400 with sharp and save as JPEG — replace the temp file
        const finalFilename = path.basename(uploadedFilePath);
        const finalPath = path.join(AVATAR_DIR, finalFilename);

        await sharp(uploadedFilePath)
            .resize(400, 400, { fit: 'cover', position: 'center' })
            .jpeg({ quality: 85 })
            .toFile(finalPath + '.tmp');

        // Atomically replace original with resized version
        fs.unlinkSync(uploadedFilePath);
        fs.renameSync(finalPath + '.tmp', finalPath);

        const profilePictureUrl = `/uploads/avatars/${finalFilename}`;

        // 5. Safe-delete the old avatar
        safeDeleteOldAvatar(oldUrl);

        // 6. Persist new URL to DB
        await pool.execute(
            'UPDATE users SET profile_picture_url = ? WHERE id = ?',
            [profilePictureUrl, req.user.id]
        );

        res.status(200).json({ profile_picture_url: profilePictureUrl });

    } catch (error) {
        logger.error('Upload Profile Picture Error', { error });
        res.status(500).json({ message: 'Server error uploading profile picture', error: error.message });
    }
};

// @desc    Forgot Password
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Please provide an email' });

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            // Return 200 to prevent email enumeration
            return res.status(200).json({ message: 'If that email is in our system, a reset link has been sent.' });
        }

        const user = users[0];

        // Generate reset token (random hex string)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = Date.now() + 3600000; // 1 hour from now

        await pool.execute(
            'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?',
            [resetToken, resetTokenExpires, user.id]
        );

        // Create reset URL (assuming frontend runs on same domain or env var)
        const frontendUrl = process.env.FRONTEND_URL || 'https://app.onlok.net';
        const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

        const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #0F172A;">Password Reset Request</h2>
                <p>Hi ${user.first_name},</p>
                <p>You requested a password reset. Click the button below to set a new password:</p>
                <a href="${resetUrl}" style="padding: 10px 15px; background: #0F172A; color: #fff; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Reset Password</a>
                <p>If you didn't request this, please ignore this email.</p>
                <p style="font-size: 0.8rem; color: #666;">This link is valid for 1 hour.</p>
            </div>
        `;

        await sendEmail(user.email, 'Password Reset - Onlok', emailHtml);

        res.status(200).json({ message: 'If that email is in our system, a reset link has been sent.' });
    } catch (error) {
        logger.error('Forgot Password Error', { error });
        res.status(500).json({ message: 'Failed to process forgot password request' });
    }
};

// @desc    Reset Password
// @route   PUT /api/users/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!password || !passwordRegex.test(password)) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and symbol.' });
        }

        const [users] = await pool.query(
            'SELECT * FROM users WHERE reset_password_token = ? AND reset_password_expires > ?',
            [token, Date.now()]
        );

        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired password reset token.' });
        }

        const user = users[0];

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update user
        await pool.execute(
            'UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?',
            [hashedPassword, user.id]
        );

        res.status(200).json({ message: 'Password has been successfully reset. You can now log in.' });
    } catch (error) {
        logger.error('Reset Password Error', { error });
        res.status(500).json({ message: 'Failed to reset password' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    magicLogin,
    getMe,
    getUsers,
    updateUser,
    deleteUser,
    getReferrals,
    uploadProfilePicture,
    forgotPassword,
    resetPassword,
};
