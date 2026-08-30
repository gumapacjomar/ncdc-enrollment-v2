const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ncdc_enrollment_v2'
});

const testPassword = async () => {
    const username = 'registrar';
    const inputPassword = 'registrar123';

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) {
            console.error('❌ Error:', err);
            return;
        }

        if (results.length === 0) {
            console.log('❌ User not found:', username);
            return;
        }

        const user = results[0];
        console.log('👤 User found:', user.username);
        console.log('🔑 Stored hash:', user.password);
        console.log('🔑 Input password:', inputPassword);

        const isMatch = await bcrypt.compare(inputPassword, user.password);
        console.log('✅ Password match:', isMatch);

        if (!isMatch) {
            // Generate new hash for debugging
            const newHash = await bcrypt.hash(inputPassword, 10);
            console.log('🔄 New hash for this password:', newHash);
            console.log('💡 Run this SQL to update:');
            console.log(`UPDATE users SET password = '${newHash}' WHERE username = '${username}';`);
        }

        db.end();
    });
};

testPassword();