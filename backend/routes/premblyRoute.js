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

        const data = await premblyRequest('/identitypass/verification/cac', { rc_number: cac, company_name: req.body.company_name || '' });
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

module.exports = router;
