const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

const PREMBLY_BASE_URL = 'https://api.prembly.com';

// Helper to make Prembly requests
const premblyRequest = async (endpoint, data) => {
    const PREMBLY_SECRET_KEY = process.env.PREMBLY_SECRET_KEY;
    const PREMBLY_APP_ID = process.env.PREMBLY_APP_ID; // Might be undefined, but we send it if present

    if (!PREMBLY_SECRET_KEY) {
        throw new Error("PREMBLY_SECRET_KEY is not configured in .env");
    }

    const headers = {
        'x-api-key': PREMBLY_SECRET_KEY,
        'Content-Type': 'application/json'
    };
    if (PREMBLY_APP_ID) {
        headers['app-id'] = PREMBLY_APP_ID;
    }

    const response = await axios.post(`${PREMBLY_BASE_URL}${endpoint}`, data, { headers });
    return response.data;
};

// @desc    Verify NIN
// @route   POST /api/admin/prembly/nin
// @access  Private/Admin
router.post('/nin', protect, adminOnly, async (req, res) => {
    try {
        const { nin } = req.body;
        if (!nin) return res.status(400).json({ message: 'NIN is required' });

        const data = await premblyRequest('/identitypass/verification/nin', { number_nin: nin });
        res.json(data);
    } catch (error) {
        console.error('Prembly NIN Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { message: 'Failed to verify NIN' });
    }
});

// @desc    Verify CAC
// @route   POST /api/admin/prembly/cac
// @access  Private/Admin
router.post('/cac', protect, adminOnly, async (req, res) => {
    try {
        const { cac } = req.body;
        if (!cac) return res.status(400).json({ message: 'CAC (RC Number) is required' });

        const payload = { rc_number: cac, company_type: 'RC' };
        if (req.body.company_name) payload.company_name = req.body.company_name;

        const data = await premblyRequest('/identitypass/verification/cac/advance', payload);
        res.json(data);
    } catch (error) {
        console.error('Prembly CAC Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { message: 'Failed to verify CAC' });
    }
});

// @desc    Verify VNIN
// @route   POST /api/admin/prembly/vnin
// @access  Private/Admin
router.post('/vnin', protect, adminOnly, async (req, res) => {
    try {
        const { vnin } = req.body;
        if (!vnin) return res.status(400).json({ message: 'VNIN is required' });

        const data = await premblyRequest('/identitypass/verification/vnin', { number_nin: vnin });
        res.json(data);
    } catch (error) {
        console.error('Prembly VNIN Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { message: 'Failed to verify VNIN' });
    }
});

// @desc    Verify Driver's License
// @route   POST /api/admin/prembly/drivers_license
// @access  Private/Admin
router.post('/drivers_license', protect, adminOnly, async (req, res) => {
    try {
        const { drivers_license } = req.body;
        if (!drivers_license) return res.status(400).json({ message: "Driver's License is required" });

        const data = await premblyRequest('/identitypass/verification/drivers_license', { number: drivers_license });
        res.json(data);
    } catch (error) {
        console.error('Prembly DL Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { message: "Failed to verify Driver's License" });
    }
});

// @desc    Verify Passport
// @route   POST /api/admin/prembly/passport
// @access  Private/Admin
router.post('/passport', protect, adminOnly, async (req, res) => {
    try {
        const { passport, last_name, first_name, dob } = req.body;
        if (!passport) return res.status(400).json({ message: 'Passport number is required' });

        const payload = { number: passport };
        if (last_name) payload.last_name = last_name;
        if (first_name) payload.first_name = first_name;
        if (dob) payload.dob = dob;

        const data = await premblyRequest('/identitypass/verification/passport', payload);
        res.json(data);
    } catch (error) {
        console.error('Prembly Passport Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { message: 'Failed to verify Passport' });
    }
});

module.exports = router;
