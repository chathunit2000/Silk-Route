import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/PendingPaymentDetails.css";

// Helper to format date into DD-MM-YYYY
function formatDDMMYYYY(dateVal) {
  if (!dateVal) return "";
  const str = String(dateVal).trim();
  if (
    !str ||
    str === "-" ||
    str.startsWith("0000") ||
    str.startsWith("00-00") ||
    str.includes("1899") ||
    str.includes("1900")
  ) {
    return "";
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.slice(0, 10).split("-");
    const y = parseInt(parts[0], 10);
    if (y < 2000) return "";
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  if (year < 2000) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${year}`;
}

export default function PendingPaymentDetails({
  reservationId,
  initialData = {},
  user,
  onBack,
  onLogout,
  onConfirmedSuccess,
}) {
  const navigate = useNavigate();
  const [resData, setResData] = useState(null);
  const [passengersList, setPassengersList] = useState([]);
  const [, setLoading] = useState(true);
  const [paymentRef, setPaymentRef] = useState(
    initialData?.paymentRef && initialData.paymentRef !== "-" ? String(initialData.paymentRef) : ""
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Fetch full reservation and passenger details from backend
  useEffect(() => {
    let isMounted = true;
    const fetchFullDetails = async () => {
      const id = reservationId || initialData.id;
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`http://localhost:4000/api/reservations/${id}`);
        if (response.ok) {
          const json = await response.json();
          if (json.success && json.reservation && isMounted) {
            setResData(json.reservation);
            if (json.reservation.payment_ref) {
              setPaymentRef(String(json.reservation.payment_ref));
            }
            if (Array.isArray(json.passengers) && json.passengers.length > 0) {
              setPassengersList(json.passengers);
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch full reservation details, using fallback:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFullDetails();
    return () => {
      isMounted = false;
    };
  }, [reservationId, initialData.id]);

  const res = resData || {};

  // Reference number
  const refNo =
    res.Ref_no ||
    initialData.referenceNo ||
    (res.cip_id ? `${res.cip_id}-MAN-PKG-${res.Package || "E"}` : "185917-MAN-PKG-E");

  // Passengers list with fallback
  const passengers =
    passengersList.length > 0
      ? passengersList
      : [
        {
          name:
            res.proffession ||
            initialData.passengerName ||
            "Mr. DILUK IGNESHAS PERIES",
          Passport_number: res.passportNo || initialData.passportNo || "N9292945",
          Refreshments: res.refreshment || initialData.refreshment || "",
        },
      ];

  // Flight formatting & validity check
  const isValidDateVal = (val) => {
    if (!val) return false;
    const s = String(val).trim();
    if (!s || s === "-" || s.startsWith("0000") || s.startsWith("00-00") || s.includes("1899") || s.includes("1900")) {
      return false;
    }
    const d = val instanceof Date ? val : new Date(val);
    return !isNaN(d.getTime()) && d.getFullYear() >= 2000;
  };

  const hasValidArrival =
    isValidDateVal(res.Arrival_date) ||
    Boolean(
      initialData.arrivalDateTime &&
      initialData.arrivalDateTime !== "-" &&
      !initialData.arrivalDateTime.startsWith("00-00-0000") &&
      !initialData.arrivalDateTime.includes("1899")
    );

  const hasValidDeparture =
    isValidDateVal(res.Departure_date) ||
    Boolean(
      initialData.departureDateTime &&
      initialData.departureDateTime !== "-" &&
      !initialData.departureDateTime.startsWith("00-00-0000") &&
      !initialData.departureDateTime.includes("1899")
    );

  const deptDateStr =
    formatDDMMYYYY(res.Departure_date) ||
    (hasValidDeparture && initialData.departureDateTime
      ? initialData.departureDateTime.split("/")[0].trim()
      : "");
  const deptTimeStr =
    res.Departure_time ||
    (hasValidDeparture && initialData.departureDateTime && initialData.departureDateTime.includes("/")
      ? initialData.departureDateTime.split("/")[1].trim()
      : "");
  const deptFlightNo =
    res.Dept_Flight_no ||
    (initialData.departureFlightNo && initialData.departureFlightNo !== "-" ? initialData.departureFlightNo : "");
  const deptStayHrs =
    res.dept_hourse !== undefined && res.dept_hourse !== null ? res.dept_hourse : "0";

  const arrvDateStr =
    formatDDMMYYYY(res.Arrival_date) ||
    (hasValidArrival && initialData.arrivalDateTime
      ? initialData.arrivalDateTime.split("/")[0].trim()
      : "");
  const arrvTimeStr =
    res.Arrival_time ||
    (hasValidArrival && initialData.arrivalDateTime && initialData.arrivalDateTime.includes("/")
      ? initialData.arrivalDateTime.split("/")[1].trim()
      : "");
  const arrvFlightNo =
    res.Arrv_Flight_no ||
    (initialData.arrivalFlightNo && initialData.arrivalFlightNo !== "-" ? initialData.arrivalFlightNo : "");
  const arrvStayHrs =
    res.arrv_hourse !== undefined && res.arrv_hourse !== null ? res.arrv_hourse : "0";

  const isDeparture = Boolean(hasValidDeparture || (deptFlightNo && deptFlightNo !== "-" && deptFlightNo.toLowerCase() !== "n/a"));
  const isArrival = Boolean(hasValidArrival || (arrvFlightNo && arrvFlightNo !== "-" && arrvFlightNo.toLowerCase() !== "n/a"));

  const numPassengers =
    res.Number_Of_Passengers || initialData.passengerCount || passengers.length || 1;

  const leadPassengerName =
    res.proffession ||
    passengers[0]?.name ||
    initialData.passengerName ||
    "MR DILUK IGNESHAS PERIES";

  const leadEmail = res.E_mail || initialData.leadEmail || "cipbooking@airport.lk";
  const leadPhone = res.Telephone || initialData.leadPhone || "N A";

  const localContactName =
    res.Local_contact_name || initialData.localContactName || "Rukshani Silva Bharathi";
  const localContactPhone =
    res.Local_contact_tp || initialData.localContactPhone || "0774429571";
  const localContactEmail = res.Local_email || "rukshani.silva@megapharma.lk";
  const localContactOrg = res.Local_company || "Mega Pharma group of companies";

  const visitor1 = res.visitor1 && res.visitor1 !== "N/A" ? res.visitor1 : "-";
  const visitor2 = res.visitor2 && res.visitor2 !== "N/A" ? res.visitor2 : "-";
  const vehicleNos = res.vehicle_no || "-";
  const comments = res.Comments || initialData.comments || "None";

  const currency = (res.Currency_Type || initialData.currency || "Rs.").trim();
  const rawAmount = res.Amount_New || res.Amount || initialData.amount || 0;
  const numAmount = parseFloat(rawAmount) || 0;
  const amountFormatted = `${currency} ${numAmount.toFixed(2)}`;
  const isConfirmed =
    showSuccessModal ||
    String(res.Bank_message || initialData.bankMessage || initialData.status || "").toLowerCase() === "approved" ||
    String(initialData.status || "").toLowerCase() === "confirmed";
  const printPassengers = passengersList.length
    ? passengersList
    : res.proffession || initialData.passengerName
      ? [{
        name: res.proffession || initialData.passengerName,
        Passport_number: res.passportNo || initialData.passportNo || "",
        Refreshments: res.refreshment || initialData.refreshment || "",
      }]
      : [];
  const printLeadName = res.proffession || printPassengers[0]?.name || initialData.passengerName || "-";
  const printPackageName = initialData.package || ({
    A: "Ruby Package",
    B: "Sapphire Package",
    C: "Amethyst Package",
    D: "Topaz Arrival Package",
    E: "Topaz Departure Package",
    F: "Garnet Package",
    G: "Garnet Package",
  }[String(res.Package || initialData.packageCode || "").toUpperCase()] || "Silk Route Package");
  const paymentReceiptDate =
    res.payment_access_time ||
    initialData.paymentAccessTime ||
    initialData.confirmedAt ||
    [initialData.accessDate, initialData.accessTime].filter(Boolean).join(" ") ||
    (showSuccessModal ? new Date().toLocaleString() : "") ||
    "-";
  const paymentReceiptNumber =
    res.payment_ref || initialData.paymentRef || (showSuccessModal ? paymentRef : "") || "-";
  const printVisitor = (name, id) => {
    const visitorName = name && name !== "N/A" ? String(name).trim() : "";
    const visitorId = id && id !== "N/A" ? String(id).trim() : "";
    if (visitorName && visitorId && visitorName.toLowerCase().includes(visitorId.toLowerCase())) {
      return visitorName;
    }
    return [visitorName, visitorId].filter(Boolean).join(" ");
  };

  // Handle Confirm Submission
  const handleConfirm = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    const trimmedRef = paymentRef.trim();
    if (!trimmedRef) {
      setErrorMsg("Please enter a 5 digit payment reference number. (Ex: 47638)");
      return;
    }

    if (!/^\d{5}$/.test(trimmedRef)) {
      setErrorMsg("Payment Reference must be exactly a 5 digit number. (Ex: 47638)");
      return;
    }

    setIsSubmitting(true);
    const targetId = res.cip_id || initialData.id;

    try {
      if (targetId) {
        const response = await fetch(`http://localhost:4000/api/reservations/pending/${targetId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentRef: trimmedRef,
            bankMessage: "Approved",
            status: "Confirmed",
            updatedBy: user?.username || "Administrator",
          }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || "Could not confirm reservation payment.");
        }
      } else {
        throw new Error("Reservation ID is missing; payment cannot be confirmed.");
      }

      // Also clean up local pending list in localStorage
      try {
        const saved = localStorage.getItem("silkroute_pending_reservations");
        if (saved) {
          const list = JSON.parse(saved);
          const updated = list.filter((item) => item.referenceNo !== refNo && item.id !== targetId);
          localStorage.setItem("silkroute_pending_reservations", JSON.stringify(updated));
        }
      } catch (e) {
        console.error("Local storage error:", e);
      }

      // Add to silkroute_confirmed_reservations in localStorage
      try {
        const storedConfirmed = JSON.parse(
          localStorage.getItem("silkroute_confirmed_reservations") || "[]"
        );
        const newConfirmedItem = {
          id: targetId,
          referenceNo: refNo,
          passengerName: leadPassengerName,
          package: res.Package ? `Package ${res.Package}` : (initialData.package || "Topaz Departure"),
          packageCode: res.Package || initialData.packageCode || "E",
          amount: numAmount.toFixed(2),
          currency: currency,
          paymentRef: trimmedRef,
          passengerCount: numPassengers,
          arrivalDateTime: hasValidArrival ? `${arrvDateStr} / ${arrvTimeStr}` : (initialData.arrivalDateTime || "-"),
          arrivalFlightNo: arrvFlightNo,
          departureDateTime: isDeparture ? `${deptDateStr} / ${deptTimeStr}` : (initialData.departureDateTime || "-"),
          departureFlightNo: deptFlightNo,
          status: "Confirmed",
          bankMessage: "Approved",
          accessDate: new Date().toISOString().slice(0, 10),
          accessTime: new Date().toTimeString().slice(0, 8),
          confirmedAt: new Date().toLocaleString(),
          isRecentlyConfirmed: true,
        };
        storedConfirmed.unshift(newConfirmedItem);
        localStorage.setItem(
          "silkroute_confirmed_reservations",
          JSON.stringify(storedConfirmed.slice(0, 50))
        );
      } catch (e) {
        console.error("Local storage confirmed error:", e);
      }

      setSuccessMsg(`Payment Reference (${trimmedRef}) confirmed successfully! Reservation is approved.`);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Error confirming payment:", err);
      setErrorMsg("Failed to confirm payment reference. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="sr-pp-page-wrap">
      <div className="sr-pp-card-modern">
        {/* 1. Silk Route Dual-Tone Header Banner */}
        <div className="sr-pp-banner">
          <div className="sr-pp-banner-tab">
            <div className="sr-pp-plane-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>
            </div>
            <h2 className="sr-pp-banner-title">
              {isConfirmed ? "Booking Details — Confirmed Reservation" : "Booking Details — Pending Reservation"}
            </h2>
          </div>
          <div className="sr-pp-banner-right">
            <div className="sr-pp-silk-emblem">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>SILK ROUTE</span>
            </div>
          </div>
        </div>

        {/* 2. Sub-strip with Back / User Greeting / Logout */}
        <div className="sr-pp-substrip">
          {onBack && (
            <button type="button" className="sr-pp-back-btn-modern" onClick={onBack}>
              &larr; Back to Pending Reservations
            </button>
          )}

          <div className="sr-pp-user-info-modern">
            <span className="greeting">Welcome {user?.username || "Administrator"}</span>
            <span className="divider">|</span>
            <button type="button" className="sr-pp-logout-btn-link" onClick={onLogout}>
              Log out
            </button>
          </div>
        </div>

        {/* 3. Main Confirmation Body */}
        <div className="sr-pp-body-modern">
          {/* Reference Strip */}
          <div className="sr-pp-ref-strip">
            <div className="sr-pp-ref-left">
              <span className="sr-pp-ref-tag">Booking Reference:</span>
              <span className="sr-pp-ref-val">{refNo}</span>
            </div>
            <div className={`sr-pp-status-pill${isConfirmed ? " is-confirmed" : ""}`}>
              <span className="sr-pp-status-dot" />
              {isConfirmed ? "Payment Confirmed" : "Pending Payment"}
            </div>
          </div>

          {/* Info Alert Box */}
          <div className="sr-pp-alert-callout">
            <div className="sr-pp-alert-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3aa1e4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
            </div>
            <div className="sr-pp-alert-text">
              <h4 className="sr-pp-alert-heading">
                {isConfirmed ? "Payment Received" : "Pending CIP Reservation"}
              </h4>
              <p className="sr-pp-alert-sub">
                {isConfirmed
                  ? "The reservation payment has been received."
                  : "The passenger needs to pay the amount shown below to confirm this reservation."}
              </p>
            </div>
          </div>

          {/* Section 1: Passenger Details */}
          <div className="sr-pp-section-modern">
            <h3 className="sr-pp-section-heading">Passenger Details</h3>

            <table className="sr-pp-table-modern">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Passport No.</th>
                  <th>Refreshments</th>
                </tr>
              </thead>
              <tbody>
                {passengers.map((pax, idx) => (
                  <tr key={idx}>
                    <td><strong>{pax.name || "-"}</strong></td>
                    <td>{pax.Passport_number || pax.passportNo || "-"}</td>
                    <td>{pax.Refreshments || pax.refreshment || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Key-Value Details matching the legacy image */}
            <div className="sr-pp-kv-list-modern">
              {isDeparture && (
                <div className="sr-pp-kv-item">
                  <div className="sr-pp-key-label">Departure Date / Flight No / Stay Hrs:</div>
                  <div className="sr-pp-key-value">
                    {deptDateStr} - {deptTimeStr} / {deptFlightNo} / {deptStayHrs} Hr(s)
                  </div>
                </div>
              )}

              {isArrival && (
                <div className="sr-pp-kv-item">
                  <div className="sr-pp-key-label">Arrival Date / Flight No / Stay Hrs:</div>
                  <div className="sr-pp-key-value">
                    {arrvDateStr} - {arrvTimeStr} / {arrvFlightNo} / {arrvStayHrs} Hr(s)
                  </div>
                </div>
              )}

              <div className="sr-pp-kv-item">
                <div className="sr-pp-key-label">Number of Passangers:</div>
                <div className="sr-pp-key-value">{numPassengers}</div>
              </div>

              <div className="sr-pp-kv-item">
                <div className="sr-pp-key-label">Lead Passenger Name:</div>
                <div className="sr-pp-key-value">{leadPassengerName}</div>
              </div>

              <div className="sr-pp-kv-item">
                <div className="sr-pp-key-label">E-mail:</div>
                <div className="sr-pp-key-value">{leadEmail}</div>
              </div>

              <div className="sr-pp-kv-item">
                <div className="sr-pp-key-label">Telephone:</div>
                <div className="sr-pp-key-value">{leadPhone}</div>
              </div>
            </div>
          </div>

          {/* Section 2: Local contact information */}
          <div className="sr-pp-section-modern">
            <h3 className="sr-pp-section-heading">Local contact information</h3>
            <div className="sr-pp-kv-list-modern">
              <div className="sr-pp-kv-item">
                <div className="sr-pp-key-label">Name:</div>
                <div className="sr-pp-key-value">{localContactName}</div>
              </div>
              <div className="sr-pp-kv-item">
                <div className="sr-pp-key-label">Telephone:</div>
                <div className="sr-pp-key-value">{localContactPhone}</div>
              </div>
              <div className="sr-pp-kv-item">
                <div className="sr-pp-key-label">Email:</div>
                <div className="sr-pp-key-value">{localContactEmail}</div>
              </div>
              <div className="sr-pp-kv-item">
                <div className="sr-pp-key-label">Organisation:</div>
                <div className="sr-pp-key-value">{localContactOrg}</div>
              </div>
            </div>
          </div>

          {/* Section 3: Details of visitors */}
          <div className="sr-pp-section-modern">
            <h3 className="sr-pp-section-heading">Details of visitors</h3>
            <div className="sr-pp-kv-list-modern">
              <div className="sr-pp-kv-item">
                <div className="sr-pp-key-label">Name & ID (Visitor 1):</div>
                <div className="sr-pp-key-value">{visitor1}</div>
              </div>
              <div className="sr-pp-kv-item">
                <div className="sr-pp-key-label">Name & ID (Visitor 2):</div>
                <div className="sr-pp-key-value">{visitor2}</div>
              </div>
              <div className="sr-pp-kv-item">
                <div className="sr-pp-key-label">Vehicle No(s):</div>
                <div className="sr-pp-key-value">{vehicleNos}</div>
              </div>
            </div>
          </div>

          {/* Section 4: Comments */}
          <div className="sr-pp-section-modern">
            <h3 className="sr-pp-section-heading">Your Comment</h3>
            <div className="sr-pp-comment-box-modern">{comments}</div>
          </div>

          {/* Section 5: Reservation amount */}
          <div className="sr-pp-total-card">
            <div className="sr-pp-total-label">
              {isConfirmed ? "Total paid amount :" : "Total payable amount :"}
            </div>
            <div className="sr-pp-total-val">{amountFormatted}</div>
          </div>

          {/* Section 6: Payment Reference & Confirmation */}
          <div className="sr-pp-payment-box">
            <div className="sr-pp-payment-header">
              <div className="sr-pp-payment-title">PAYMENT REFERENCE & CONFIRMATION</div>
              <div className="sr-pp-payment-desc">
                Input the 5-digit payment voucher reference number to approve and confirm this reservation.
              </div>
            </div>

            <div className="sr-pp-input-row">
              <input
                type="text"
                className="sr-pp-ref-input-modern"
                placeholder="47638"
                value={paymentRef}
                onChange={(e) => {
                  setErrorMsg("");
                  setPaymentRef(e.target.value.replace(/\D/g, "").slice(0, 5));
                }}
                maxLength={5}
                autoFocus
              />
              <span className="sr-pp-input-hint">
                (Please enter a 5 digit number. Ex: 47638)
              </span>
            </div>

            {errorMsg && <div className="sr-pp-error-banner">{errorMsg}</div>}
            {successMsg && (
              <div className="sr-pp-success-banner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{successMsg}</span>
              </div>
            )}

            <div className="sr-pp-actions-row">
              <button
                type="button"
                className="sr-pp-pdf-btn-modern"
                onClick={() => window.print()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <path d="M6 14h12v8H6z" />
                </svg>
                Generate PDF
              </button>

              <button
                type="button"
                className="sr-pp-confirm-btn-modern"
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? "CONFIRMING..." : "CONFIRM"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <article className="sr-print-acknowledgement">
        <header className="sr-print-header">
          <strong>SILK ROUTE RESERVATION ACKNOWLEDGEMENT</strong>
          <span>User: {user?.username || user?.user_id || "Administrator"}</span>
        </header>
        <p className="sr-print-intro">
          Dear Sir/Madam,<br />
          The Silk Route Lounge - {printPackageName} has been reserved with Ref. No: {refNo} for the
          under-mentioned CIP/CIPP as per your request:
        </p>
        <strong className="sr-print-section-title">Passenger Details:</strong>
        <table className="sr-print-passenger-table">
          <thead>
            <tr><th>Passenger Name</th><th>Passport No</th><th>Refreshment</th></tr>
          </thead>
          <tbody>
            {printPassengers.length ? printPassengers.map((passenger, index) => (
              <tr key={`${passenger.name || "passenger"}-${index}`}>
                <td>{passenger.name || "-"}</td>
                <td>{passenger.Passport_number || passenger.passportNo || "-"}</td>
                <td>{passenger.Refreshments || passenger.refreshment || "-"}</td>
              </tr>
            )) : <tr><td colSpan="3">Passenger details unavailable</td></tr>}
          </tbody>
        </table>
        <dl className="sr-print-details">
          {isDeparture && (
            <><dt>Departure Date/ Flight No/ Stay Hrs:</dt><dd>{deptDateStr || "-"} {deptTimeStr ? `- ${deptTimeStr}` : ""} / {deptFlightNo || "-"} / {deptStayHrs} Hr(s)</dd></>
          )}
          {isArrival && (
            <><dt>Arrival Date/ Flight No/ Stay Hrs:</dt><dd>{arrvDateStr || "-"} {arrvTimeStr ? `- ${arrvTimeStr}` : ""} / {arrvFlightNo || "-"} / {arrvStayHrs} Hr(s)</dd></>
          )}
          <dt>Number of Passengers:</dt><dd>{numPassengers}</dd>
          <dt>Lead Passenger Name:</dt><dd>{printLeadName}</dd>
          <dt>E-mail:</dt><dd>{res.E_mail || initialData.leadEmail || "-"}</dd>
          <dt>Telephone:</dt><dd>{res.Telephone || initialData.leadPhone || "-"}</dd>
          <dt className="sr-print-group-label">Local contact information:</dt><dd></dd>
          <dt>Name:</dt><dd>{res.Local_contact_name || initialData.localContactName || "-"}</dd>
          <dt>Telephone:</dt><dd>{res.Local_contact_tp || initialData.localContactPhone || "-"}</dd>
          <dt>Email:</dt><dd>{res.Local_email || initialData.localContactEmail || "-"}</dd>
          <dt>Organisation:</dt><dd>{res.Local_company || initialData.localOrganisation || "-"}</dd>
          <dt className="sr-print-group-label">Details of visitors (Following visitors are permitted to meet the CIP in the Lounge)</dt><dd></dd>
          <dt>Name:</dt><dd>{printVisitor(res.visitor1, res.visitor1_id) || printVisitor(initialData.visitor1Name, initialData.visitor1Id) || "-"}</dd>
          <dt>Name:</dt><dd>{printVisitor(res.visitor2, res.visitor2_id) || printVisitor(initialData.visitor2Name, initialData.visitor2Id) || "-"}</dd>
          <dt>Vehicle No(s):</dt><dd>{res.vehicle_no || initialData.vehicleNos || "-"}</dd>
          <dt>Your Comment:</dt><dd>{res.Comments || initialData.comments || "-"}</dd>
        </dl>
        <p className="sr-print-reservation-amount">
          {isConfirmed ? "PAID" : "AMOUNT"} : &nbsp;{amountFormatted}
        </p>
        {isConfirmed && (
          <section className="sr-print-payment-acknowledgement">
            <h2>PAYMENT ACKNOWLEDGEMENT</h2>
            <strong>The payment for the above booking has been received as per following details,</strong>
            <dl className="sr-print-details">
              <dt>Payment receipt date:</dt><dd>{paymentReceiptDate}</dd>
              <dt>Receipt Number:</dt><dd>{paymentReceiptNumber}</dd>
              <dt>Amount received:</dt><dd>{amountFormatted}</dd>
              <dt>Payee Name:</dt><dd>{printLeadName}</dd>
            </dl>
          </section>
        )}
        <footer className="sr-print-footer">
          <p>Yours faithfully,</p>
          <strong>AIRPORT &amp; AVIATION SERVICES (SL) LTD.<br />HEAD OF AIRPORT MANAGEMENT</strong>
          <small>This is an electronically generated document. No signature required.</small>
        </footer>
      </article>

      {/* Success Modal / Voucher when payment is confirmed */}
      {showSuccessModal && (
        <div className="sr-success-modal-backdrop">
          <div className="sr-success-modal-card">
            <div className="sr-success-modal-header">
              <div className="sr-success-modal-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3>Payment Confirmed & Approved!</h3>
              <p>The Silk Route VIP reservation is now confirmed in the system.</p>
            </div>

            <div className="sr-success-modal-body">
              <div className="sr-success-ref-strip">
                <div>
                  <div className="sr-success-ref-label">BOOKING REFERENCE</div>
                  <div className="sr-success-ref-code">{refNo}</div>
                </div>
                <div className="sr-success-status-pill">&#10003; APPROVED</div>
              </div>

              <div className="sr-success-summary-grid">
                <div className="sr-success-summary-item">
                  <span className="label">Payment Reference</span>
                  <span className="value" style={{ fontWeight: 700, color: "#0284c7" }}>
                    #{paymentRef}
                  </span>
                </div>
                <div className="sr-success-summary-item">
                  <span className="label">Lead Passenger</span>
                  <span className="value">{leadPassengerName}</span>
                </div>
                <div className="sr-success-summary-item">
                  <span className="label">Passengers</span>
                  <span className="value">{numPassengers} Passenger(s)</span>
                </div>
                <div className="sr-success-summary-item">
                  <span className="label">Amount Paid</span>
                  <span className="value" style={{ color: "#1474be" }}>
                    {amountFormatted}
                  </span>
                </div>
              </div>
            </div>

            <div className="sr-success-modal-actions">
              <button
                type="button"
                className="sr-btn-secondary"
                onClick={() => window.print()}
              >
                Print Receipt
              </button>
              <button
                type="button"
                className="sr-btn-secondary"
                onClick={() => {
                  setShowSuccessModal(false);
                  if (onConfirmedSuccess) onConfirmedSuccess(refNo);
                  else if (onBack) onBack();
                }}
              >
                Back to Pending Reservations
              </button>
              <button
                type="button"
                className="sr-btn-primary"
                onClick={() => navigate("/reservation-confirmed")}
              >
                View in Confirmed Reservations &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
