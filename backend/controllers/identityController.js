const axios = require('axios');
const pool = require('../config/db');
const logger = require('../utils/logger');

const PREMBLY_SECRET = process.env.PREMBLY_SECRET_KEY;
const PREMBLY_BASE_URL = 'https://api.prembly.com/identitypass/verification';

// Verify NIN
const verifyNIN = async (req, res) => {
    try {
        const { nin } = req.body;
        const userId = req.user.id;

        if (!nin) {
            return res.status(400).json({ message: 'NIN is required' });
        }

        const response = await axios.post(
            `${PREMBLY_BASE_URL}/nin_wo_face`,
            { number: nin },
            {
                headers: {
                    'x-api-key': PREMBLY_SECRET,
                    'app-id': process.env.PREMBLY_APP_ID || '',
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.status === true) {
            const ninData = response.data.data;
            
            const [verifications] = await pool.query('SELECT * FROM verifications WHERE user_id = ?', [userId]);
            if (verifications.length > 0) {
                await pool.query('UPDATE verifications SET status = ? WHERE user_id = ?', ['approved', userId]);
            }

            res.status(200).json({ status: true, message: 'NIN Verified Successfully', data: ninData });
        } else {
            res.status(400).json({ status: false, message: 'NIN Verification Failed', error: response.data.message });
        }
    } catch (error) {
        logger.error('NIN Verification Error', { error });
        res.status(500).json({ message: 'Failed to verify NIN', error: error.response?.data || error.message });
    }
};

// Verify CAC
const verifyCAC = async (req, res) => {
    try {
        const { rcNumber, companyName } = req.body;

        if (!rcNumber) {
            return res.status(400).json({ message: 'RC Number is required' });
        }

        const response = await axios.post(
            `${PREMBLY_BASE_URL}/cac`, 
            { rc_number: rcNumber, company_name: companyName },
            {
                headers: {
                    'x-api-key': PREMBLY_SECRET,
                    'app-id': process.env.PREMBLY_APP_ID || '',
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.status === true) {
            res.status(200).json({ status: true, message: 'CAC Verified Successfully', data: response.data.data });
        } else {
            res.status(400).json({ status: false, message: 'CAC Verification Failed', error: response.data.message });
        }
    } catch (error) {
        logger.error('CAC Verification Error', { error });
        res.status(500).json({ message: 'Failed to verify CAC', error: error.response?.data || error.message });
    }
};

module.exports = {
    verifyNIN,
    verifyCAC
};
