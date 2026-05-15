const pool = require('../backend/config/db');

async function test() {
    try {
        const searchQuery = '%OL-NG-1103%';
        const limit = 10;
        const startIndex = 0;
        const query = `
            SELECT id, vendor_id, first_name, last_name, business_name, status, created_at 
            FROM users 
            WHERE (vendor_id LIKE ? OR business_name LIKE ?) AND role = 'vendor'
            LIMIT ? OFFSET ?
        `;
        const [vendors] = await pool.query(query, [searchQuery, searchQuery, limit, startIndex]);
        
        for (let vendor of vendors) {
            const [badges] = await pool.query('SELECT badge_type FROM badges WHERE user_id = ?', [vendor.id]);
            vendor.badges = badges.map(b => b.badge_type);
        }

        console.log(vendors);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

test();
