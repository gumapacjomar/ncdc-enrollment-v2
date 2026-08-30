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

const createUsers = async () => {
    try {
        // Hash passwords
        const adminPassword = await bcrypt.hash('admin123', 10);
        const registrarPassword = await bcrypt.hash('registrar123', 10);
        
        console.log('✅ Admin hash:', adminPassword);
        console.log('✅ Registrar hash:', registrarPassword);
        console.log('');

        // Delete existing users
        await new Promise((resolve, reject) => {
            db.query('DELETE FROM users WHERE username IN ("admin", "registrar")', (err) => {
                if (err) reject(err);
                resolve();
            });
        });
        console.log('✅ Old users deleted');

        // Insert Admin
        await new Promise((resolve, reject) => {
            const query = `
                INSERT INTO users (username, password, email, role, is_first_login) 
                VALUES (?, ?, ?, 'admin', FALSE)
            `;
            db.query(query, ['admin', adminPassword, 'admin@ncdc.edu.ph'], (err) => {
                if (err) reject(err);
                resolve();
            });
        });
        console.log('✅ Admin account created');

        // Insert Registrar
        await new Promise((resolve, reject) => {
            const query = `
                INSERT INTO users (username, password, email, role, is_first_login) 
                VALUES (?, ?, ?, 'registrar', FALSE)
            `;
            db.query(query, ['registrar', registrarPassword, 'registrar@ncdc.edu.ph'], (err) => {
                if (err) reject(err);
                resolve();
            });
        });
        console.log('✅ Registrar account created');

        console.log('');
        console.log('🎉 All users created successfully!');
        console.log('📝 Login credentials:');
        console.log('  Admin:    admin / admin123');
        console.log('  Registrar: registrar / registrar123');

        db.end();
    } catch (error) {
        console.error('❌ Error:', error);
        db.end();
    }
};

createUsers();