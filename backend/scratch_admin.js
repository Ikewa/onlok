const pool = require('./config/db');

async function checkAdmins() {
  try {
    const [rows] = await pool.query('SELECT id, email, vendor_id, first_name, role FROM users WHERE role = "admin"');
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkAdmins();
