const pool = require('./config/db');

async function test() {
  try {
    const [verifications] = await pool.query('SELECT user_id, status FROM verifications WHERE id = 5');
    if (verifications.length === 0) {
        console.log("Verification not found");
        process.exit(1);
    }
    const verification = verifications[0];
    const updateQuery = `
        UPDATE verifications 
        SET status = 'approved', admin_notes = 'test notes', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = 1 
        WHERE id = 5
    `;
    await pool.query(updateQuery);
    console.log("update verifications success");

    await pool.query(`UPDATE users SET status = 'verified' WHERE id = ?`, [verification.user_id]);
    console.log("update users success");

    const [existingBadges] = await pool.query('SELECT id FROM badges WHERE user_id = ? AND badge_type = "verified_vendor"', [verification.user_id]);
    console.log("select badges success");

    if (existingBadges.length === 0) {
        await pool.query(`INSERT INTO badges (user_id, badge_type) VALUES (?, 'verified_vendor')`, [verification.user_id]);
        console.log("insert badges success");
    }
    console.log("ALL SUCCESS");
  } catch (err) {
    console.error("DB ERROR CAUGHT:", err);
  }
  process.exit(0);
}
test();
