const pool = require('../config/db');

// ── Allowed value constants (single source of truth) ────────────────────────
const ALLOWED_CATEGORIES = ['fraud', 'impersonation', 'harassment', 'inaccurate_information', 'others'];
const ALLOWED_STATUSES   = ['pending', 'reviewed', 'dismissed'];
const ALLOWED_PRIORITIES = ['low', 'medium', 'high'];

// ── Helper: parse evidence_files JSON safely ─────────────────────────────────
const parseEvidenceFiles = (report) => {
    if (report.evidence_files && typeof report.evidence_files === 'string') {
        try {
            report.evidence_files = JSON.parse(report.evidence_files);
        } catch (_) {
            report.evidence_files = [];
        }
    }
    return report;
};

// ── Helper: validate a positive integer ID from route param ──────────────────
const parsePositiveInt = (value) => {
    const n = parseInt(value, 10);
    return Number.isInteger(n) && n > 0 ? n : null;
};

// @desc    Submit a report against a vendor
// @route   POST /api/reports
// @access  Public (anonymous-safe — reporter_id optional)
const submitReport = async (req, res) => {
    try {
        const { reported_vendor_id, category, context, contact_email, phone_number, is_whatsapp } = req.body;

        // Validate required fields
        if (!reported_vendor_id || !category || !context) {
            return res.status(400).json({ message: 'Vendor/Order ID, category, and context are required.' });
        }

        if (!ALLOWED_CATEGORIES.includes(category)) {
            return res.status(400).json({ message: `Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}` });
        }

        // reporter_id is optional (null if not authenticated / anonymous)
        const reporter_id = req.user ? req.user.id : null;

        // Handle uploaded files
        let evidence_files = null;
        if (req.files && req.files.length > 0) {
            evidence_files = JSON.stringify(req.files.map(f => `/uploads/reports/${f.filename}`));
        }

        // Generate a reference number
        const reference_number = `TP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const query = `
            INSERT INTO reports (reference_number, reporter_id, reported_vendor_id, contact_email, phone_number, is_whatsapp, category, context, evidence_files)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [
            reference_number,
            reporter_id,
            reported_vendor_id,
            contact_email || null,
            phone_number || null,
            is_whatsapp === 'true' || is_whatsapp === true ? 1 : 0,
            category,
            context,
            evidence_files
        ]);

        res.status(201).json({
            message: 'Report submitted successfully. Our team will review it shortly.',
            report_id: result.insertId,
            reference_number
        });

    } catch (error) {
        console.error('Report Submit Error:', error);
        res.status(500).json({ message: 'Server error submitting report' });
    }
};

