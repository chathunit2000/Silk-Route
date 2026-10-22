const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const nodemailer = require("nodemailer");

// Helpers for package code and display mapping
function getPackageCode(name = "") {
  const n = String(name).toLowerCase();
  if (n.includes("topaz-arrival") || n.includes("topaz arrival") || n === "d") return "D";
  if (n.includes("topaz-departure") || n.includes("topaz departure") || n === "e") return "E";
  if (n.includes("ruby") || n === "a") return "A";
  if (n.includes("sapphire") || n === "b") return "B";
  if (n.includes("amethyst") || n === "c") return "C";
  if (n.includes("garnet") || n === "f" || n === "g") return "F";
  return name.charAt(0).toUpperCase() || "E";
}

function getPackageDisplayName(code = "") {
  const c = String(code || "").toUpperCase().trim();
  if (c === "E" || c === "TOPAZ DEPARTURE" || c === "TOPAZ-DEPARTURE") return "Topaz Departure";
  if (c === "D" || c === "TOPAZ ARRIVAL" || c === "TOPAZ-ARRIVAL") return "Topaz Arrival";
  if (c === "A" || c === "RUBY") return "Ruby Package";
  if (c === "B" || c === "SAPPHIRE") return "Sapphire Package";
  if (c === "C" || c === "AMETHYST") return "Amethyst Package";
  if (c === "F" || c === "G" || c === "GARNET") return "Garnet";
  return code || "Standard Package";
}

// Tiered passenger discount helper:
// 1-4: 0%, 5-9: 5%, 10-14: 10%, 15-19: 15%, 20-24: 20%, >=25: 25%
function getPassengerDiscountRate(paxCount) {
  const count = parseInt(paxCount, 10) || 1;
  if (count >= 25) return 0.25;
  if (count >= 20) return 0.20;
  if (count >= 15) return 0.15;
  if (count >= 10) return 0.10;
  if (count >= 5) return 0.05;
  return 0;
}

function getRupeePackageUnitPrice(packageName) {
  const name = String(packageName || "").toLowerCase();
  if (name.includes("ruby")) return 41400;
  if (name.includes("sapphire")) return 24050;
  if (name.includes("amethyst")) return 32700;
  if (name.includes("topaz")) return 17350;
  return 7010;
}

function formatFlightDate(dateVal, timeVal) {
  if (!dateVal || dateVal === "0000-00-00") {
    return "-";
  }

  const str = String(dateVal).trim();
  if (
    !str ||
    str === "-" ||
    str.startsWith("0000") ||
    str.startsWith("00-00") ||
    str.includes("1899") ||
    str.includes("1900")
  ) {
    return "-";
  }

  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (isNaN(d.getTime())) return "-";

  const year = d.getFullYear();
  // Dates before 2000 are MySQL zero/invalid dates (such as 1899-11-29)
  if (year < 2000) {
    return "-";
  }

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");

  const time = timeVal && typeof timeVal === "string" ? timeVal.trim() : "";
  return time ? `${day}-${month}-${year} / ${time}` : `${day}-${month}-${year}`;
}

function formatAccessTime(dateVal) {
  if (!dateVal) {
    const now = new Date();
    return {
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 8),
    };
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return { date: "-", time: "" };
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}:${seconds}`,
  };
}

// GET /api/reservations/all
// Returns every reservation with passenger details for immigration/emigration reports.
router.get("/all", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        c.cip_id,
        COALESCE(NULLIF(c.Ref_no, ''), CONCAT(c.cip_id, '-MAN-PKG-', COALESCE(c.Package, 'E'))) AS ref_no,
        c.Arrival_date,
        c.Arrival_time,
        COALESCE(c.Arrv_Flight_no, '') AS Arrv_Flight_no,
        c.Departure_date,
        c.Departure_time,
        COALESCE(c.Dept_Flight_no, '') AS Dept_Flight_no,
        (SELECT GROUP_CONCAT(NULLIF(p.name, '') SEPARATOR ', ')
         FROM passenger p WHERE p.cip_id = c.cip_id) AS passenger_names,
        (SELECT GROUP_CONCAT(NULLIF(p.Passport_number, '') SEPARATOR ', ')
         FROM passenger p WHERE p.cip_id = c.cip_id) AS passport_numbers
      FROM cip c
      ORDER BY c.cip_id DESC
    `);

    const data = rows.map((row) => ({
      id: row.cip_id,
      referenceNo: row.ref_no,
      arrivalDateTime: formatFlightDate(row.Arrival_date, row.Arrival_time),
      arrivalFlightNo: row.Arrv_Flight_no,
      departureDateTime: formatFlightDate(row.Departure_date, row.Departure_time),
      departureFlightNo: row.Dept_Flight_no,
      passengerNames: row.passenger_names || "",
      passportNumbers: row.passport_numbers || "",
    }));

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error("GET /api/reservations/all failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reservations/credit/companies
// Corporate accounts are identified by users.no and their credit_balance rows.
router.get("/credit/companies", async (req, res) => {
  try {
    const [companies] = await pool.query(`
      SELECT
        cb.company_id,
        COALESCE(
          NULLIF(TRIM(u.organisation), ''),
          NULLIF(TRIM(u.id_name), ''),
          CONCAT('Company ', cb.company_id)
        ) AS organisation,
        cb.current_amount,
        cb.credit_limit,
        CASE
          WHEN cb.expired_on IS NULL OR YEAR(cb.expired_on) <= 1900 THEN NULL
          ELSE DATE_FORMAT(cb.expired_on, '%Y-%m-%d')
        END AS expired_on,
        CASE
          WHEN cb.expired_on IS NOT NULL AND YEAR(cb.expired_on) > 1900 AND cb.expired_on < CURRENT_DATE() THEN 1
          ELSE 0
        END AS is_expired,
        ROUND(GREATEST(0, cb.credit_limit - cb.current_amount), 2) AS remaining_credit,
        CASE
          WHEN cb.credit_limit <= 0 OR (cb.credit_limit - cb.current_amount) <= 0 THEN 1
          ELSE 0
        END AS is_limit_reached
      FROM credit_balance cb
      LEFT JOIN users u ON u.no = cb.company_id
      ORDER BY organisation, cb.company_id
    `);

    res.json({ success: true, companies });
  } catch (error) {
    console.error("GET /api/reservations/credit/companies failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load corporate credit accounts",
    });
  }
});

