const mysql = require("mysql2/promise");
require("dotenv").config();

// Pool for Silkroute application database (dashboard stats, reservations, activity)
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "silkroute",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Dedicated pool for airport_database (users table authentication)
const airportPool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.AIRPORT_DB_NAME || "airport_database",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Export pool as default for existing dashboard routes, and attach airportPool
module.exports = pool;
module.exports.pool = pool;
module.exports.airportPool = airportPool;

