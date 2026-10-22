const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// GET /api/sales-end
// Returns only the active shift's sales summary.
router.get("/", async (req, res) => {
  try {
    const [[currentShift]] = await pool.query(`
      SELECT ID AS shift_id, START_TIME AS start_time, SHIFT_STATUS AS shift_status
      FROM shift
      ORDER BY (SHIFT_STATUS = 1) DESC, ID DESC
      LIMIT 1
    `);
    let rows = [];
    if (currentShift) {
      const [activeRows] = await pool.query(
        `SELECT
           COALESCE(MAX(si.ID), sh.ID) AS session_id,
           sh.ID AS shift_id,
           MIN(NULLIF(si.START_SERIAL_NO, '')) AS start_serial_number,
           MAX(NULLIF(si.END_SERIAL_NO, '')) AS end_serial_number,
           COALESCE(SUM(si.NO_OF_RESERVATION), 0) AS reservation_count,
           COALESCE(SUM(si.NUMBER_OF_RESERVATION_LKR), 0) AS rupee_count,
           COALESCE(SUM(si.NUMBER_OF_RESERVATION_USD), 0) AS dollar_count,
           COALESCE(SUM(si.SESSION_INCOME_LKR), 0) AS rupee_total,
           COALESCE(SUM(si.SESSION_INCOME_USD), 0) AS dollar_total,
           COALESCE(NULLIF(sh.START_TIME, ''), MIN(si.SESSION_START_DATETIME)) AS shift_start_time,
           sh.END_TIME AS shift_end_time,
           sh.SHIFT_STATUS AS shift_status,
           sh.END_BY AS ended_by
         FROM shift sh
         LEFT JOIN sessionincome si
           ON sh.ID = CAST(NULLIF(si.SHIFT, '') AS UNSIGNED)
         WHERE sh.ID = ?
         GROUP BY sh.ID, sh.START_TIME, sh.END_TIME, sh.SHIFT_STATUS, sh.END_BY`,
        [currentShift.shift_id]
      );
      rows = activeRows;
    }

    const activeShift = currentShift?.shift_status === 1 ? currentShift : null;
    res.json({
      success: true,
      count: rows.length,
      data: rows,
      currentShift: currentShift || null,
      activeShift,
    });
  } catch (error) {
    console.error("GET /api/sales-end failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load sales summaries from shift and session income records.",
    });
  }
});

