require('dotenv').config();

const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'administratech',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

//la exportamos para poder usuarla
module.exports = pool.promise();
