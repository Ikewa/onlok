const pool = require('../config/db');

// @desc    Get Vendor Dashboard Data (Status, Badges, Profile)
// @route   GET /api/dashboard
// @access  Private (Vendor only)
const getVendorDashboard = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch User Info
        const [users] = await pool.query('SELECT id, vendor_id, first_name, last_name, business_name, email, phone_number, role, status FROM users WHERE id = ?', [userId]);

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        const user = users[0];

        // Fetch Verification Status
        const [verifications] = await pool.query('SELECT id, status, submitted_at, reviewed_at FROM verifications WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1', [userId]);
        const verification = verifications.length > 0 ? verifications[0] : null;

        // Fetch Badges
        const [badges] = await pool.query('SELECT id, badge_type, issued_at FROM badges WHERE user_id = ?', [userId]);

        // Fetch Profile link and QR Code
        const [profiles] = await pool.query('SELECT profile_link, qr_code_url, views FROM vendor_profiles WHERE user_id = ?', [userId]);
        const profile = profiles.length > 0 ? profiles[0] : null;

        res.status(200).json({
            user,
            verification,
            badges,
            profile,
            notifications: [ // Dummy notifications for now
                { id: 1, message: 'Welcome to Onlok!', read: false, date: new Date() }
            ]
        });

    } catch (error) {
        console.error('Dashboard Fetch Error:', error);
        res.status(500).json({ message: 'Server error fetching dashboard' });
    }
};

// @desc    Search for a vendor publicly
// @route   GET /api/dashboard/search?q=OL001
// @access  Public
const searchVendor = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ message: 'Please provide a search query (Vendor ID or Business Name)' });
        }

        const { page, limit, startIndex } = req.pagination;

        const searchQuery = `%${q}%`;
        const query = `
            SELECT id, vendor_id, first_name, last_name, business_name, status, created_at 
            FROM users 
            WHERE (vendor_id LIKE ? OR business_name LIKE ?) AND role = 'vendor'
            LIMIT ? OFFSET ?
        `;
        const [vendors] = await pool.query(query, [searchQuery, searchQuery, limit, startIndex]);

        if (vendors.length === 0) {
             return res.status(404).json({ message: 'No vendors found matching your query.' });
        }

        // Fetch badges and verification info for found vendors
        for (let vendor of vendors) {
            const [badges] = await pool.query('SELECT badge_type FROM badges WHERE user_id = ?', [vendor.id]);
            vendor.badges = badges.map(b => b.badge_type);
            
            const [verifications] = await pool.query('SELECT reviewed_at FROM verifications WHERE user_id = ? AND status = "approved" ORDER BY reviewed_at DESC LIMIT 1', [vendor.id]);
            vendor.last_verified = verifications.length > 0 ? verifications[0].reviewed_at : null;
        }

        res.status(200).json(vendors);

    } catch (error) {
        console.error('Vendor Search Error:', error);
        res.status(500).json({ message: 'Server error searching for vendors', error: error.message });
    }
};

module.exports = {
    getVendorDashboard,
    searchVendor
};