// GET /api/reservations/credit/check/:companyId
// Real-time verification of whether a company has remaining credits and valid expiry
router.get("/credit/check/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;
    const [rows] = await pool.query(
      `SELECT
        cb.company_id,
        COALESCE(
          NULLIF(TRIM(u.organisation), ''),
          NULLIF(TRIM(u.id_name), ''),
          CONCAT('Company ', cb.company_id)
        ) AS organisation,
        cb.current_amount,
        cb.credit_limit,
        CASE
          WHEN cb.expired_on IS NULL OR YEAR(cb.expired_on) <= 1900 THEN NULL
          ELSE DATE_FORMAT(cb.expired_on, '%Y-%m-%d')
        END AS expired_on,
        CASE
          WHEN cb.expired_on IS NOT NULL AND YEAR(cb.expired_on) > 1900 AND cb.expired_on < CURRENT_DATE() THEN 1
          ELSE 0
        END AS is_expired,
        ROUND(GREATEST(0, cb.credit_limit - cb.current_amount), 2) AS remaining_credit,
        CASE
          WHEN cb.credit_limit <= 0 OR (cb.credit_limit - cb.current_amount) <= 0 THEN 1
          ELSE 0
        END AS is_limit_reached
      FROM credit_balance cb
      LEFT JOIN users u ON u.no = cb.company_id
      WHERE cb.company_id = ?
      LIMIT 1`,
      [Number(companyId)]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        error: "Corporate credit account not found",
      });
    }

    const company = rows[0];
    const isExpired = Boolean(company.is_expired);
    const isLimitReached = Boolean(company.is_limit_reached);
    const canProceed = !isExpired && !isLimitReached;

    let reason = "";
    if (isExpired && isLimitReached) {
      reason = "Credit limit has been reached and bank guarantee has expired.";
    } else if (isExpired) {
      reason = "Corporate bank guarantee / credit period has expired.";
    } else if (isLimitReached) {
      reason = "Corporate credit limit has been reached. No remaining credits available.";
    }

    return res.json({
      success: true,
      company,
      canProceed,
      isExpired,
      isLimitReached,
      reason,
      remainingCredit: Number(company.remaining_credit || 0),
    });
  } catch (error) {
    console.error("GET /api/reservations/credit/check/:companyId failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to verify corporate credit status",
    });
  }
});

// GET /api/reservations/credit/company/:companyId
// Returns full company profile, credit balance, and payment history
router.get("/credit/company/:companyId", async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    if (!companyId) {
      return res.status(400).json({ success: false, error: "Invalid company ID" });
    }

    const [compRows] = await pool.query(
      `SELECT
        cb.company_id,
        COALESCE(
          NULLIF(TRIM(u.organisation), ''),
          NULLIF(TRIM(u.id_name), ''),
          CONCAT('Company ', cb.company_id)
        ) AS organisation,
        u.id_name,
        u.email,
        u.tele,
        u.Address,
        cb.current_amount,
        cb.credit_limit,
        CASE
          WHEN cb.expired_on IS NULL OR YEAR(cb.expired_on) <= 1900 THEN NULL
          ELSE DATE_FORMAT(cb.expired_on, '%Y-%m-%d')
        END AS expired_on,
        CASE
          WHEN cb.expired_on IS NOT NULL AND YEAR(cb.expired_on) > 1900 AND cb.expired_on < CURRENT_DATE() THEN 1
          ELSE 0
        END AS is_expired,
        ROUND(GREATEST(0, cb.credit_limit - cb.current_amount), 2) AS remaining_credit,
        CASE
          WHEN cb.credit_limit <= 0 OR (cb.credit_limit - cb.current_amount) <= 0 THEN 1
          ELSE 0
        END AS is_limit_reached
      FROM credit_balance cb
      LEFT JOIN users u ON u.no = cb.company_id
      WHERE cb.company_id = ?
      LIMIT 1`,
      [companyId]
    );

    if (!compRows.length) {
      return res.status(404).json({ success: false, error: "Company not found" });
    }

    const [historyRows] = await pool.query(
      `SELECT
        no AS payment_id,
        company_id,
        amount,
        updated_by,
        DATE_FORMAT(updated_time, '%Y-%m-%d %H:%i') AS updated_time,
        remarks,
        outstanding_amount
      FROM crdt_payment_history
      WHERE company_id = ?
      ORDER BY no DESC
      LIMIT 50`,
      [companyId]
    );

    res.json({
      success: true,
      company: compRows[0],
      payments: historyRows,
    });
  } catch (error) {
    console.error("GET /api/reservations/credit/company/:companyId failed:", error);
    res.status(500).json({ success: false, error: "Failed to load company details" });
  }
});

// PUT /api/reservations/credit/company/:companyId/expiry
// Updates a corporate account's credit facility expiry date.
router.put("/credit/company/:companyId/expiry", async (req, res) => {
  try {
    const companyId = Number(req.params.companyId);
    const expiryDate = String(req.body.expiryDate || "").trim();
    const dateMatch = expiryDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const parsedDate = dateMatch
      ? new Date(Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3])))
      : null;

    if (
      !Number.isInteger(companyId) ||
      companyId <= 0 ||
      !dateMatch ||
      parsedDate.toISOString().slice(0, 10) !== expiryDate
    ) {
      return res.status(400).json({ success: false, error: "A valid company and expiry date are required." });
    }

    const [result] = await pool.query(
      "UPDATE credit_balance SET expired_on = ? WHERE company_id = ?",
      [expiryDate, companyId]
    );
    if (!result.affectedRows) {
      const [companyRows] = await pool.query(
        "SELECT company_id FROM credit_balance WHERE company_id = ? LIMIT 1",
        [companyId]
      );
      if (!companyRows.length) {
        return res.status(404).json({ success: false, error: "Credit account not found." });
      }
    }

    res.json({ success: true, expiryDate });
  } catch (error) {
    console.error("PUT /api/reservations/credit/company/:companyId/expiry failed:", error);
    res.status(500).json({ success: false, error: "Failed to update credit expiry date." });
  }
});

