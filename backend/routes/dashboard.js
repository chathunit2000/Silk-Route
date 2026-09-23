const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// GET /api/dashboard
// Returns everything the dashboard screen needs in one payload:
// top stat cards, reservation status counts, the latest reservations,
// and the recent activity feed.
router.get("/", async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [[arrivalsRow]] = await pool.query(
      `SELECT COUNT(*) AS count FROM reservations WHERE arrival_date = ?`,
      [today]
    );
    const [[departuresRow]] = await pool.query(
      `SELECT COUNT(*) AS count FROM reservations WHERE departure_date = ?`,
      [today]
    );
    const [[pendingPaymentsRow]] = await pool.query(
      `SELECT COUNT(*) AS count FROM reservations WHERE status = 'Pending'`
    );
    const [[confirmedRow]] = await pool.query(
      `SELECT COUNT(*) AS count FROM reservations WHERE status = 'Confirmed'`
    );

    const [statusRows] = await pool.query(
      `SELECT status, COUNT(*) AS count FROM reservations GROUP BY status`
    );
    const statusMap = { pending: 0, confirmed: 0, onHold: 0, completed: 0 };
    const statusKeyByLabel = { Pending: "pending", Confirmed: "confirmed", "On-hold": "onHold", Completed: "completed" };
    statusRows.forEach((row) => {
      const key = statusKeyByLabel[row.status];
      if (key) statusMap[key] = row.count;
    });

    const [recentReservations] = await pool.query(
      `SELECT booking_id AS id, passenger_name AS passenger,
              CONCAT(origin, ' \u2013 ', destination) AS flight,
              lounge, status
       FROM reservations
       ORDER BY created_at DESC
       LIMIT 5`
    );

    const [recentActivity] = await pool.query(
      `SELECT title, detail, icon,
              TIMESTAMPDIFF(HOUR, created_at, NOW()) AS hours_ago
       FROM activity_log
       ORDER BY created_at DESC
       LIMIT 5`
    );

    res.json({
      stats: {
        todaysArrivals: { value: arrivalsRow.count, change: "" },
        todaysDepartures: { value: departuresRow.count, change: "" },
        pendingPayments: { value: pendingPaymentsRow.count, meta: "" },
        confirmedReservations: { value: confirmedRow.count, change: "" },
      },
      status: statusMap,
      recentReservations,
      recentActivity: recentActivity.map((row) => ({
        title: row.title,
        detail: row.detail,
        icon: row.icon,
        time: `${row.hours_ago}h ago`,
      })),
    });
  } catch (err) {
    console.error("GET /api/dashboard failed:", err);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
});

module.exports = router;
