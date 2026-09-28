const mysql = require("mysql2/promise");
require("dotenv").config();

// Dedicated pool for airport_database - the sole database used by this system
const dbName = process.env.DB_NAME || process.env.AIRPORT_DB_NAME || "airport_database";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test connection on startup to verify connectivity to airport_database
(async () => {
  try {
    const connection = await pool.getConnection();
    const [[result]] = await connection.query("SELECT DATABASE() AS currentDb, COUNT(*) AS userCount FROM users");
    console.log(`[Database] Successfully connected to MySQL database: "${result.currentDb}" (${result.userCount} users found)`);
    connection.release();
  } catch (err) {
    console.error(`[Database] Connection to "${dbName}" failed:`, err.message);
  }
})();

// Attach airportPool reference for backward compatibility with auth.js
// WARNING: Do NOT overwrite pool.pool because mysql2 PromisePool internally requires this.pool (the underlying callback Pool)
pool.airportPool = pool;

module.exports = pool;


