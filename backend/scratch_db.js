const pool = require('./config/db');

async function run() {
  try {
    await pool.query("ALTER TABLE verifications MODIFY status ENUM('pending', 'approved', 'rejected', 'flagged') DEFAULT 'pending'");
    console.log("Status updated successfully.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