// POST /api/reservations/credit/payment
// Records a payment from a corporate credit company, reducing outstanding credit
router.post("/credit/payment", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { companyId, amount, remarks, updatedBy } = req.body;
    const cid = parseInt(companyId, 10);
    const payAmount = parseFloat(amount);

    if (!cid || !Number.isFinite(payAmount) || payAmount <= 0) {
      connection.release();
      return res.status(400).json({
        success: false,
        error: "Valid company ID and positive payment amount are required.",
      });
    }

    await connection.beginTransaction();

    // 1. Get current balance
    const [balanceRows] = await connection.query(
      `SELECT company_id, current_amount, credit_limit FROM credit_balance WHERE company_id = ? FOR UPDATE`,
      [cid]
    );

    if (!balanceRows.length) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, error: "Credit account not found" });
    }

    const currentAmount = parseFloat(balanceRows[0].current_amount || 0);
    const newCurrentAmount = Math.max(0, currentAmount - payAmount);
    const actor = (updatedBy || "Finance User").trim().slice(0, 100);
    const note = (remarks || "").trim().slice(0, 250);

    // 2. Update credit_balance
    await connection.query(
      `UPDATE credit_balance
       SET current_amount = ?, updatedBy = ?
       WHERE company_id = ?`,
      [newCurrentAmount, actor, cid]
    );

    // 3. Insert record into crdt_payment_history
    const [histResult] = await connection.query(
      `INSERT INTO crdt_payment_history
       (company_id, amount, updated_by, updated_time, remarks, outstanding_amount)
       VALUES (?, ?, ?, NOW(), ?, ?)`,
      [cid, payAmount, actor, note, newCurrentAmount]
    );

    await connection.commit();
    connection.release();

    res.json({
      success: true,
      message: "Payment successfully recorded.",
      paymentId: histResult.insertId,
      newCurrentAmount,
      previousAmount: currentAmount,
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("POST /api/reservations/credit/payment failed:", error);
    res.status(500).json({ success: false, error: "Failed to record payment" });
  }
});

// POST /api/reservations/credit/company
// Creates a new credit company in users and credit_balance tables
router.post("/credit/company", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      organisation,
      id_name,
      creditLimit,
      expiredOn,
      address,
      email,
      tele,
      createdBy,
    } = req.body;

    const orgName = (organisation || "").trim();
    if (!orgName) {
      connection.release();
      return res.status(400).json({ success: false, error: "Company name is required." });
    }

    const limitVal = parseFloat(creditLimit) || 0;
    const contactName = (id_name || orgName).trim().slice(0, 250);
    const addr = (address || "").trim().slice(0, 250);
    const mail = (email || "").trim().slice(0, 50);
    const phone = (tele || "").trim().slice(0, 50);
    const author = (createdBy || "Admin").trim().slice(0, 50);

    let expiryDate = "1899-11-29";
    if (expiredOn && /^\d{4}-\d{2}-\d{2}$/.test(expiredOn)) {
      expiryDate = expiredOn;
    }

    await connection.beginTransaction();

    // 1. Insert into users table
    const [userResult] = await connection.query(
      `INSERT INTO users (id_name, organisation, Address, email, tele, user_type, Status, created_by)
       VALUES (?, ?, ?, ?, ?, 'credit', 'Active', ?)`,
      [contactName, orgName, addr, mail, phone, author]
    );

    const newCompanyId = userResult.insertId;

    // 2. Insert into credit_balance table
    await connection.query(
      `INSERT INTO credit_balance (company_id, current_amount, credit_limit, expired_on, updatedBy)
       VALUES (?, 0.00, ?, ?, ?)`,
      [newCompanyId, limitVal, expiryDate, author]
    );

    await connection.commit();
    connection.release();

    res.json({
      success: true,
      message: "Credit company created successfully.",
      company: {
        company_id: newCompanyId,
        organisation: orgName,
        id_name: contactName,
        credit_limit: limitVal,
        current_amount: 0,
        expired_on: expiryDate === "1899-11-29" ? null : expiryDate,
      },
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("POST /api/reservations/credit/company failed:", error);
    res.status(500).json({ success: false, error: "Failed to create credit company" });
  }
});

// GET /api/reservations/visitors?date=YYYY-MM-DD
// Returns visitor details for reservations arriving on the selected date.
router.get("/visitors", async (req, res) => {
  try {
    const date = String(req.query.date || "");
    const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateMatch) {
      return res.status(400).json({
        success: false,
        error: "A valid date in YYYY-MM-DD format is required.",
      });
    }

    const [, year, month, day] = dateMatch;
    const parsedDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (
      parsedDate.getUTCFullYear() !== Number(year) ||
      parsedDate.getUTCMonth() !== Number(month) - 1 ||
      parsedDate.getUTCDate() !== Number(day)
    ) {
      return res.status(400).json({
        success: false,
        error: "A valid date in YYYY-MM-DD format is required.",
      });
    }

    const [rows] = await pool.query(
      `SELECT
        c.cip_id,
        COALESCE(NULLIF(c.Ref_no, ''), CONCAT(c.cip_id, '-MAN-PKG-', COALESCE(c.Package, 'E'))) AS ref_no,
        c.Arrival_date,
        c.Arrival_time,
        COALESCE(c.Arrv_Flight_no, '') AS arrival_flight_no,
        COALESCE(c.visitor1, '') AS visitor1,
        COALESCE(c.visitor2, '') AS visitor2,
        COALESCE(c.vehicle_no, '') AS vehicle_no
      FROM cip c
      WHERE c.Arrival_date >= ? AND c.Arrival_date < DATE_ADD(?, INTERVAL 1 DAY)
      ORDER BY c.Arrival_time ASC, c.cip_id DESC`,
      [date, date]
    );

    const data = rows.map((row, index) => ({
      no: index + 1,
      referenceNo: row.ref_no,
      arrivalDateTime: formatFlightDate(row.Arrival_date, row.Arrival_time),
      arrivalFlightNo: row.arrival_flight_no,
      visitors: [row.visitor1, row.visitor2]
        .map((value) =>
          String(value || "")
            .split("/")
            .map((part) => part.trim())
            .filter((part) => part && part.toLowerCase() !== "n/a")
            .join(" / ")
        )
        .filter(Boolean)
        .join(", "),
      vehicleNo: String(row.vehicle_no || "").trim(),
    }));

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error("GET /api/reservations/visitors failed:", error);
    res.status(500).json({ success: false, error: "Failed to load visitor details." });
  }
});

