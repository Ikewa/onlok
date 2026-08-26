const pool = require('./config/db');

(async () => {
  try {
    await pool.query('CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users');
    await pool.query('CREATE TABLE IF NOT EXISTS verifications_backup AS SELECT * FROM verifications');
    await pool.query('CREATE TABLE IF NOT EXISTS subscriptions_backup AS SELECT * FROM subscriptions');
    console.log('Backups created.');
    
    // Delete from child tables first to avoid foreign key constraints (if any)
    const [ver_res] = await pool.query("DELETE FROM verifications WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%' OR first_name LIKE '%test%' OR email = 'userone@onlok.com' OR email = 'Abuja')");
    console.log('Deleted dummy verifications:', ver_res.affectedRows);
    
    const [sub_res] = await pool.query("DELETE FROM subscriptions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%' OR first_name LIKE '%test%' OR email = 'userone@onlok.com' OR email = 'Abuja')");
    console.log('Deleted dummy subscriptions:', sub_res.affectedRows);

    const [usr_res] = await pool.query("DELETE FROM users WHERE email LIKE '%test%' OR first_name LIKE '%test%' OR email = 'userone@onlok.com' OR email = 'Abuja'");
    console.log('Deleted dummy users:', usr_res.affectedRows);
    
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
