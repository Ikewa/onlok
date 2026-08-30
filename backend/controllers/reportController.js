const pool = require('../config/db');
const logger = require('../utils/logger');

// Allowed value constants (single source of truth)
const ALLOWED_CATEGORIES = ['fraud', 'impersonation', 'harassment', 'inaccurate_information', 'others'];
const ALLOWED_STATUSES   = ['pending', 'reviewed', 'dismissed'];
const ALLOWED_PRIORITIES = ['low', 'medium', 'high'];

// Helper: parse evidence_files JSON safely
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

// Helper: validate a positive integer ID from route param
const parsePositiveInt = (value) => {
    const n = parseInt(value, 10);
    return Number.isInteger(n) && n > 0 ? n : null;
};

// Helper: insert a timeline event (fire-and-forget safe)
const addTimelineEvent = async (reportId, eventType, description) => {
    try {
        await pool.execute(
            'INSERT INTO report_timeline (report_id, event_type, description) VALUES (?, ?, ?)',
            [reportId, eventType, description]
        );
    } catch (err) {
        logger.warn('[Timeline] Failed to insert event', { error: err, reportId, eventType });
    }
};

// @desc    Submit a report against a vendor
// @route   POST /api/reports
// @access  Public
const submitReport = async (req, res) => {
    try {
        const { reported_vendor_id, category, context, contact_email, phone_number, is_whatsapp } = req.body;

        if (!reported_vendor_id || !category || !context) {
            return res.status(400).json({ message: 'Vendor/Order ID, category, and context are required.' });
        }

        if (!ALLOWED_CATEGORIES.includes(category)) {
            return res.status(400).json({ message: `Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}` });
        }

        const reporter_id = req.user ? req.user.id : null;

        let evidence_files = null;
        if (req.files && req.files.length > 0) {
            evidence_files = JSON.stringify(req.files.map(f => `/uploads/reports/${f.filename}`));
        }

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

        await addTimelineEvent(
            result.insertId,
            'case_opened',
            'Case opened. System automatically triggered investigation based on submission.'
        );

        res.status(201).json({
            message: 'Report submitted successfully. Our team will review it shortly.',
            report_id: result.insertId,
            reference_number
        });

    } catch (error) {
        logger.error('Report Submit Error', { error });
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

        const [countRows] = await pool.query(
            `SELECT COUNT(*) AS total FROM reports r ${whereClause}`,
            params
        );
        const total = countRows[0].total;

        const [reports] = await pool.query(
            `SELECT r.id, r.reference_number, r.reported_vendor_id, r.contact_email,
                    r.phone_number, r.is_whatsapp, r.category, r.context,
                    r.evidence_files, r.status, r.priority, r.assigned_to, r.created_at,
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
        logger.error('Get Reports Error', { error });
        res.status(500).json({ message: 'Server error fetching reports' });
    }
};

// @desc    Get a single report by ID — includes notes and timeline (Admin use)
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
                    r.evidence_files, r.status, r.priority, r.assigned_to, r.created_at,
                    u.vendor_id AS reporter_vendor_id, u.first_name, u.last_name
             FROM reports r
             LEFT JOIN users u ON r.reporter_id = u.id
             WHERE r.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Report not found.' });
        }

        const report = parseEvidenceFiles(rows[0]);

        const [notes] = await pool.execute(
            `SELECT rn.id, rn.note, rn.created_at,
                    u.first_name AS admin_first_name, u.last_name AS admin_last_name
             FROM report_notes rn
             JOIN users u ON rn.admin_id = u.id
             WHERE rn.report_id = ?
             ORDER BY rn.created_at DESC`,
            [id]
        );

        const [timeline] = await pool.execute(
            `SELECT id, event_type, description, created_at
             FROM report_timeline
             WHERE report_id = ?
             ORDER BY created_at ASC`,
            [id]
        );

        res.status(200).json({ ...report, notes, timeline });

    } catch (error) {
        logger.error('Get Report By ID Error', { error });
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
                SUM(priority = 'high')                        AS \`high_priority\`,
                SUM(status = 'pending' AND priority = 'high') AS \`pending_high_priority\`
             FROM reports`
        );

        const stats = rows[0];

        res.status(200).json({
            total:               Number(stats.total)               || 0,
            pending:             Number(stats.pending)             || 0,
            reviewed:            Number(stats.reviewed)            || 0,
            dismissed:           Number(stats.dismissed)           || 0,
            highPriority:        Number(stats.high_priority)       || 0,
            pendingHighPriority: Number(stats.pending_high_priority) || 0,
        });

    } catch (error) {
        logger.error('Get Report Stats Error', { error });
        res.status(500).json({ message: 'Server error fetching report stats' });
    }
};

