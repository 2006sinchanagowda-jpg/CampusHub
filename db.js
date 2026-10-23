const mysql = require('mysql2');

const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'campus_web',
    password: 'WebApp2026!Safe',
    database: 'campus_events',
    port: 3306
});

db.connect((err) => {
    if (err) {
        console.error('MySQL connection failed:', err.message);
        return;
    }

    console.log('MySQL connected successfully!');
});

module.exports = db;
