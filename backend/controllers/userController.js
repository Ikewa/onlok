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
        const { first_name, last_name, business_name, email, password, phone_number, country_code } = req.body;

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

        // Generate ID
        const vendor_id = await generateVendorId(country_code || 'NG');

        // Create user
        const query = `
            INSERT INTO users (vendor_id, first_name, last_name, business_name, email, password_hash, phone_number) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [vendor_id, first_name, last_name, business_name, email, hashedPassword, phone_number]);

        const newUserId = result.insertId;

        // Generate Profile Link and QR Code
        // Assuming frontend will be hosted on domain.com/profile/OLXXX
        const profileLink = `https://onlok.com/profile/${vendor_id}`;
        const qrCodeUrl = await generateQRCode(profileLink);

        // Insert Vendor Profile
        const profileQuery = `INSERT INTO vendor_profiles (user_id, profile_link, qr_code_url) VALUES (?, ?, ?)`;
        await pool.execute(profileQuery, [newUserId, profileLink, qrCodeUrl]);

        res.status(201).json({
            id: newUserId,
            vendor_id: vendor_id,
            first_name,
            last_name,
            email,
            profileLink,
            qrCodeUrl,
            token: generateToken(newUserId, 'vendor', vendor_id)
        });

    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server error during registration' });
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

        // Find User by vendor_id
        const [rows] = await pool.query('SELECT * FROM users WHERE vendor_id = ?', [vendor_id]);
        const user = rows[0];

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
            res.status(401).json({ message: 'Invalid Onlok ID or password' });
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

module.exports = {
    registerUser,
    loginUser,
    getMe,
    getUsers,
    updateUser,
    deleteUser
};
