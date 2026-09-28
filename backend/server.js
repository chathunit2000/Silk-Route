const express = require("express");
const cors = require("cors");
require("dotenv").config();

const dashboardRoutes = require("./routes/dashboard");
const authRoutes = require("./routes/auth");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api", authRoutes);
app.use("/api/dashboard", dashboardRoutes);

const pool = require("./config/db");

app.get("/api/health", (req, res) => res.json({ status: "ok", database: "airport_database" }));

// GET /api/db-status: Live verification that the backend is connected to airport_database
app.get("/api/db-status", async (req, res) => {
  try {
    const [[dbRow]] = await pool.query("SELECT DATABASE() AS databaseName");
    const [[usersRow]] = await pool.query("SELECT COUNT(*) AS count FROM users");
    const [[cipRow]] = await pool.query("SELECT COUNT(*) AS count FROM cip");
    const [[passengerRow]] = await pool.query("SELECT COUNT(*) AS count FROM passenger");
    const [[actionLogRow]] = await pool.query("SELECT COUNT(*) AS count FROM action_log");

    res.json({
      status: "connected",
      database: dbRow.databaseName,
      message: `Backend is successfully connected to ${dbRow.databaseName}`,
      tables: {
        users: usersRow.count,
        cip: cipRow.count,
        passenger: passengerRow.count,
        action_log: actionLogRow.count,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Database status check failed:", err);
    res.status(500).json({
      status: "error",
      database: "airport_database",
      error: err.message,
    });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT} [Connected strictly to airport_database]`);
});
