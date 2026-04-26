const pool = require('./config/db');
const bcrypt = require('bcrypt');

async function seedAdmin() {
  try {
    const passwordHash = await bcrypt.hash('admin123', 10);
    const query = "INSERT INTO users (vendor_id, first_name, last_name, business_name, email, password_hash, phone_number, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'admin', 'verified')";
    await pool.query(query, [
      'ONL-ADMIN-01',
      'Admin',
      'User',
      'Onlok Admin',
      'admin@onlok.com',
      passwordHash,
      '0000000000'
    ]);
    console.log('Admin user seeded successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

seedAdmin();
