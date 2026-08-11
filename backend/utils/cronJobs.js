const cron = require('node-cron');
const pool = require('../config/db');
const { sendEmail } = require('./emailService');
require('dotenv').config();

const checkExpiringSubscriptions = async () => {
    try {
        console.log('[CRON] Running daily check for expiring subscriptions...');
        
        // Find subscriptions expiring in exactly 7 days
        const [expiringIn7Days] = await pool.query(`
            SELECT u.email, u.first_name, u.business_name, p.end_date, p.plan_type 
            FROM payments p
            JOIN users u ON p.user_id = u.id
            WHERE p.status = 'active'
            AND DATE(p.end_date) = CURDATE() + INTERVAL 7 DAY
        `);

        for (let sub of expiringIn7Days) {
            const html = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #D97706;">Action Required: Subscription Expiring Soon</h2>
                    <p>Hi ${sub.first_name},</p>
                    <p>This is a friendly reminder that your <strong>${sub.plan_type.charAt(0).toUpperCase() + sub.plan_type.slice(1)}</strong> Onlok subscription is expiring in exactly <strong>7 days</strong> on ${new Date(sub.end_date).toLocaleDateString()}.</p>
                    <p>Please log in to your dashboard to renew your subscription so you don't lose access to your vendor features.</p>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="padding: 10px 15px; background: #0029FF; color: #fff; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Renew Subscription</a>
                    <br/><br/>
                    <p>Best regards,<br/><strong>The Onlok Team</strong></p>
                </div>
            `;
            await sendEmail(sub.email, 'Action Required: Your Onlok Subscription expires in 7 days', html);
        }

        // Find subscriptions expiring in exactly 1 day
        const [expiringIn1Day] = await pool.query(`
            SELECT u.email, u.first_name, u.business_name, p.end_date, p.plan_type 
            FROM payments p
            JOIN users u ON p.user_id = u.id
            WHERE p.status = 'active'
            AND DATE(p.end_date) = CURDATE() + INTERVAL 1 DAY
        `);

        for (let sub of expiringIn1Day) {
            const html = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #EF4444;">Urgent: Subscription Expires Tomorrow</h2>
                    <p>Hi ${sub.first_name},</p>
                    <p>Your <strong>${sub.plan_type.charAt(0).toUpperCase() + sub.plan_type.slice(1)}</strong> Onlok subscription is expiring <strong>tomorrow</strong>.</p>
                    <p>If you don't renew before it expires, your account will temporarily lose access to verified vendor features.</p>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="padding: 10px 15px; background: #0029FF; color: #fff; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Renew Now</a>
                    <br/><br/>
                    <p>Best regards,<br/><strong>The Onlok Team</strong></p>
                </div>
            `;
            await sendEmail(sub.email, 'Urgent: Your Onlok Subscription expires tomorrow', html);
        }

        // Find subscriptions that expired today and mark them as expired
        const [expiredToday] = await pool.query(`
            SELECT p.id, u.email, u.first_name 
            FROM payments p
            JOIN users u ON p.user_id = u.id
            WHERE p.status = 'active'
            AND DATE(p.end_date) < CURDATE()
        `);
        
        for (let sub of expiredToday) {
            await pool.query('UPDATE payments SET status = "expired" WHERE id = ?', [sub.id]);
        }

        console.log(`[CRON] Sent ${expiringIn7Days.length} 7-day notices and ${expiringIn1Day.length} 1-day notices.`);
    } catch (error) {
        console.error('[CRON] Error checking expiring subscriptions:', error);
    }
};

// Schedule task to run every day at 12:00 PM (noon)
const startCronJobs = () => {
    cron.schedule('0 12 * * *', () => {
        checkExpiringSubscriptions();
    });
    console.log('[CRON] Scheduled jobs initialized.');
};

module.exports = { startCronJobs };
