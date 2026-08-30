const mysql = require('mysql2');

// Try different connection options
const connectionConfigs = [
    {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'ncdc_enrollment_v2'
    },
    {
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'ncdc_enrollment_v2'
    },
    {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'ncdc_enrollment'
    }
];

connectionConfigs.forEach((config, index) => {
    console.log(`\n🔍 Testing config ${index + 1}:`, config.host, config.database);
    
    const connection = mysql.createConnection(config);
    
    connection.connect((err) => {
        if (err) {
            console.log(`❌ Failed:`, err.code, err.message);
        } else {
            console.log(`✅ SUCCESS! Connected to ${config.database}`);
            connection.end();
        }
    });
});