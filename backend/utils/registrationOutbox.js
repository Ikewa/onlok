const pool = require('../config/db');
const { sendEmail } = require('./emailService');
const logger = require('./logger');

const processRegistrationOutbox = async () => {
    const connection = await pool.getConnection();
    let event;

    try {
        await connection.beginTransaction();
        const [rows] = await connection.query(
            `SELECT id, event_type, payload, attempts
             FROM registration_outbox
             WHERE processed_at IS NULL AND next_attempt_at <= CURRENT_TIMESTAMP
             ORDER BY id
             LIMIT 1
             FOR UPDATE`,
        );

        if (rows.length === 0) {
            await connection.commit();
            return false;
        }

        event = rows[0];
        await connection.query(
            `UPDATE registration_outbox
             SET attempts = attempts + 1,
                 next_attempt_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 60 SECOND)
             WHERE id = ?`,
            [event.id]
        );
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    try {
        const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
        const [users] = await pool.query('SELECT email FROM users WHERE id = ?', [payload.userId]);
        if (!users[0]?.email) throw new Error('Registration user has no email address');

        const result = await sendEmail(
            users[0].email,
            'Application Received - Dashboard Ready',
            '<p>Your Onlok application was received successfully.</p>'
        );
        if (!result.success) throw new Error(result.error || 'Email delivery failed');

        await pool.query(
            'UPDATE registration_outbox SET processed_at = CURRENT_TIMESTAMP WHERE id = ?',
            [event.id]
        );
        return true;
    } catch (error) {
        logger.warn('Registration outbox event will retry', { error, eventId: event.id });
        return false;
    }
};

module.exports = { processRegistrationOutbox };