// @desc    Update report status, priority, and/or assigned_to (Admin use)
// @route   PATCH /api/reports/:id
// @access  Private (Admin only)
const updateReport = async (req, res) => {
    try {
        const id = parsePositiveInt(req.params.id);
        if (!id) {
            return res.status(400).json({ message: 'Invalid report ID.' });
        }

        const { status, priority, assigned_to } = req.body;

        if (!status && !priority && assigned_to === undefined) {
            return res.status(400).json({ message: 'Provide at least one of: status, priority, assigned_to.' });
        }

        if (status && !ALLOWED_STATUSES.includes(status)) {
            return res.status(400).json({ message: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
        }

        if (priority && !ALLOWED_PRIORITIES.includes(priority)) {
            return res.status(400).json({ message: `Priority must be one of: ${ALLOWED_PRIORITIES.join(', ')}` });
        }

        const sanitisedAssignedTo = assigned_to !== undefined
            ? (String(assigned_to).replace(/<[^>]*>/g, '').trim().slice(0, 200) || null)
            : undefined;

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

        if (sanitisedAssignedTo !== undefined) {
            setClauses.push('assigned_to = ?');
            params.push(sanitisedAssignedTo);
        }

        params.push(id);

        const [result] = await pool.execute(
            `UPDATE reports SET ${setClauses.join(', ')} WHERE id = ?`,
            params
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Report not found.' });
        }

        const adminName = req.user
            ? `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'Admin'
            : 'Admin';

        if (status === 'reviewed') {
            await addTimelineEvent(id, 'status_reviewed', `Case marked as Reviewed by ${adminName}.`);
        } else if (status === 'dismissed') {
            await addTimelineEvent(id, 'status_dismissed', `Case dismissed by ${adminName}.`);
        } else if (status === 'pending') {
            await addTimelineEvent(id, 'status_reopened', `Case re-opened and set to Pending by ${adminName}.`);
        }

        if (priority) {
            await addTimelineEvent(id, 'priority_changed', `Priority updated to ${priority.toUpperCase()} by ${adminName}.`);
        }

        if (sanitisedAssignedTo) {
            await addTimelineEvent(id, 'assigned', `Case assigned to ${sanitisedAssignedTo} by ${adminName}.`);
        }

        res.status(200).json({ message: 'Report updated successfully.' });

    } catch (error) {
        logger.error('Update Report Error', { error });
        res.status(500).json({ message: 'Server error updating report' });
    }
};

// @desc    Add an internal admin note to a report
// @route   POST /api/reports/:id/notes
// @access  Private (Admin only)
const addReportNote = async (req, res) => {
    try {
        const id = parsePositiveInt(req.params.id);
        if (!id) {
            return res.status(400).json({ message: 'Invalid report ID.' });
        }

        const rawNote = req.body.note;
        if (!rawNote || typeof rawNote !== 'string') {
            return res.status(400).json({ message: 'Note text is required.' });
        }

        const note = rawNote.replace(/<[^>]*>/g, '').trim().slice(0, 5000);
        if (note.length === 0) {
            return res.status(400).json({ message: 'Note cannot be empty.' });
        }

        const [check] = await pool.execute('SELECT id FROM reports WHERE id = ?', [id]);
        if (check.length === 0) {
            return res.status(404).json({ message: 'Report not found.' });
        }

        const adminId = req.user.id;

        const [result] = await pool.execute(
            'INSERT INTO report_notes (report_id, admin_id, note) VALUES (?, ?, ?)',
            [id, adminId, note]
        );

        const adminName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'Admin';
        await addTimelineEvent(id, 'note_added', `Internal note added by ${adminName}.`);

        const [rows] = await pool.execute(
            `SELECT rn.id, rn.note, rn.created_at,
                    u.first_name AS admin_first_name, u.last_name AS admin_last_name
             FROM report_notes rn
             JOIN users u ON rn.admin_id = u.id
             WHERE rn.id = ?`,
            [result.insertId]
        );

        res.status(201).json(rows[0]);

    } catch (error) {
        logger.error('Add Report Note Error', { error });
        res.status(500).json({ message: 'Server error adding note' });
    }
};

module.exports = {
    submitReport,
    getReports,
    getReportById,
    getReportStats,
    updateReport,
    addReportNote,
};