// GET /api/reservations/pending
// Returns list of pending reservations matching airport_database.cip schema and pending screen table
router.get("/pending", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const search = (req.query.search || "").trim();

    let query = `
      SELECT
        c.cip_id,
        COALESCE(NULLIF(c.entered_by, ''), 'Online') AS reported_by,
        c.Package,
        COALESCE(NULLIF(c.Ref_no, ''), CONCAT(c.cip_id, '-MAN-PKG-', COALESCE(c.Package, 'E'))) AS ref_no,
        c.Arrival_date,
        c.Arrival_time,
        COALESCE(c.Arrv_Flight_no, '') AS Arrv_Flight_no,
        c.Departure_date,
        c.Departure_time,
        COALESCE(c.Dept_Flight_no, '') AS Dept_Flight_no,
        COALESCE(NULLIF(c.Currency_Type, ''), 'Rs. ') AS currency,
        COALESCE(NULLIF(c.Amount_New, 0), NULLIF(c.Amount, ''), 0) AS amount,
        COALESCE(NULLIF(c.Number_Of_Passengers, ''), '1') AS pax_count,
        c.Accessed_time,
        c.Bank_message,
        c.status,
        c.Local_contact_name,
        c.Local_contact_tp,
        c.E_mail,
        c.Telephone,
        c.Comments,
        (SELECT name FROM passenger WHERE cip_id = c.cip_id LIMIT 1) AS passenger_name
      FROM cip c
      WHERE (c.Bank_message != 'Approved' OR c.Bank_message IS NULL OR c.Bank_message = '')
    `;

    const params = [];
    if (search) {
      query += ` AND (c.Ref_no LIKE ? OR c.cip_id LIKE ? OR c.Local_contact_name LIKE ? OR c.Arrv_Flight_no LIKE ? OR c.Dept_Flight_no LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    query += ` ORDER BY c.cip_id DESC LIMIT ?`;
    params.push(limit);

    const [rows] = await pool.query(query, params);

    const data = rows.map((row, idx) => {
      const accessTimeObj = formatAccessTime(row.Accessed_time);
      const numAmount = parseFloat(row.amount) || 0;
      const amountStr = numAmount > 0 ? numAmount.toFixed(2) : "0.00";

      return {
        id: row.cip_id,
        no: idx + 1,
        reportedBy: row.reported_by,
        package: getPackageDisplayName(row.Package),
        packageCode: row.Package,
        referenceNo: row.ref_no,
        arrivalDateTime: formatFlightDate(row.Arrival_date, row.Arrival_time),
        arrivalFlightNo: row.Arrv_Flight_no,
        departureDateTime: formatFlightDate(row.Departure_date, row.Departure_time),
        departureFlightNo: row.Dept_Flight_no,
        currency: row.currency ? row.currency.trim() : "Rs.",
        amount: amountStr,
        passengerCount: parseInt(row.pax_count, 10) || 1,
        passengerName: row.passenger_name || row.Local_contact_name || "Guest",
        accessDate: accessTimeObj.date,
        accessTime: accessTimeObj.time,
        bankMessage: row.Bank_message || "Pending",
        status: row.status || "Pending",
        comments: row.Comments || "",
        localContactName: row.Local_contact_name || "",
        localContactPhone: row.Local_contact_tp || "",
      };
    });

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("GET /api/reservations/pending failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reservations/confirmed
// Returns reservations with approved payments from airport_database.cip.
router.get("/confirmed", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const search = (req.query.search || "").trim();

    let query = `
      SELECT
        c.cip_id,
        COALESCE(NULLIF(c.entered_by, ''), 'Online') AS reported_by,
        c.Package,
        COALESCE(NULLIF(c.Ref_no, ''), CONCAT(c.cip_id, '-MAN-PKG-', COALESCE(c.Package, 'E'))) AS ref_no,
        c.Arrival_date,
        c.Arrival_time,
        COALESCE(c.Arrv_Flight_no, '') AS Arrv_Flight_no,
        c.Departure_date,
        c.Departure_time,
        COALESCE(c.Dept_Flight_no, '') AS Dept_Flight_no,
        COALESCE(NULLIF(c.Currency_Type, ''), 'Rs. ') AS currency,
        COALESCE(NULLIF(c.Amount_New, 0), NULLIF(c.Amount, ''), 0) AS amount,
        COALESCE(NULLIF(c.Number_Of_Passengers, ''), '1') AS pax_count,
        c.Accessed_time,
        c.payment_access_time,
        COALESCE(c.payment_ref, '') AS payment_ref,
        COALESCE(NULLIF(c.Bank_message, ''), 'Approved') AS Bank_message,
        COALESCE(NULLIF(c.status, ''), 'Confirmed') AS status,
        c.Local_contact_name,
        c.Local_contact_tp,
        c.E_mail,
        c.Telephone,
        c.Comments,
        COALESCE((SELECT name FROM passenger WHERE cip_id = c.cip_id LIMIT 1), NULLIF(c.proffession, ''), c.Local_contact_name, 'Passenger') AS passenger_name
      FROM cip c
      WHERE c.Bank_message = 'Approved'
    `;

    const params = [];
    if (search) {
      query += ` AND (c.Ref_no LIKE ? OR c.cip_id LIKE ? OR c.Local_contact_name LIKE ? OR c.payment_ref LIKE ? OR c.Arrv_Flight_no LIKE ? OR c.Dept_Flight_no LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s);
    }

    query += ` ORDER BY COALESCE(c.payment_access_time, c.Accessed_time) DESC, c.cip_id DESC LIMIT ?`;
    params.push(limit);

    const [rows] = await pool.query(query, params);

    const data = rows.map((row, idx) => {
      const accessTimeObj = formatAccessTime(row.payment_access_time || row.Accessed_time);
      const numAmount = parseFloat(row.amount) || 0;
      const amountStr = numAmount > 0 ? numAmount.toFixed(2) : "0.00";

      return {
        id: row.cip_id,
        no: idx + 1,
        reportedBy: row.reported_by,
        package: getPackageDisplayName(row.Package),
        packageCode: row.Package,
        referenceNo: row.ref_no,
        arrivalDateTime: formatFlightDate(row.Arrival_date, row.Arrival_time),
        arrivalFlightNo: row.Arrv_Flight_no,
        departureDateTime: formatFlightDate(row.Departure_date, row.Departure_time),
        departureFlightNo: row.Dept_Flight_no,
        currency: row.currency ? row.currency.trim() : "Rs.",
        amount: amountStr,
        paymentRef: row.payment_ref || "-",
        passengerCount: parseInt(row.pax_count, 10) || 1,
        passengerName: row.passenger_name || row.Local_contact_name || "Guest",
        accessDate: accessTimeObj.date,
        accessTime: accessTimeObj.time,
        bankMessage: "Approved",
        status: "Confirmed",
        comments: row.Comments || "",
        localContactName: row.Local_contact_name || "",
        localContactPhone: row.Local_contact_tp || "",
      };
    });

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("GET /api/reservations/confirmed failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

async function updateReservation(req, res, expectedState) {
  let connection;
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(String(id))) {
      return res.status(400).json({ success: false, error: "Invalid reservation ID." });
    }

    const body = req.body || {};
    const updatedBy = String(body.updatedBy || "Administrator").slice(0, 20);
    connection = await pool.getConnection();
    await connection.query("SET sql_mode = ''");
    await connection.beginTransaction();

    const [[reservation]] = await connection.query(
      "SELECT cip_id, Bank_message, Package FROM cip WHERE cip_id = ? FOR UPDATE",
      [id]
    );
    if (!reservation) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: "Reservation not found." });
    }

    const isConfirmed = reservation.Bank_message === "Approved";
    if ((expectedState === "confirmed") !== isConfirmed) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        error: `Reservation is not ${expectedState}. Refresh the list and try again.`,
      });
    }

    const fields = [];
    const values = [];
    if (body.packageCode !== undefined) {
      const currentPackage = String(reservation.Package || "").toUpperCase();
      const newPackage = String(body.packageCode).toUpperCase();
      const isTopazBooking = ["D", "E"].includes(currentPackage);
      if (
        (isTopazBooking && !["D", "E"].includes(newPackage)) ||
        (!isTopazBooking && newPackage !== currentPackage)
      ) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: "Only Topaz Arrival and Topaz Departure reservations can change package type.",
        });
      }
      if (isTopazBooking && newPackage !== currentPackage) {
        fields.push("Package = ?");
        values.push(newPackage);
      }
    }
    const addField = (key, column, transform = (value) => value) => {
      if (body[key] !== undefined) {
        fields.push(`${column} = ?`);
        values.push(transform(body[key]));
      }
    };

    addField("paymentRef", "payment_ref");
    if (body.paymentRef !== undefined) {
      fields.push("payment_access_time = NOW()");
    }
    addField("bankMessage", "Bank_message");
    if (body.bankMessage === "Approved") {
        fields.push("status = 'Confirmed'");
    }

    addField("arrivalDate", "Arrival_date", (value) => value || "0000-00-00");
    addField("arrivalTime", "Arrival_time");
    addField("arrivalFlightNo", "Arrv_Flight_no");
    addField("arrivalStayHrs", "arrv_hourse");
    addField("departureDate", "Departure_date", (value) => value || "0000-00-00");
    addField("departureTime", "Departure_time");
    addField("departureFlightNo", "Dept_Flight_no");
    addField("departureStayHrs", "dept_hourse");
    addField("numberOfPassengers", "Number_Of_Passengers", String);
    addField("passengerCount", "Number_Of_Passengers", String);
    addField("leadPassengerName", "proffession");
    addField("leadEmail", "E_mail");
    addField("leadPhone", "Telephone");
    addField("localContactName", "Local_contact_name");
    addField("localContactPhone", "Local_contact_tp");
    addField("localContactEmail", "Local_email");
    addField("localOrganisation", "Local_company");
    addField("visitor1Name", "visitor1");
    addField("visitor1Id", "visitor1_id");
    addField("visitor2Name", "visitor2");
    addField("visitor2Id", "visitor2_id");
    addField("vehicleNos", "vehicle_no");
    addField("amount", "Amount_New");
    addField("comments", "Comments");
    fields.push("updated_by = ?");
    values.push(updatedBy);

    if (Array.isArray(body.passengers)) {
      if (body.passengers.length === 0 || body.passengers.length > 250) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: "A reservation must include between 1 and 250 passengers.",
        });
      }
      for (const passenger of body.passengers) {
        if (!passenger || typeof passenger !== "object" || Array.isArray(passenger)) {
          await connection.rollback();
          return res.status(400).json({ success: false, error: "Invalid passenger details." });
        }
        const name = String(passenger.name || "").trim();
        const passport = String(passenger.Passport_number || "").trim();
        const refreshments = String(passenger.Refreshments || "").trim();
        if (name.length > 250 || passport.length > 11 || refreshments.length > 20) {
          await connection.rollback();
          return res.status(400).json({ success: false, error: "Passenger details exceed allowed field lengths." });
        }
      }

      await connection.query("DELETE FROM passenger WHERE cip_id = ?", [id]);
      for (const passenger of body.passengers) {
        await connection.query(
          "INSERT INTO passenger (cip_id, name, Passport_number, Refreshments) VALUES (?, ?, ?, ?)",
          [
            id,
            String(passenger.name || "").trim(),
            String(passenger.Passport_number || "").trim(),
            String(passenger.Refreshments || "").trim(),
          ]
        );
      }
    } else if (body.passengers !== undefined) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: "Passenger details must be an array." });
    }

    values.push(id);
    await connection.query(`UPDATE cip SET ${fields.join(", ")} WHERE cip_id = ?`, values);

    const logAction =
      body.bankMessage === "Approved"
        ? "Updated Bank_message to Approved"
        : `Updated ${expectedState} reservation details`;
    await connection.query(
      "INSERT INTO action_log (user_id, cip_id, action, timestamp) VALUES (?, ?, ?, NOW())",
      [updatedBy, String(id), logAction]
    );

    await connection.commit();
    res.json({ success: true, message: "Reservation updated successfully." });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error(`PUT /api/reservations/${expectedState}/:id failed:`, error);
    res.status(error.status || 500).json({ success: false, error: error.message });
  } finally {
    if (connection) connection.release();
  }
}

