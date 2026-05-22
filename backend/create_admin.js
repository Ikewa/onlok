const pool = require('./config/db');
const bcrypt = require('bcrypt');

async function createAdmin() {
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.log("==========================================");
    console.log("Usage: node create_admin.js <email> <password> <first_name> <last_name>");
    console.log("Example: node create_admin.js john@onlok.com securepass123 John Doe");
    console.log("==========================================");
    process.exit(1);
  }

  const [email, password, firstName, lastName] = args;

  try {
    // Check if email already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      console.error(`❌ Error: A user with the email ${email} already exists.`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    // Generate a unique admin vendor ID
    const vendorId = `ONL-ADMIN-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const query = `
      INSERT INTO users 
      (vendor_id, first_name, last_name, business_name, email, password_hash, phone_number, role, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 'admin', 'verified')
    `;
    
    await pool.query(query, [
      vendorId,
      firstName,
      lastName,
      'Onlok Admin',
      email,
      passwordHash,
      '0000000000'
    ]);
    
    console.log("\n✅ Admin account created successfully!");
    console.log("------------------------------------------");
    console.log(`Name:      ${firstName} ${lastName}`);
    console.log(`Email:     ${email}`);
    console.log(`Password:  ${password}`);
    console.log(`Admin ID:  ${vendorId}`);
    console.log("------------------------------------------\n");
    
  } catch (err) {
    console.error("❌ Error creating admin:", err.message);
  } finally {
    process.exit(0);
  }
}

createAdmin();