// POST /api/sales-end/end
// Ends the currently active shift.
router.post("/end", async (req, res) => {
  let connection;
  try {
    const endedBy = String(req.body.endedBy || "Unknown").trim().slice(0, 50);
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [activeShifts] = await connection.query(
      `SELECT ID, COALESCE(NULLIF(START_TIME, ''), LOGIN_TIME) AS start_time
       FROM shift
       WHERE SHIFT_STATUS = 1
       ORDER BY ID DESC
       LIMIT 1
       FOR UPDATE`
    );
    if (activeShifts.length === 0) {
      await connection.rollback();
      return res.status(409).json({ success: false, error: "There is no active shift to end." });
    }

    const shift = activeShifts[0];
    if (!shift.start_time) {
      await connection.rollback();
      return res.status(409).json({ success: false, error: "The active shift has no start time; sales cannot be summarized." });
    }

    const [[endTimeRow]] = await connection.query(
      "SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s') AS end_time"
    );
    const endTime = endTimeRow.end_time;
    const [[salesSummary]] = await connection.query(
      `SELECT
         COUNT(*) AS reservation_count,
         SUM(CASE
           WHEN UPPER(COALESCE(Currency_Type, '')) LIKE '%RS%'
             OR UPPER(COALESCE(Currency_Type, '')) LIKE '%LKR%'
           THEN 1 ELSE 0 END) AS rupee_count,
         SUM(CASE
           WHEN UPPER(COALESCE(Currency_Type, '')) LIKE '%USD%'
             OR UPPER(COALESCE(Currency_Type, '')) LIKE '%US $%'
             OR Currency_Type LIKE '%$%'
           THEN 1 ELSE 0 END) AS dollar_count,
         SUM(CASE
           WHEN UPPER(COALESCE(Currency_Type, '')) LIKE '%RS%'
             OR UPPER(COALESCE(Currency_Type, '')) LIKE '%LKR%'
           THEN COALESCE(NULLIF(Amount_New, 0), CAST(NULLIF(Amount, '') AS DECIMAL(15, 2)), 0)
           ELSE 0 END) AS rupee_total,
         SUM(CASE
           WHEN UPPER(COALESCE(Currency_Type, '')) LIKE '%USD%'
             OR UPPER(COALESCE(Currency_Type, '')) LIKE '%US $%'
             OR Currency_Type LIKE '%$%'
           THEN COALESCE(NULLIF(Amount_New, 0), CAST(NULLIF(Amount, '') AS DECIMAL(15, 2)), 0)
           ELSE 0 END) AS dollar_total,
         MIN(cip_id) AS start_serial_number,
         MAX(cip_id) AS end_serial_number
       FROM cip
       WHERE Accessed_time >= ? AND Accessed_time <= ?`,
      [shift.start_time, endTime]
    );

    const [incomeRows] = await connection.query(
      `SELECT ID FROM sessionincome WHERE SHIFT = ? ORDER BY ID DESC LIMIT 1 FOR UPDATE`,
      [String(shift.ID)]
    );
    if (incomeRows.length === 0) {
      await connection.query(
        `INSERT INTO sessionincome (
           START_SERIAL_NO, END_SERIAL_NO, NO_OF_RESERVATION,
           NUMBER_OF_RESERVATION_LKR, NUMBER_OF_RESERVATION_USD,
           SESSION_INCOME_LKR, SESSION_INCOME_USD,
           SESSION_START_DATETIME, SESSION_END_DATETIME, SHIFT
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          salesSummary.start_serial_number,
          salesSummary.end_serial_number,
          salesSummary.reservation_count || 0,
          salesSummary.rupee_count || 0,
          salesSummary.dollar_count || 0,
          salesSummary.rupee_total || 0,
          salesSummary.dollar_total || 0,
          shift.start_time,
          endTime,
          String(shift.ID),
        ]
      );
    } else {
      await connection.query(
        `UPDATE sessionincome
         SET START_SERIAL_NO = ?,
             END_SERIAL_NO = ?,
             NO_OF_RESERVATION = ?,
             NUMBER_OF_RESERVATION_LKR = ?,
             NUMBER_OF_RESERVATION_USD = ?,
             SESSION_INCOME_LKR = ?,
             SESSION_INCOME_USD = ?,
             SESSION_START_DATETIME = ?,
             SESSION_END_DATETIME = ?
         WHERE ID = ?`,
        [
          salesSummary.start_serial_number,
          salesSummary.end_serial_number,
          salesSummary.reservation_count || 0,
          salesSummary.rupee_count || 0,
          salesSummary.dollar_count || 0,
          salesSummary.rupee_total || 0,
          salesSummary.dollar_total || 0,
          shift.start_time,
          endTime,
          incomeRows[0].ID,
        ]
      );
    }

    const [result] = await connection.query(
      `UPDATE shift
       SET SHIFT_STATUS = 0, END_TIME = ?, END_BY = ?
       WHERE ID = ? AND SHIFT_STATUS = 1`,
      [endTime, endedBy, shift.ID]
    );
    if (result.affectedRows !== 1) {
      await connection.rollback();
      return res.status(409).json({ success: false, error: "The active shift has already ended." });
    }

    await connection.commit();
    res.json({
      success: true,
      message: "Sales ended successfully and the shift income summary was updated.",
      shiftId: shift.ID,
      shiftStatus: 0,
      startTime: shift.start_time,
      endTime,
      endedBy,
      sales: salesSummary,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("POST /api/sales-end/end failed:", error);
    res.status(500).json({ success: false, error: "Failed to end the active sales shift." });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
