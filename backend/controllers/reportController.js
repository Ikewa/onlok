const pool = require('../config/db');

// @desc    Submit a report against a vendor
// @route   POST /api/reports
// @access  Public (anonymous-safe — reporter_id optional)
const submitReport = async (req, res) => {
    try {
        const { reported_vendor_id, category, context } = req.body;

        // Validate required fields
        if (!reported_vendor_id || !category || !context) {
            return res.status(400).json({ message: 'Vendor ID, category, and context are required.' });
        }

        const allowedCategories = ['fraud', 'impersonation', 'harassment', 'inaccurate_information'];
        if (!allowedCategories.includes(category)) {
            return res.status(400).json({ message: `Category must be one of: ${allowedCategories.join(', ')}` });
        }

        // Verify the reported vendor exists
        const [vendor] = await pool.query('SELECT id FROM users WHERE vendor_id = ?', [reported_vendor_id]);
        if (vendor.length === 0) {
            return res.status(404).json({ message: 'Vendor not found with that Onlok ID.' });
        }

        // reporter_id is optional (null if not authenticated / anonymous)
        const reporter_id = req.user ? req.user.id : null;

        const query = `
            INSERT INTO reports (reporter_id, reported_vendor_id, category, context)
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [reporter_id, reported_vendor_id, category, context]);

        res.status(201).json({
            message: 'Report submitted successfully. Our team will review it shortly.',
            report_id: result.insertId
        });

    } catch (error) {
        console.error('Report Submit Error:', error);
        res.status(500).json({ message: 'Server error submitting report' });
    }
};

// @desc    Get all reports (Admin use)
// @route   GET /api/reports
// @access  Private (Admin only)
const getReports = async (req, res) => {
    try {
        const [reports] = await pool.query(`
            SELECT r.id, r.reported_vendor_id, r.category, r.context, r.status, r.created_at,
                   u.vendor_id AS reporter_vendor_id, u.first_name, u.last_name
            FROM reports r
            LEFT JOIN users u ON r.reporter_id = u.id
            ORDER BY r.created_at DESC
        `);
        res.status(200).json(reports);
    } catch (error) {
        console.error('Get Reports Error:', error);
        res.status(500).json({ message: 'Server error fetching reports' });
    }
};

// @desc    Update report status (Admin use)
// @route   PATCH /api/reports/:id
// @access  Private (Admin only)
const updateReportStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const allowedStatuses = ['pending', 'reviewed', 'dismissed'];

        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({ message: `Status must be one of: ${allowedStatuses.join(', ')}` });
        }

        const [result] = await pool.execute(
            'UPDATE reports SET status = ? WHERE id = ?',
            [status, parseInt(req.params.id)]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Report not found' });
        }

        res.status(200).json({ message: `Report status updated to '${status}'` });
    } catch (error) {
        console.error('Update Report Status Error:', error);
        res.status(500).json({ message: 'Server error updating report status' });
    }
};

module.exports = {
    submitReport,
    getReports,
    updateReportStatus
};