// @desc    Get all reports with server-side filtering & pagination (Admin use)
// @route   GET /api/reports
// @access  Private (Admin only)
const getReports = async (req, res) => {
    try {
        const page     = Math.max(1, parseInt(req.query.page,  10) || 1);
        const limit    = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const offset   = (page - 1) * limit;

        const { status, category, priority } = req.query;

        // Build WHERE clauses dynamically — only add if valid values provided
        const conditions = [];
        const params     = [];

        if (status && ALLOWED_STATUSES.includes(status)) {
            conditions.push('r.status = ?');
            params.push(status);
        }

        if (category && ALLOWED_CATEGORIES.includes(category)) {
            conditions.push('r.category = ?');
            params.push(category);
        }

        if (priority && ALLOWED_PRIORITIES.includes(priority)) {
            conditions.push('r.priority = ?');
            params.push(priority);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Count total matching rows (for pagination metadata)
        const [countRows] = await pool.query(
            `SELECT COUNT(*) AS total FROM reports r ${whereClause}`,
            params
        );
        const total = countRows[0].total;

        // Fetch paginated results
        const [reports] = await pool.query(
            `SELECT r.id, r.reference_number, r.reported_vendor_id, r.contact_email,
                    r.phone_number, r.is_whatsapp, r.category, r.context,
                    r.evidence_files, r.status, r.priority, r.created_at,
                    u.vendor_id AS reporter_vendor_id, u.first_name, u.last_name
             FROM reports r
             LEFT JOIN users u ON r.reporter_id = u.id
             ${whereClause}
             ORDER BY r.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        reports.forEach(parseEvidenceFiles);

        res.status(200).json({ results: reports, total, page, limit });

    } catch (error) {
        console.error('Get Reports Error:', error);
        res.status(500).json({ message: 'Server error fetching reports' });
    }
};

// @desc    Get a single report by ID (Admin use)
// @route   GET /api/reports/:id
// @access  Private (Admin only)
const getReportById = async (req, res) => {
    try {
        const id = parsePositiveInt(req.params.id);
        if (!id) {
            return res.status(400).json({ message: 'Invalid report ID.' });
        }

        const [rows] = await pool.execute(
            `SELECT r.id, r.reference_number, r.reported_vendor_id, r.contact_email,
                    r.phone_number, r.is_whatsapp, r.category, r.context,
                    r.evidence_files, r.status, r.priority, r.created_at,
                    u.vendor_id AS reporter_vendor_id, u.first_name, u.last_name
             FROM reports r
             LEFT JOIN users u ON r.reporter_id = u.id
             WHERE r.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Report not found.' });
        }

        res.status(200).json(parseEvidenceFiles(rows[0]));

    } catch (error) {
        console.error('Get Report By ID Error:', error);
        res.status(500).json({ message: 'Server error fetching report' });
    }
};

// @desc    Get aggregate report stats for overview cards (Admin use)
// @route   GET /api/reports/stats
// @access  Private (Admin only)
const getReportStats = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT
                COUNT(*)                                      AS total,
                SUM(status = 'pending')                       AS pending,
                SUM(status = 'reviewed')                      AS reviewed,
                SUM(status = 'dismissed')                     AS dismissed,
                SUM(priority = 'high')                        AS high_priority,
                SUM(status = 'pending' AND priority = 'high') AS pending_high_priority
             FROM reports`
        );

        const stats = rows[0];

        // Ensure numeric types (MySQL returns strings for SUM)
        res.status(200).json({
            total:               Number(stats.total)               || 0,
            pending:             Number(stats.pending)             || 0,
            reviewed:            Number(stats.reviewed)            || 0,
            dismissed:           Number(stats.dismissed)           || 0,
            highPriority:        Number(stats.high_priority)       || 0,
            pendingHighPriority: Number(stats.pending_high_priority) || 0,
        });

    } catch (error) {
        console.error('Get Report Stats Error:', error);
        res.status(500).json({ message: 'Server error fetching report stats' });
    }
};

// @desc    Update report status and/or priority (Admin use)
// @route   PATCH /api/reports/:id
// @access  Private (Admin only)
const updateReport = async (req, res) => {
    try {
        const id = parsePositiveInt(req.params.id);
        if (!id) {
            return res.status(400).json({ message: 'Invalid report ID.' });
        }

        const { status, priority } = req.body;

        // At least one field must be provided
        if (!status && !priority) {
            return res.status(400).json({ message: 'Provide at least one of: status, priority.' });
        }

        if (status && !ALLOWED_STATUSES.includes(status)) {
            return res.status(400).json({ message: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
        }

        if (priority && !ALLOWED_PRIORITIES.includes(priority)) {
            return res.status(400).json({ message: `Priority must be one of: ${ALLOWED_PRIORITIES.join(', ')}` });
        }

        // Build SET clause dynamically
        const setClauses = [];
        const params     = [];

        if (status) {
            setClauses.push('status = ?');
            params.push(status);
        }

        if (priority) {
            setClauses.push('priority = ?');
            params.push(priority);
        }

        params.push(id);

        const [result] = await pool.execute(
            `UPDATE reports SET ${setClauses.join(', ')} WHERE id = ?`,
            params
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Report not found.' });
        }

        res.status(200).json({ message: 'Report updated successfully.' });

    } catch (error) {
        console.error('Update Report Error:', error);
        res.status(500).json({ message: 'Server error updating report' });
    }
};

module.exports = {
    submitReport,
    getReports,
    getReportById,
    getReportStats,
    updateReport,
};
