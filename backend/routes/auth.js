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
    // Query the users table in airport_database
    const [rows] = await airportPool.query(
      `SELECT no, epf_no, user_id, PassWord, id_name, organisation, Address, email, tele, user_type, Status, Passport_number
       FROM users
       WHERE user_id = ?
       LIMIT 1`,
      [loginId]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: "Invalid User ID or password.",
      });
    }

    const user = rows[0];

    // Compute MD5 hash of the submitted password
    const md5Hash = crypto.createHash("md5").update(rawPassword).digest("hex");

    // PassWord in airport_database.users is stored as MD5 hash (or plain text fallback)
    const isMatch =
      user.PassWord &&
      (user.PassWord.toLowerCase() === md5Hash.toLowerCase() ||
       user.PassWord === rawPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid User ID or password.",
      });
    }

    // Check account status if flagged as inactive
    if (user.Status && user.Status.toLowerCase() === "inactive") {
      return res.status(403).json({
        success: false,
        error: "Your account is currently inactive. Please contact the administrator.",
      });
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
