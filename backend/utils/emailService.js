const nodemailer = require('nodemailer');
require('dotenv').config();

// Initialize transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 465,
    secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

/**
 * Utility to send an email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML body content
 */
const sendEmail = async (to, subject, html) => {
    try {
        if (!to) {
            console.warn('⚠️ No recipient email provided. Skipping email send.');
            return { success: false, error: 'No recipient provided' };
        }

        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn('⚠️ SMTP credentials not provided. Email not sent. Check .env variables: SMTP_USER, SMTP_PASS');
            console.log(`\n--- [SIMULATED EMAIL to ${to}] ---\nSubject: ${subject}\nBody: ${html}\n-----------------------------------\n`);
            return { success: true, simulated: true };
        }

        const info = await transporter.sendMail({
            from: `"Onlok" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html
        });
        
        console.log(`Email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error };
    }
};

module.exports = { sendEmail };