async function deleteReservation(req, res, expectedState) {
  let connection;
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(String(id))) {
      return res.status(400).json({ success: false, error: "Invalid reservation ID." });
    }

    const deletedBy = String(req.body?.deletedBy || "Administrator").slice(0, 255);
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [[reservation]] = await connection.query(
      "SELECT cip_id, Ref_no, Bank_message FROM cip WHERE cip_id = ? FOR UPDATE",
      [id]
    );
    if (!reservation) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: "Reservation not found." });
    }

    const isConfirmed = reservation.Bank_message === "Approved";
    if ((expectedState === "confirmed") !== isConfirmed) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        error: `Reservation is not ${expectedState}. Refresh the list and try again.`,
      });
    }

    await connection.query("DELETE FROM passenger WHERE cip_id = ?", [id]);
    await connection.query("DELETE FROM cip WHERE cip_id = ?", [id]);
    await connection.query(
      "INSERT INTO action_log (user_id, cip_id, action, timestamp) VALUES (?, ?, ?, NOW())",
      [
        deletedBy,
        String(id),
        `Deleted ${expectedState} reservation ${reservation.Ref_no || id}`,
      ]
    );

    await connection.commit();
    res.json({ success: true, message: "Reservation deleted successfully." });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error(`DELETE /api/reservations/${expectedState}/:id failed:`, error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) connection.release();
  }
}

