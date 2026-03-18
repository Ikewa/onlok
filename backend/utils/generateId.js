const pool = require('../config/db');

/**
 * Generates a unique vendor ID like 'OL-NG-1234'
 * @param {string} countryCode - Defaults to 'NG'
 */
const generateVendorId = async (countryCode = 'NG') => {
    try {
        let isUnique = false;
        let newId = '';

        while (!isUnique) {
            // Generate random 4-digit number
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            newId = `OL-${countryCode}-${randomNum}`;

            // Check if exists
            const [rows] = await pool.query('SELECT id FROM users WHERE vendor_id = ?', [newId]);
            
            if (rows.length === 0) {
                isUnique = true;
            }
        }

        return newId;
    } catch (error) {
        console.error('Error generating vendor ID:', error);
        throw error;
    }
};

module.exports = { generateVendorId };
