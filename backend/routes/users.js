const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const pool = require("../config/db");

// Helper: MD5 hash for password
function hashPassword(plainText) {
  return crypto.createHash("md5").update(plainText).digest("hex");
}

// GET /api/users
// Search, filter, and paginate users from airport_database.users
router.get("/", async (req, res) => {
  try {
    const { search = "", page = 1, limit = 20, user_type = "" } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let whereConditions = [];
    let queryParams = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereConditions.push(
        "(user_id LIKE ? OR id_name LIKE ? OR epf_no LIKE ? OR email LIKE ? OR tele LIKE ?)"
      );
      queryParams.push(term, term, term, term, term);
    }

    if (user_type && user_type.trim()) {
      whereConditions.push("user_type = ?");
      queryParams.push(user_type.trim());
    }

    const whereClause =
      whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    // Count total matches
    const [[countResult]] = await pool.query(
      `SELECT COUNT(*) AS total FROM users ${whereClause}`,
      queryParams
    );
    const total = countResult ? countResult.total : 0;

    // Fetch records
    const [rows] = await pool.query(
      `SELECT no, epf_no, user_id, id_name, email, tele, user_type, Status, Access_date, created_by
       FROM users
       ${whereClause}
       ORDER BY no DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limitNum, offset]
    );

    res.json({
      success: true,
      users: rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve user list from airport database.",
      details: err.message,
    });
  }
});

// GET /api/users/:id
// Get user details by user_id or primary key 'no'
router.get("/:id", async (req, res) => {
  try {
    const identifier = req.params.id;
    const isNumeric = /^\d+$/.test(identifier);

    let query = "SELECT no, epf_no, user_id, id_name, organisation, Address, email, tele, user_type, Status, Access_date, created_by, Passport_number FROM users WHERE ";
    let params = [];

    if (isNumeric) {
      query += "no = ? OR user_id = ? LIMIT 1";
      params = [parseInt(identifier, 10), identifier];
    } else {
      query += "user_id = ? LIMIT 1";
      params = [identifier];
    }

    const [rows] = await pool.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found.",
      });
    }

    res.json({
      success: true,
      user: rows[0],
    });
  } catch (err) {
    console.error("Error fetching user details:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user details.",
      details: err.message,
    });
  }
});

// POST /api/users
// Create / Register a new user matching the official Silk Route registration form
router.post("/", async (req, res) => {
  try {
    const {
      title = "",
      nameWithInitials = "",
      id_name = "",
      epfNo = "",
      epf_no = "",
      desiredLoginName = "",
      user_id = "",
      password = "",
      rePassword = "",
      email = "",
      contactNo = "",
      tele = "",
      userType = "user",
      user_type = "user",
      createdBy = "admin",
    } = req.body;

    // Harmonize fields
    const finalUserId = (desiredLoginName || user_id || "").trim();
    const rawName = (nameWithInitials || id_name || "").trim();
    const finalTitle = (title || "").trim();
    // Prepend title if provided and not already prefixed
    let finalIdName = rawName;
    if (finalTitle && !finalIdName.toLowerCase().startsWith(finalTitle.toLowerCase())) {
      finalIdName = `${finalTitle}. ${rawName}`.trim();
    }

    const finalEpf = (epfNo || epf_no || "").toString().trim();
    const finalPassword = (password || "").trim();
    const finalRePassword = (rePassword || "").trim();
    const finalEmail = (email || "").trim();
    const finalTele = (contactNo || tele || "").trim();
    const finalUserType = (userType || user_type || "user").trim();

    // Validation
    if (!finalIdName) {
      return res.status(400).json({
        success: false,
        error: "Name with Initials is mandatory (*).",
      });
    }

    if (!finalEpf) {
      return res.status(400).json({
        success: false,
        error: "EPF No is mandatory (*).",
      });
    }

    if (!finalUserId) {
      return res.status(400).json({
        success: false,
        error: "Desired Login Name is mandatory (*).",
      });
    }

    if (!finalPassword) {
      return res.status(400).json({
        success: false,
        error: "Password is mandatory (*).",
      });
    }

    if (finalRePassword && finalPassword !== finalRePassword) {
      return res.status(400).json({
        success: false,
        error: "Passwords do not match. Please re-enter identical passwords.",
      });
    }

    // Check if desired login name (user_id) already exists in users table
    const [existing] = await pool.query(
      "SELECT no, user_id FROM users WHERE user_id = ? LIMIT 1",
      [finalUserId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: `Login name '${finalUserId}' already exists. Please choose a different login name.`,
      });
    }

    // Hash password using MD5 to match Silk Route auth specification
    const hashedPassword = hashPassword(finalPassword);

    const epfNumber = parseInt(finalEpf, 10) || null;

    // Insert user into airport_database.users
    const [insertResult] = await pool.query(
      `INSERT INTO users (
        epf_no,
        user_id,
        PassWord,
        id_name,
        email,
        tele,
        user_type,
        Status,
        Access_date,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', CURDATE(), ?)`,
      [
        epfNumber,
        finalUserId,
        hashedPassword,
        finalIdName,
        finalEmail || null,
        finalTele || null,
        finalUserType,
        createdBy || "admin",
      ]
    );

    // Optional: Log action in action_log
    try {
      await pool.query(
        "INSERT INTO action_log (user_id, cip_id, action, timestamp) VALUES (?, 0, ?, NOW())",
        [createdBy || "admin", `Created new user ${finalUserId} (EPF: ${finalEpf})`]
      );
    } catch (logErr) {
      console.warn("Could not write to action_log:", logErr.message);
    }

    res.status(201).json({
      success: true,
      message: "User registered successfully.",
      user: {
        id: insertResult.insertId,
        user_id: finalUserId,
        id_name: finalIdName,
        epf_no: epfNumber,
        email: finalEmail,
        tele: finalTele,
        user_type: finalUserType,
        Status: "Active",
      },
    });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({
      success: false,
      error: "An error occurred while registering user.",
      details: err.message,
    });
  }
});

