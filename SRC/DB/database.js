
const mysql = require('mysql2');

const pool = mysql.createPool({
    host : 'localhost',
    user : 'root',
    password : 'Cu4dr0z_@17',
    database : 'administratech',
    waitForConnections : true,
    connectionLimit : 10,
    queueLimit : 0
});

//la exportamos para poder usuarla
module.exports = pool.promise();