// Update pending reservation details or approve payment.
router.put("/pending/:id", (req, res) => updateReservation(req, res, "pending"));
router.put("/confirmed/:id", (req, res) => updateReservation(req, res, "confirmed"));
router.delete("/pending/:id", (req, res) => deleteReservation(req, res, "pending"));
router.delete("/confirmed/:id", (req, res) => deleteReservation(req, res, "confirmed"));

// POST /api/reservations
// Creates a new reservation in airport_database.cip and airport_database.passenger
router.post("/", async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query("SET sql_mode = ''");
    await connection.beginTransaction();

    const {
      packageName,
      bookingType = "online",
      arrivalDate,
      arrivalTime,
      arrivalFlightNumber,
      departureDate,
      departureTime,
      departureFlightNumber,
      leadName,
      leadEmail,
      leadPhone,
      localContactName,
      localContactNumber,
      localContactEmail,
      localOrganisation,
      visitor1Name,
      visitor1Id,
      visitor2Name,
      visitor2Id,
      vehicleNos,
      comments,
      paxCount = 1,
      totalAmount = 0,
      currencyType = "Rs. ",
      passengers = [],
      enteredBy = "7198",
      bankMessage = "", // Pending by default so it shows up in Pending Payments!
      status = "Pending",
      isCreditReservation = false,
      companyId,
    } = req.body;

    const requiredText = (value) => typeof value === "string" && value.trim().length > 0;
    const contactEmail = typeof leadEmail === "string" ? leadEmail.trim() : "";
    const currencyCode = String(currencyType || "").trim();
    const allowedTitles = new Set(["Mr", "Mrs", "Ms", "Rev", "Dr", "Prof"]);
    if (
      !Array.isArray(passengers) ||
      passengers.length === 0 ||
      passengers.some(
        (passenger) =>
          !passenger ||
          typeof passenger !== "object" ||
          !allowedTitles.has(String(passenger.title || "").trim()) ||
          !requiredText(passenger.name) ||
          !requiredText(passenger.passportNo) ||
          String(passenger.name).trim().length > 250 ||
          String(passenger.passportNo).trim().length > 11
      )
    ) {
      const error = new Error("Each passenger must have a valid title, name, and passport number.");
      error.status = 400;
      throw error;
    }
    if (!["Rs.", "US $", "EUR", "GBP"].includes(currencyCode)) {
      const error = new Error("A valid payment currency must be selected.");
      error.status = 400;
      throw error;
    }
    if (!requiredText(leadName) || String(leadName).trim().length > 100) {
      const error = new Error("Lead passenger name is required and must be 100 characters or fewer.");
      error.status = 400;
      throw error;
    }
    if (
      !requiredText(leadEmail) ||
      contactEmail.length > 50 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)
    ) {
      const error = new Error("A valid lead passenger e-mail address is required.");
      error.status = 400;
      throw error;
    }
    if (!requiredText(leadPhone) || String(leadPhone).trim().length > 20) {
      const error = new Error("Lead passenger contact number is required and must be 20 characters or fewer.");
      error.status = 400;
      throw error;
    }

    let creditAccount = null;
    if (isCreditReservation) {
      if (!/^\d+$/.test(String(companyId || ""))) {
        const error = new Error("A valid corporate credit account is required.");
        error.status = 400;
        throw error;
      }

      if (String(currencyType).trim() !== "Rs.") {
        const error = new Error("Corporate credit reservations must be booked in Rupees.");
        error.status = 400;
        throw error;
      }

      const [[account]] = await connection.query(
        `SELECT
          cb.company_id,
          cb.current_amount,
          cb.credit_limit,
          cb.expired_on,
          (cb.expired_on IS NOT NULL AND YEAR(cb.expired_on) > 1900 AND cb.expired_on < CURRENT_DATE()) AS is_expired,
          COALESCE(
            (SELECT NULLIF(TRIM(u.organisation), '') FROM users u WHERE u.no = cb.company_id LIMIT 1),
            (SELECT NULLIF(TRIM(u.id_name), '') FROM users u WHERE u.no = cb.company_id LIMIT 1),
            CONCAT('Company ', cb.company_id)
          ) AS organisation
        FROM credit_balance cb
        WHERE cb.company_id = ?
        FOR UPDATE`,
        [Number(companyId)]
      );

      if (!account) {
        const error = new Error("The selected corporate credit account was not found.");
        error.status = 404;
        throw error;
      }
      if (account.is_expired) {
        const error = new Error("The selected corporate credit account has expired.");
        error.status = 409;
        throw error;
      }
      creditAccount = account;
    }

    // Format dates safely
    const arrvDate = arrivalDate ? arrivalDate.slice(0, 10) : "0000-00-00";
    const arrvTime = arrivalTime || (arrivalDate && arrivalDate.includes("T") ? arrivalDate.split("T")[1].slice(0, 5) : (arrivalDate && arrivalDate.includes(" ") ? arrivalDate.split(" ")[1].slice(0, 5) : ""));
    const deptDate = departureDate ? departureDate.slice(0, 10) : "0000-00-00";
    const deptTime = departureTime || (departureDate && departureDate.includes("T") ? departureDate.split("T")[1].slice(0, 5) : (departureDate && departureDate.includes(" ") ? departureDate.split(" ")[1].slice(0, 5) : ""));

    const v1Str = visitor1Name ? (visitor1Id ? `${visitor1Name} / ${visitor1Id}` : visitor1Name) : "";
    const v1IdStr = visitor1Id || "";
    const v2Str = visitor2Name ? (visitor2Id ? `${visitor2Name} / ${visitor2Id}` : visitor2Name) : "";
    const v2IdStr = visitor2Id || "";

    const pkgCode = getPackageCode(packageName);

    let finalAmount = Number.parseFloat(totalAmount);
    if (String(currencyType).trim() === "Rs.") {
      const passengerCount = parseInt(paxCount, 10) || 1;
      const subtotal = getRupeePackageUnitPrice(packageName) * passengerCount;
      const rate = getPassengerDiscountRate(passengerCount);
      finalAmount = Number((subtotal - subtotal * rate).toFixed(2));
    } else if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      const pkgLower = String(packageName || "").toLowerCase();
      const baseUnit = getRupeePackageUnitPrice(pkgLower);
      const rate = getPassengerDiscountRate(paxCount);
      const subtotal = baseUnit * (parseInt(paxCount, 10) || 1);
      finalAmount = parseFloat((subtotal - subtotal * rate).toFixed(2));
    }

    if (creditAccount) {
      finalAmount = Number(finalAmount.toFixed(2));
      const currentAmount = Number(creditAccount.current_amount);
      const creditLimit = Number(creditAccount.credit_limit);
      if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
        const error = new Error("A valid reservation amount is required for corporate credit.");
        error.status = 400;
        throw error;
      }
      if (currentAmount + finalAmount > creditLimit) {
        const error = new Error("The selected account does not have enough available credit.");
        error.status = 409;
        throw error;
      }
    }

    // Insert into cip table with Pending state
    const [cipResult] = await connection.query(
      `INSERT INTO cip (
        Package,
        booking_type,
        Arrv_Flight_no,
        Dept_Flight_no,
        Arrival_date,
        Arrival_time,
        Departure_date,
        Departure_time,
        Telephone,
        E_mail,
        Local_contact_name,
        Local_contact_tp,
        Local_email,
        Local_company,
        visitor1,
        visitor1_id,
        visitor2,
        visitor2_id,
        vehicle_no,
        Comments,
        Accessed_time,
        Amount,
        Amount_New,
        Currency_Type,
        Number_Of_Passengers,
        Bank_message,
        entered_by,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?)`,
      [
        pkgCode,
        creditAccount ? "credit" : bookingType,
        arrivalFlightNumber || "",
        departureFlightNumber || "",
        arrvDate,
        arrvTime,
        deptDate,
        deptTime,
        leadPhone || "",
        leadEmail || "",
        localContactName || "",
        localContactNumber || "",
        localContactEmail || "",
        creditAccount ? creditAccount.organisation : (localOrganisation || ""),
        v1Str,
        v1IdStr,
        v2Str,
        v2IdStr,
        vehicleNos || "",
        comments || "",
        finalAmount,
        finalAmount,
        currencyType,
        paxCount,
        creditAccount ? "Credit" : bankMessage,
        enteredBy,
        creditAccount ? "Pending" : status,
      ]
    );

    const cipId = cipResult.insertId;
    const refNo = `${cipId}-${creditAccount ? "CRD" : "MAN"}-PKG-${pkgCode}`;

    // Update ref_no
    await connection.query("UPDATE cip SET Ref_no = ? WHERE cip_id = ?", [refNo, cipId]);

    // Insert passengers
    if (Array.isArray(passengers) && passengers.length > 0) {
      for (const pax of passengers) {
        const titlePrefix = pax.title ? `${pax.title}. ` : "";
        const fullName = `${titlePrefix}${pax.name || leadName || "Passenger"}`.trim();
        await connection.query(
          `INSERT INTO passenger (cip_id, name, Passport_number, Refreshments) VALUES (?, ?, ?, ?)`,
          [cipId, fullName, pax.passportNo || "", pax.refreshment || ""]
        );
      }
    } else {
      await connection.query(
        `INSERT INTO passenger (cip_id, name, Passport_number, Refreshments) VALUES (?, ?, ?, ?)`,
        [cipId, leadName || "Passenger", "", ""]
      );
    }

    if (creditAccount) {
      const previousAmount = Number(creditAccount.current_amount);
      const currentAmount = Number((previousAmount + finalAmount).toFixed(2));
      await connection.query(
        `UPDATE credit_balance
         SET current_amount = ?, updatedBy = ?
         WHERE company_id = ?`,
        [currentAmount, String(enteredBy || "admin").slice(0, 150), creditAccount.company_id]
      );
      await connection.query(
        `INSERT INTO crdt_booking_history
          (company_id, cip_id, no_of_pax, previous_amount, current_amount, Accessed_time)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [creditAccount.company_id, cipId, paxCount, previousAmount, currentAmount]
      );
    }

    // Log action to action_log
    await connection.query(
      `INSERT INTO action_log (user_id, cip_id, action, timestamp) VALUES (?, ?, ?, NOW())`,
      [
        enteredBy || "admin",
        String(cipId),
        creditAccount
          ? `Created on-credit reservation ${refNo} for company ${creditAccount.company_id}`
          : `Created Pending CIP reservation ${refNo}`,
      ]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      bookingId: cipId,
      refNo,
      message: "Pending reservation recorded successfully!",
      ...(creditAccount && {
        creditBalance: Number((Number(creditAccount.current_amount) + finalAmount).toFixed(2)),
      }),
      details: {
        cipId,
        refNo,
        packageName: getPackageDisplayName(pkgCode),
        leadName,
        totalAmount,
        currencyType,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Error creating reservation:", error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message || "Failed to create reservation",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// POST /api/reservations/:id/email-receipt
// Emails the generated booking PDF to the passenger email saved with the reservation.
router.post("/:id/email-receipt", async (req, res) => {
  try {
    const reservationId = Number(req.params.id);
    const pdfBase64 = String(req.body.receiptPdfBase64 || "");
    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      return res.status(400).json({ success: false, error: "A valid reservation ID is required." });
    }
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(pdfBase64) || pdfBase64.length > 4_000_000) {
      return res.status(400).json({ success: false, error: "A valid PDF receipt is required." });
    }

    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    if (pdfBuffer.length < 5 || pdfBuffer.subarray(0, 5).toString() !== "%PDF-") {
      return res.status(400).json({ success: false, error: "The receipt attachment is not a valid PDF." });
    }

    const [[reservation]] = await pool.query(
      `SELECT Ref_no AS referenceNo, E_mail AS email FROM cip WHERE cip_id = ?`,
      [reservationId]
    );
    if (!reservation) {
      return res.status(404).json({ success: false, error: "Reservation not found." });
    }
    const recipient = String(reservation.email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      return res.status(400).json({ success: false, error: "A valid passenger email address is required to send the receipt." });
    }

    const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
    if (!SMTP_HOST?.trim() || !SMTP_USER?.trim() || !SMTP_PASS) {
      return res.status(503).json({
        success: false,
        error: "Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in the backend environment.",
      });
    }

    const smtpPort = SMTP_PORT ? Number(SMTP_PORT) : 587;
    if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
      return res.status(503).json({
        success: false,
        error: "SMTP_PORT must be a valid port number.",
      });
    }
    const smtpHost = SMTP_HOST.trim();
    const secure = SMTP_SECURE?.trim()
      ? SMTP_SECURE.trim().toLowerCase() === "true"
      : smtpPort === 465;
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure,
      requireTLS: !secure,
      tls: { servername: smtpHost, minVersion: "TLSv1.2" },
      auth: { user: SMTP_USER.trim(), pass: SMTP_PASS },
      connectionTimeout: 30000,
      greetingTimeout: 15000,
      socketTimeout: 60000,
    });
    const safeReference = String(reservation.referenceNo || `CIP-${reservationId}`).replace(/[^A-Za-z0-9_-]/g, "-");
    await transporter.sendMail({
      from: SMTP_FROM?.trim() || SMTP_USER.trim(),
      to: recipient,
      cc: process.env.BOOKING_EMAIL_CC?.trim() || "nalindatilak@gmail.com",
      subject: `Silk Route reservation receipt - ${safeReference}`,
      text: `Dear Passenger,\n\nYour Silk Route reservation ${reservation.referenceNo || safeReference} has been recorded. Please find the booking receipt PDF attached. If payment is pending, the payable amount is shown on the receipt.\n\nSilk Route Reservations`,
      attachments: [{
        filename: `Silk-Route-Receipt-${safeReference}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      }],
    });

    res.json({ success: true, message: "Booking receipt emailed to the passenger.", recipient });
  } catch (error) {
    console.error("POST /api/reservations/:id/email-receipt failed:", error);
    const message =
      error.code === "ETIMEDOUT" && error.command === "CONN"
        ? "SMTP TLS connection timed out. For Gmail, use SMTP_PORT=465 with SMTP_SECURE=true or SMTP_PORT=587 with SMTP_SECURE=false, and make sure outbound SMTP is allowed by the network."
        : "The reservation was saved, but the receipt email could not be sent.";
    res.status(502).json({ success: false, error: message });
  }
});

// GET /api/reservations/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [[cip]] = await pool.query("SELECT * FROM cip WHERE cip_id = ?", [id]);
    if (!cip) {
      return res.status(404).json({ success: false, error: "Reservation not found" });
    }
    const [passengers] = await pool.query("SELECT * FROM passenger WHERE cip_id = ?", [id]);
    res.json({ success: true, reservation: cip, passengers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
