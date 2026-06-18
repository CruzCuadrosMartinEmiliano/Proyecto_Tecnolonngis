require('dotenv').config();
const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',          // Asegúrate que aquí diga 'root'
    password: process.env.DB_PASSWORD || 'Cu4dr0z_@17',      // Si no tienes contraseña, déjalo vacío ''
    database: process.env.DB_NAME || 'administratech', // Tu base de datos local
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise();