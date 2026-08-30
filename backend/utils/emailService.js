const nodemailer = require('nodemailer');
const logger = require('./logger');
require('dotenv').config();

// Initialize transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 465,
    secure: process.env.SMTP_PORT == 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

/**
 * Utility to send an email
 */
const sendEmail = async (to, subject, html) => {
    try {
        if (!to) {
            logger.warn('Email Service Warning: No recipient email provided. Skipping email send.');
            return { success: false, error: 'No recipient provided' };
        }

        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            logger.warn(`Email Service Notice: SMTP credentials missing. Simulating email to ${to}`, { to, subject });
            return { success: true, simulated: true };
        }

        const info = await transporter.sendMail({
            from: `"Onlok" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html
        });
        
        logger.info(`Email successfully sent to ${to}`, { to, subject, messageId: info.messageId });
        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error(`Email Service Error: Failed to send email to ${to}`, { error, to, subject });
        return { success: false, error };
    }
};

module.exports = { sendEmail };
