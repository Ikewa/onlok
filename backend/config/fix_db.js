const pool = require('./db');

async function fixDatabase() {
    try {
        console.log('Connecting to MySQL...');
        
        // Add admin_notes
        try {
            await pool.query('ALTER TABLE verifications ADD COLUMN admin_notes TEXT');
            console.log('✅ Added admin_notes column');
        } catch (e) { 
            if (e.code === 'ER_DUP_FIELDNAME') console.log('✅ admin_notes already exists'); 
            else throw e; 
        }

        // Add reviewed_at (just in case)
        try {
            await pool.query('ALTER TABLE verifications ADD COLUMN reviewed_at TIMESTAMP NULL');
            console.log('✅ Added reviewed_at column');
        } catch (e) { 
            if (e.code === 'ER_DUP_FIELDNAME') console.log('✅ reviewed_at already exists'); 
            else throw e; 
        }

        // Add reviewed_by (just in case)
        try {
            await pool.query('ALTER TABLE verifications ADD COLUMN reviewed_by INT NULL');
            console.log('✅ Added reviewed_by column');
        } catch (e) { 
            if (e.code === 'ER_DUP_FIELDNAME') console.log('✅ reviewed_by already exists'); 
            else throw e; 
        }

        console.log('🎉 Database completely patched!');
    } catch (error) {
        console.error('❌ FAILED:', error.message);
    } finally {
        process.exit();
    }
}

fixDatabase();