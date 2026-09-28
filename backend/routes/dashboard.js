const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// GET /api/dashboard
// Returns real-time metrics and records from airport_database:
// top stat cards, reservation status counts, recent CIP reservations, and recent action logs.
router.get("/", async (req, res) => {
  try {
    // 1. Stat cards queries from airport_database.cip
    const [[arrivalsRow]] = await pool.query(
      `SELECT COUNT(*) AS count FROM cip WHERE Arrival_date = CURDATE()`
    );
    const [[departuresRow]] = await pool.query(
      `SELECT COUNT(*) AS count FROM cip WHERE Departure_date = CURDATE()`
    );
    const [[pendingPaymentsRow]] = await pool.query(
      `SELECT COUNT(*) AS count FROM cip WHERE Bank_message != 'Approved' OR Bank_message IS NULL OR Bank_message = ''`
    );
    const [[confirmedRow]] = await pool.query(
      `SELECT COUNT(*) AS count FROM cip WHERE Bank_message = 'Approved'`
    );

    // 2. Status tile distribution from airport_database.cip
    const [[pendingCount]] = await pool.query(
      `SELECT COUNT(*) AS count FROM cip WHERE Bank_message = '' OR Bank_message IS NULL`
    );
    const [[confirmedCount]] = await pool.query(
      `SELECT COUNT(*) AS count FROM cip WHERE Bank_message = 'Approved' AND (Departure_date >= CURDATE() OR Departure_date < '1900-01-01')`
    );
    const [[onHoldCount]] = await pool.query(
      `SELECT COUNT(*) AS count FROM cip WHERE Bank_message LIKE '%Declin%' OR Bank_message LIKE '%Cancel%'`
    );
    const [[completedCount]] = await pool.query(
      `SELECT COUNT(*) AS count FROM cip WHERE Bank_message = 'Approved' AND Departure_date < CURDATE() AND Departure_date > '1900-01-01'`
    );

    const statusMap = {
      pending: pendingCount?.count || 0,
      confirmed: confirmedCount?.count || 0,
      onHold: onHoldCount?.count || 0,
      completed: completedCount?.count || 0,
    };

    // 3. Recent 5 CIP reservations from airport_database.cip & passenger
    const [recentCipRows] = await pool.query(
      `SELECT c.cip_id AS id,
              COALESCE((SELECT name FROM passenger WHERE cip_id = c.cip_id LIMIT 1), NULLIF(c.Local_contact_name, ''), 'Passenger') AS passenger,
              CONCAT(
                COALESCE(NULLIF(c.Arrv_Flight_no, ''), 'CMB'),
                ' \u2013 ',
                COALESCE(NULLIF(c.Dept_Flight_no, ''), 'CMB')
              ) AS flight,
              CONCAT('Package ', COALESCE(NULLIF(c.Package, ''), 'Standard')) AS lounge,
              CASE
                WHEN c.Bank_message = 'Approved' THEN 'Confirmed'
                WHEN c.Bank_message LIKE '%Declin%' THEN 'Pending'
                ELSE 'Pending'
              END AS status
       FROM cip c
       ORDER BY c.cip_id DESC
       LIMIT 5`
    );

    // 4. Recent activity from airport_database.action_log
    const [recentActivityRows] = await pool.query(
      `SELECT action AS title,
              CONCAT('CIP #', COALESCE(cip_id, ''), ' by ', COALESCE(user_id, 'System')) AS detail,
              'check' AS icon,
              COALESCE(TIMESTAMPDIFF(HOUR, timestamp, NOW()), 0) AS hours_ago
       FROM action_log
       ORDER BY log_id DESC
       LIMIT 5`
    );

    res.json({
      database: "airport_database",
      stats: {
        todaysArrivals: { value: arrivalsRow?.count || 0, change: "" },
        todaysDepartures: { value: departuresRow?.count || 0, change: "" },
        pendingPayments: { value: pendingPaymentsRow?.count || 0, meta: "" },
        confirmedReservations: { value: confirmedRow?.count || 0, change: "" },
      },
      status: statusMap,
      recentReservations: recentCipRows.map((row) => ({
        id: `CIP-${row.id}`,
        passenger: row.passenger,
        flight: row.flight,
        lounge: row.lounge,
        status: row.status,
      })),
      recentActivity: recentActivityRows.map((row) => ({
        title: row.title,
        detail: row.detail,
        icon: row.icon,
        time: `${row.hours_ago}h ago`,
      })),
    });
  } catch (err) {
    console.error("GET /api/dashboard failed on airport_database:", err);
    res.status(500).json({ error: "Failed to load dashboard data from airport_database" });
  }
});

module.exports = router;

