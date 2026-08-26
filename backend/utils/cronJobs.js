const cron = require('node-cron');
const pool = require('../config/db');
const { sendEmail } = require('./emailService');
const logger = require('./logger');
require('dotenv').config();

const checkExpiringSubscriptions = async () => {
    try {
        logger.info('[CRON] Running daily check for expiring subscriptions...');
        
        const intervals = [30, 7, 5, 3, 1, 0];
        const counts = {};

        for (const daysLeft of intervals) {
            const [expiring] = await pool.query(`
                SELECT u.email, u.first_name, u.business_name, s.next_payment_date as end_date, s.tier as plan_type 
                FROM subscriptions s
                JOIN users u ON s.user_id = u.id
                WHERE s.status = 'active'
                AND DATE(s.next_payment_date) = CURDATE() + INTERVAL ? DAY
            `, [daysLeft]);

            counts[daysLeft] = expiring.length;

            for (let sub of expiring) {
                let title, message;
                if (daysLeft === 0) {
                    title = 'Urgent: Your Onlok Subscription Expires Today';
                    message = `Your <strong>${sub.plan_type.charAt(0).toUpperCase() + sub.plan_type.slice(1)}</strong> Onlok subscription is expiring <strong>today</strong>.`;
                } else if (daysLeft === 1) {
                    title = 'Urgent: Your Onlok Subscription Expires Tomorrow';
                    message = `Your <strong>${sub.plan_type.charAt(0).toUpperCase() + sub.plan_type.slice(1)}</strong> Onlok subscription is expiring <strong>tomorrow</strong>.`;
                } else {
                    title = `Action Required: Your Subscription Expires in ${daysLeft} Days`;
                    message = `This is a friendly reminder that your <strong>${sub.plan_type.charAt(0).toUpperCase() + sub.plan_type.slice(1)}</strong> Onlok subscription is expiring in exactly <strong>${daysLeft} days</strong> on ${new Date(sub.end_date).toLocaleDateString()}.`;
                }
                
                const html = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                        <h2 style="color: ${daysLeft <= 1 ? '#EF4444' : '#D97706'};">${title}</h2>
                        <p>Hi ${sub.first_name},</p>
                        <p>${message}</p>
                        <p>Please log in to your dashboard to renew your subscription so you don't lose access to your vendor features.</p>
                        <a href="${process.env.FRONTEND_URL || 'https://app.onlok.net'}/login" style="padding: 10px 15px; background: #0029FF; color: #fff; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Renew Subscription</a>
                        <br/><br/>
                        <p>Best regards,<br/><strong>The Onlok Team</strong></p>
                    </div>
                `;
                await sendEmail(sub.email, title, html);
            }
        }

        // Find subscriptions that expired today (or before) and mark them as expired
        const [expiredToday] = await pool.query(`
            SELECT s.id, u.email, u.first_name 
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            WHERE s.status = 'active'
            AND DATE(s.next_payment_date) < CURDATE()
        `);
        
        for (let sub of expiredToday) {
            await pool.query('UPDATE subscriptions SET status = "completed" WHERE id = ?', [sub.id]);
        }

        logger.info(`[CRON] Sent notices: ${JSON.stringify(counts)}. Expired: ${expiredToday.length}.`);
    } catch (error) {
        logger.error('[CRON] Error checking expiring subscriptions', { error });
    }
};

// Schedule task to run every day at 12:00 PM (noon)
const startCronJobs = () => {
    cron.schedule('0 12 * * *', () => {
        checkExpiringSubscriptions();
    });
    logger.info('[CRON] Scheduled jobs initialized.');
};

module.exports = { startCronJobs };