// PUT /api/users/:id
// Edit / Update an existing user
router.put("/:id", async (req, res) => {
  try {
    const identifier = req.params.id;
    const isNumeric = /^\d+$/.test(identifier);

    // Find user first
    const [existingRows] = await pool.query(
      isNumeric
        ? "SELECT * FROM users WHERE no = ? OR user_id = ? LIMIT 1"
        : "SELECT * FROM users WHERE user_id = ? LIMIT 1",
      isNumeric ? [parseInt(identifier, 10), identifier] : [identifier]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found to update.",
      });
    }

    const current = existingRows[0];
    const {
      title,
      nameWithInitials,
      id_name,
      epfNo,
      epf_no,
      password,
      rePassword,
      email,
      contactNo,
      tele,
      userType,
      user_type,
      status,
      Status,
    } = req.body;

    let updatedName = (nameWithInitials || id_name || current.id_name).trim();
    if (title && !updatedName.toLowerCase().startsWith(title.toLowerCase())) {
      updatedName = `${title}. ${updatedName}`.trim();
    }

    const rawEpf = epfNo !== undefined ? epfNo : epf_no !== undefined ? epf_no : current.epf_no;
    const updatedEpf = rawEpf ? parseInt(rawEpf, 10) : current.epf_no;

    const updatedEmail = email !== undefined ? email.trim() : current.email;
    const updatedTele = contactNo !== undefined ? contactNo.trim() : tele !== undefined ? tele.trim() : current.tele;
    const updatedUserType = (userType || user_type || current.user_type || "user").trim();
    const updatedStatus = (status || Status || current.Status || "Active").trim();

    let updatedPassword = current.PassWord;
    if (password && password.trim()) {
      if (rePassword && password.trim() !== rePassword.trim()) {
        return res.status(400).json({
          success: false,
          error: "Passwords do not match.",
        });
      }
      updatedPassword = hashPassword(password.trim());
    }

    await pool.query(
      `UPDATE users
       SET id_name = ?,
           epf_no = ?,
           email = ?,
           tele = ?,
           user_type = ?,
           Status = ?,
           PassWord = ?
       WHERE no = ?`,
      [
        updatedName,
        updatedEpf,
        updatedEmail || null,
        updatedTele || null,
        updatedUserType,
        updatedStatus,
        updatedPassword,
        current.no,
      ]
    );

    // Optional: Log update in action_log
    try {
      await pool.query(
        "INSERT INTO action_log (user_id, cip_id, action, timestamp) VALUES (?, 0, ?, NOW())",
        [req.body.updatedBy || "admin", `Updated user ${current.user_id} (EPF: ${updatedEpf})`]
      );
    } catch (logErr) {
      console.warn("Could not write to action_log:", logErr.message);
    }

    res.json({
      success: true,
      message: "User details updated successfully.",
      user: {
        id: current.no,
        user_id: current.user_id,
        id_name: updatedName,
        epf_no: updatedEpf,
        email: updatedEmail,
        tele: updatedTele,
        user_type: updatedUserType,
        Status: updatedStatus,
      },
    });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({
      success: false,
      error: "An error occurred while updating user.",
      details: err.message,
    });
  }
});

module.exports = router;
