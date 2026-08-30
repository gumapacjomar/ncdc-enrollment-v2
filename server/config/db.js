const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3307,        // <--- Add this line
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ncdc_enrollment_v2',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed!');
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);
        console.log('\n💡 Make sure MySQL is running on port 3307');
        return;
    }
    console.log('✅ Connected to MySQL database on port 3307!');
    connection.release();
});

module.exports = pool;