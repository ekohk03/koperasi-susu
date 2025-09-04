const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../config.env') });

const pool = mysql.createPool({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	port: Number(process.env.DB_PORT) || 3306,
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
	// Use valid option name for mysql2
	connectTimeout: 60000
});
pool.on('connection', (conn) => {
    conn.query("SET time_zone = '+07:00'");
  });

module.exports = pool;
