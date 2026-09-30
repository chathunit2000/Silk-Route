const express = require("express");
const router = express.Router();
const pool = require("../config/db");

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

function formatFlightDate(dateVal, timeVal) {
  if (!dateVal || dateVal === "0000-00-00" || String(dateVal).startsWith("1899") || String(dateVal).startsWith("1900")) {
    return "00-00-0000 /";
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "00-00-0000 /";
  
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  
  const time = (timeVal && timeVal.trim()) ? timeVal.trim() : "";
  return time ? `${day}-${month}-${year} / ${time}` : `${day}-${month}-${year} /`;
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

// PUT /api/reservations/pending/:id
// Update pending payment details or approve payment
router.put("/pending/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      bankMessage,
      departureFlightNo,
      arrivalFlightNo,
      departureTime,
      arrivalTime,
      amount,
      passengerCount,
      comments,
      updatedBy = "Administrator",
    } = req.body;

    const fields = [];
    const values = [];

    if (bankMessage !== undefined) {
      fields.push("Bank_message = ?");
      values.push(bankMessage);
      if (bankMessage === "Approved") {
        fields.push("status = 'Confirmed'");
      }
    }
    if (departureFlightNo !== undefined) {
      fields.push("Dept_Flight_no = ?");
      values.push(departureFlightNo);
    }
    if (arrivalFlightNo !== undefined) {
      fields.push("Arrv_Flight_no = ?");
      values.push(arrivalFlightNo);
    }
    if (departureTime !== undefined) {
      fields.push("Departure_time = ?");
      values.push(departureTime);
    }
    if (arrivalTime !== undefined) {
      fields.push("Arrival_time = ?");
      values.push(arrivalTime);
    }
    if (amount !== undefined) {
      fields.push("Amount_New = ?");
      values.push(amount);
    }
    if (passengerCount !== undefined) {
      fields.push("Number_Of_Passengers = ?");
      values.push(String(passengerCount));
    }
    if (comments !== undefined) {
      fields.push("Comments = ?");
      values.push(comments);
    }

    fields.push("updated_by = ?");
    values.push(updatedBy);

    if (fields.length > 1) {
      values.push(id);
      await pool.query(`UPDATE cip SET ${fields.join(", ")} WHERE cip_id = ?`, values);

      // Log action in action_log
      const logAction =
        bankMessage === "Approved"
          ? "Updated Bank_message to Approved"
          : "Updated Pending CIP information";
      await pool.query(
        `INSERT INTO action_log (user_id, cip_id, action, timestamp) VALUES (?, ?, ?, NOW())`,
        [updatedBy, String(id), logAction]
      );
    }

    res.json({ success: true, message: "Reservation updated successfully" });
  } catch (error) {
    console.error("PUT /api/reservations/pending/:id failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/reservations
// Creates a new reservation in airport_database.cip and airport_database.passenger
router.post("/", async (req, res) => {
  const connection = await pool.getConnection();
  try {
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
    } = req.body;

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
        bookingType,
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
        localOrganisation || "",
        v1Str,
        v1IdStr,
        v2Str,
        v2IdStr,
        vehicleNos || "",
        comments || "",
        totalAmount,
        totalAmount,
        currencyType,
        paxCount,
        bankMessage, // Empty/Pending allows it to appear in Pending Payments
        enteredBy,
        status,
      ]
    );

    const cipId = cipResult.insertId;
    const refNo = `${cipId}-MAN-PKG-${pkgCode}`;

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

    // Log action to action_log
    await connection.query(
      `INSERT INTO action_log (user_id, cip_id, action, timestamp) VALUES (?, ?, ?, NOW())`,
      [enteredBy || "admin", String(cipId), `Created Pending CIP reservation ${refNo}`]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      bookingId: cipId,
      refNo,
      message: "Pending reservation recorded successfully!",
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
    await connection.rollback();
    console.error("Error creating reservation:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create reservation",
    });
  } finally {
    connection.release();
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
