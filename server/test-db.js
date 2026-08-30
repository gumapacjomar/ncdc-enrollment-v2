const mysql = require('mysql2');
require('dotenv').config();

console.log('🔍 Testing database connection...');
console.log('📋 Connection config:');
console.log('  Host:', process.env.DB_HOST || 'localhost');
console.log('  Port:', process.env.DB_PORT || 3307);    // <--- Change to 3307
console.log('  User:', process.env.DB_USER || 'root');
console.log('  Password:', process.env.DB_PASSWORD ? '***' : '(blank)');
console.log('  Database:', process.env.DB_NAME || 'ncdc_enrollment_v2');
console.log('');

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3307,    // <--- Add port
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ncdc_enrollment_v2'
});

db.connect((err) => {
    if (err) {
        console.error('❌ Connection failed!');
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);
        console.log('\n💡 Make sure MySQL is running on port 3307');
        console.log('   Check XAMPP Control Panel for MySQL port');
        return;
    }
    console.log('✅ Connected to MySQL on port 3307 successfully!');
    db.end();
});