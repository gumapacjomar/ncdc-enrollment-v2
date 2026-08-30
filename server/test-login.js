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

const testLogin = async () => {
    const username = 'admin';
    const inputPassword = 'admin123';

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) {
            console.error('❌ Error:', err);
            return;
        }

        if (results.length === 0) {
            console.log('❌ User not found:', username);
            console.log('💡 Run this SQL to create admin:');
            console.log(`INSERT INTO users (username, password, email, role) VALUES ('admin', 'temp', 'admin@ncdc.edu.ph', 'admin');`);
            return;
        }

        const user = results[0];
        console.log('✅ User found:', user.username);
        console.log('📝 Stored hash:', user.password);
        console.log('📝 Input password:', inputPassword);

        const isMatch = await bcrypt.compare(inputPassword, user.password);
        console.log('✅ Password match:', isMatch);

        if (!isMatch) {
            // Generate new hash
            const newHash = await bcrypt.hash(inputPassword, 10);
            console.log('');
            console.log('🔄 GENERATE NEW HASH:');
            console.log(newHash);
            console.log('');
            console.log('📝 RUN THIS SQL:');
            console.log(`UPDATE users SET password = '${newHash}' WHERE username = '${username}';`);
        }

        db.end();
    });
};

testLogin();