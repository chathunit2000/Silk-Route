const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { airportPool } = require("../config/db");

// POST /api/auth/login or /api/login
// Authenticates user against airport_database.users table using user_id and PassWord
router.post("/login", async (req, res) => {
  const { user_id, username, password } = req.body;
  const loginId = (user_id || username || "").trim();
  const rawPassword = (password || "").trim();

  if (!loginId || !rawPassword) {
    return res.status(400).json({
      success: false,
      error: "User ID and password are required.",
    });
  }

  try {
    // Query the users table in airport_database, prioritizing admin and finance if duplicates exist
    const [rows] = await airportPool.query(
      `SELECT no, epf_no, user_id, PassWord, id_name, organisation, Address, email, tele, user_type, Status, Passport_number
       FROM users
       WHERE user_id = ?
       ORDER BY 
         CASE 
           WHEN LOWER(user_type) = 'admin' THEN 1 
           WHEN LOWER(user_type) IN ('fin', 'finance') THEN 2 
           ELSE 3 
         END ASC, 
         no DESC`,
      [loginId]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: "Invalid User ID or password.",
      });
    }

    // Compute MD5 hash of the submitted password
    const md5Hash = crypto.createHash("md5").update(rawPassword).digest("hex");

    // PassWord in airport_database.users is stored as MD5 hash (or plain text fallback)
    const matchingUser = rows.find(
      (u) =>
        u.PassWord &&
        (u.PassWord.toLowerCase() === md5Hash.toLowerCase() ||
         u.PassWord === rawPassword)
    );

    if (!matchingUser) {
      return res.status(401).json({
        success: false,
        error: "Invalid User ID or password.",
      });
    }

    const user = matchingUser;

    // Check account status if flagged as inactive
    if (user.Status && user.Status.toLowerCase() === "inactive") {
      return res.status(403).json({
        success: false,
        error: "Your account is currently inactive. Please contact the administrator.",
      });
    }

    // Normalize user role: admin, finance, or normal user
    const rawType = (user.user_type || "").toLowerCase().trim();
    let normalizedRole = "user";
    if (rawType === "admin" || user.user_id?.toLowerCase() === "admin") {
      normalizedRole = "admin";
    } else if (rawType === "fin" || rawType === "finance") {
      normalizedRole = "finance";
    }

    if (normalizedRole !== "finance") {
      const connection = await airportPool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.query(
          `SELECT ID FROM shift ORDER BY ID DESC LIMIT 1 FOR UPDATE`
        );
        const [activeShifts] = await connection.query(
          `SELECT ID FROM shift WHERE SHIFT_STATUS = 1 ORDER BY ID DESC LIMIT 1 FOR UPDATE`
        );
        let activeShiftId = activeShifts[0]?.ID;
        if (activeShifts.length === 0) {
          const [shiftResult] = await connection.query(
            `INSERT INTO shift (START_TIME, SHIFT_STATUS, LOGIN_TIME)
             VALUES (NOW(), 1, NOW())`
          );
          activeShiftId = shiftResult.insertId;
        }
        const [incomeRows] = await connection.query(
          `SELECT ID FROM sessionincome WHERE SHIFT = ? LIMIT 1 FOR UPDATE`,
          [String(activeShiftId)]
        );
        if (incomeRows.length === 0) {
          await connection.query(
            `INSERT INTO sessionincome (
               NO_OF_RESERVATION,
               NUMBER_OF_RESERVATION_LKR,
               NUMBER_OF_RESERVATION_USD,
               SESSION_INCOME_LKR,
               SESSION_INCOME_USD,
               SESSION_START_DATETIME,
               SHIFT
             )
             VALUES (0, 0, 0, 0.00, 0.00, NOW(), ?)`,
            [String(activeShiftId)]
          );
        }
        await connection.commit();
      } catch (shiftError) {
        await connection.rollback();
        throw shiftError;
      } finally {
        connection.release();
      }
    }

    // Return successful authentication and user details
    res.json({
      success: true,
      message: "Login successful.",
      user: {
        id: user.no,
        user_id: user.user_id,
        name: user.id_name || user.user_id,
        user_type: user.user_type || "user",
        role: normalizedRole,
        organisation: user.organisation || "",
        email: user.email || "",
        tele: user.tele || "",
      },
    });
  } catch (err) {
    console.error("Authentication error on airport_database.users:", err);
    res.status(500).json({
      success: false,
      error: "An error occurred while authenticating with airport database.",
    });
  }
});

module.exports = router;
