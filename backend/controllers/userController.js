const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { generateVendorId } = require('../utils/generateId');
const { generateQRCode } = require('../utils/qrCodeGenerator');

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
        const { first_name, last_name, business_name, email, password, phone_number, country_code, twitter_handle, instagram_handle, facebook_handle, tiktok_handle } = req.body;

        if (!first_name || !last_name || !business_name || !email || !password || !phone_number) {
            return res.status(400).json({ message: 'Please add all fields' });
        }

        // Check if user exists
        const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Vendor already exists with that email' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user with null vendor_id (will be generated later upon admin approval)
        const query = `
            INSERT INTO users (vendor_id, first_name, last_name, business_name, email, password_hash, phone_number, twitter_handle, instagram_handle, facebook_handle, tiktok_handle) 
            VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [first_name, last_name, business_name, email, hashedPassword, phone_number, twitter_handle || null, instagram_handle || null, facebook_handle || null, tiktok_handle || null]);

        const newUserId = result.insertId;

        res.status(201).json({
            id: newUserId,
            vendor_id: null,
            first_name,
            last_name,
            email,
            token: generateToken(newUserId, 'vendor', null)
        });

    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ 
            message: 'Server error during registration', 
            error: error.message, 
            stack: error.stack 
        });
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
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// @desc    Get user data
// @route   GET /api/users/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, vendor_id, first_name, last_name, business_name, email, phone_number, role, status FROM users WHERE id = ?', [req.user.id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Get Me Error:', error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
};

// @desc    Get all users (vendors)
// @route   GET /api/users
// @access  Public or Admin (Configure as needed)
const getUsers = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, vendor_id, first_name, last_name, business_name, email, phone_number, role, status, created_at FROM users');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Get Users Error:', error);
        res.status(500).json({ message: 'Server error fetching users' });
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

        const { first_name, last_name, business_name, phone_number } = req.body;
        
        // Build query dynamically
        let updates = [];
        let values = [];
        if (first_name) { updates.push('first_name = ?'); values.push(first_name); }
        if (last_name) { updates.push('last_name = ?'); values.push(last_name); }
        if (business_name) { updates.push('business_name = ?'); values.push(business_name); }
        if (phone_number) { updates.push('phone_number = ?'); values.push(phone_number); }

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
        console.error('Delete Error:', error);
        res.status(500).json({ message: 'Server error during deletion' });
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
            referrals,
            withdrawals
        });
    } catch (error) {
        console.error('Get Referrals Error:', error);
        res.status(500).json({ message: 'Server error fetching referrals' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
    getUsers,
    updateUser,
    deleteUser,
    getReferrals
};
