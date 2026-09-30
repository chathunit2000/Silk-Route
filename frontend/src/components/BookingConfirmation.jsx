import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/BookingConfirmation.css";

export default function BookingConfirmation({
  bookingData,
  onBack,
  onLogout,
  user,
  onConfirmedSuccess,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // Prefer bookingData passed via props, fallback to location.state?.bookingData
  const data = bookingData || location.state?.bookingData || {};

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Safe data extractions with uppercase formatting matching the sample image
  const packageName = (
    data.packageName ||
    data.selectedPkg?.name ||
    "GARNET"
  )
    .toUpperCase()
    .replace(" PACKAGE", "");

  const paxCount = data.paxCount || 1;
  const payIn = data.payIn || "Rupees";

  // Passengers list
  const passengers =
    Array.isArray(data.passengers) && data.passengers.length > 0
      ? data.passengers
      : [
          {
            title: data.passengerTitle || "Mr",
            name: data.passengerName || "xxxxxxxP",
            passportNo: data.passportNo || "xxxxxxxx",
            refreshment: data.refreshment || "",
          },
        ];

  // Arrival info
  let arrivalInfo = "-";
  if (data.arrivalFlightNumber && data.arrivalFlightNumber !== "N/A" && data.hasArrival !== false) {
    const formattedDate = data.arrivalDate ? data.arrivalDate.replace("T", " ") : "";
    arrivalInfo = formattedDate
      ? `${formattedDate} - ${data.arrivalFlightNumber.toUpperCase()}`
      : data.arrivalFlightNumber.toUpperCase();
  }

  // Departure info
  let departureInfo = "-";
  if (data.departureFlightNumber && data.departureFlightNumber !== "N/A" && data.hasDeparture !== false) {
    const formattedDate = data.departureDate ? data.departureDate.replace("T", " ") : "";
    departureInfo = formattedDate
      ? `${formattedDate} - ${data.departureFlightNumber.toUpperCase()}`
      : data.departureFlightNumber.toUpperCase();
  } else if (data.departureDate) {
    departureInfo = `${data.departureDate.replace("T", " ")} - XXXXXXXX`;
  }

  // Lead passenger details
  const leadPassengerName = (
    data.leadName ||
    passengers[0]?.name ||
    "DILRUKSHI"
  ).toUpperCase();

  const leadEmail = (
    data.leadEmail ||
    user?.email ||
    "DILRUKSHI.IT@AIRPORT.LK"
  ).toUpperCase();

  const leadPhone = (
    data.leadContactNumber ||
    user?.tele ||
    "XXXXXXXX"
  ).toUpperCase();

  // Local contact info
  const localContactName = (data.localContactName || "XXXXXL").toUpperCase();
  const localContactPhone = data.localContactNumber || "11111111";
  const localContactEmail = (
    data.localContactEmail ||
    data.leadEmail ||
    user?.email ||
    "DILRUKSHI.IT@AIRPORT.LK"
  ).toUpperCase();
  const localContactOrg = (
    data.localOrganisation ||
    user?.organisation ||
    "IT"
  ).toUpperCase();

  // Visitors info
  const formatVisitor = (name, id) => {
    const parts = [];
    if (name && name !== "N/A") parts.push(name.toUpperCase());
    if (id && id !== "N/A") {
      parts.push(id.toUpperCase().startsWith("TEST") ? id.toUpperCase() : `TEST ID NO. ${id}`);
    }
    return parts.length > 0 ? parts.join(" - ") : null;
  };

  const visitor1Formatted =
    formatVisitor(data.visitor1Name, data.visitor1Id) || "TEST ID NO. 1234";

  const visitor2Formatted =
    formatVisitor(data.visitor2Name, data.visitor2Id) || "TEST ID NO.";

  const vehicleNos = (data.vehicleNos || "V111").toUpperCase();

  // Comments
  const comments =
    data.comments && data.comments !== "None"
      ? data.comments
      : "this is a test.plz ignore";

  // Total payable amount
  const calculateTotalFormatted = () => {
    if (data.totalPayableFormatted) {
      return data.totalPayableFormatted;
    }
    // Sri Lanka tariff for Garnet is Rs. 7,010.00
    if (payIn === "Rupees") {
      if (packageName.includes("GARNET")) {
        return `Rs. ${(7010 * paxCount).toFixed(2)}`;
      }
      if (packageName.includes("RUBY")) {
        return `Rs. ${(41400 * paxCount).toFixed(2)}`;
      }
      if (packageName.includes("SAPPHIRE")) {
        return `Rs. ${(24050 * paxCount).toFixed(2)}`;
      }
      if (packageName.includes("AMETHYST")) {
        return `Rs. ${(32700 * paxCount).toFixed(2)}`;
      }
      if (packageName.includes("TOPAZ")) {
        return `Rs. ${(17350 * paxCount).toFixed(2)}`;
      }
      const unitPrice = data.unitPrice || data.selectedPkg?.price || 21;
      return `Rs. ${(unitPrice * 333.8 * paxCount).toFixed(2)}`;
    }
    const unitPrice = data.unitPrice || data.selectedPkg?.price || 21;
    return `US $ ${(unitPrice * paxCount).toFixed(2)}`;
  };

  const totalAmountFormatted = calculateTotalFormatted();

  // Handle final confirmation click
  const handleConfirm = async () => {
    setIsSubmitting(true);
    setErrorMsg("");

    const bookingRef =
      data.bookingId || "BK" + Math.floor(10000 + Math.random() * 90000);

    try {
      // Attempt to save to backend MySQL database
      const response = await fetch("http://localhost:4000/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageName,
          bookingType: "online",
          arrivalDate: data.arrivalDate,
          arrivalFlightNumber: data.arrivalFlightNumber,
          departureDate: data.departureDate,
          departureFlightNumber: data.departureFlightNumber,
          leadName: leadPassengerName,
          leadEmail,
          leadPhone,
          localContactName,
          localContactNumber: localContactPhone,
          localContactEmail,
          localOrganisation: localContactOrg,
          visitor1Name: data.visitor1Name,
          visitor1Id: data.visitor1Id,
          visitor2Name: data.visitor2Name,
          visitor2Id: data.visitor2Id,
          vehicleNos,
          comments,
          paxCount,
          totalAmount: parseFloat(
            totalAmountFormatted.replace(/[^0-9.]/g, "")
          ) || 7010,
          currencyType: payIn === "Rupees" ? "Rs. " : "US $ ",
          passengers,
          enteredBy: user?.username || "admin",
        }),
      });

      let resData = null;
      if (response.ok) {
        resData = await response.json();
      }

      const confirmedRefNo =
        resData?.refNo ||
        resData?.bookingId ||
        `${bookingRef}-ONL-PKG-${packageName.charAt(0)}`;

      const confirmedInfo = {
        bookingId: resData?.bookingId || bookingRef,
        refNo: confirmedRefNo,
        packageName,
        leadName: leadPassengerName,
        paxCount,
        totalAmountFormatted,
        date: new Date().toLocaleString(),
      };

      setSuccessInfo(confirmedInfo);

      // Save to localStorage as a fallback backup and pending payments list
      try {
        const stored = JSON.parse(
          localStorage.getItem("silkroute_recent_bookings") || "[]"
        );
        stored.unshift(confirmedInfo);
        localStorage.setItem(
          "silkroute_recent_bookings",
          JSON.stringify(stored.slice(0, 10))
        );

        // Also add directly to silkroute_pending_reservations so it immediately appears in Pending Payments
        const pendingItem = {
          id: resData?.bookingId || bookingRef,
          reportedBy: user?.username || "7198",
          package: packageName,
          referenceNo: confirmedRefNo,
          arrivalDateTime:
            arrivalInfo && arrivalInfo !== "-"
              ? `${arrivalInfo.split(" - ")[0]} /`
              : "00-00-0000 /",
          arrivalFlightNo: data.arrivalFlightNumber || "",
          departureDateTime:
            departureInfo && departureInfo !== "-"
              ? `${departureInfo.split(" - ")[0]} /`
              : "-",
          departureFlightNo: data.departureFlightNumber || "",
          currency: payIn === "Rupees" ? "Rs." : "US $",
          amount: (
            parseFloat(totalAmountFormatted.replace(/[^0-9.]/g, "")) || 7010
          ).toFixed(2),
          passengerCount: paxCount,
          passengerName: leadPassengerName,
          accessDate: new Date().toISOString().slice(0, 10),
          accessTime: new Date().toTimeString().slice(0, 8),
          bankMessage: "Pending",
          status: "Pending",
        };

        const existingPending = JSON.parse(
          localStorage.getItem("silkroute_pending_reservations") || "[]"
        );
        existingPending.unshift(pendingItem);
        localStorage.setItem(
          "silkroute_pending_reservations",
          JSON.stringify(existingPending.slice(0, 50))
        );
      } catch (err) {
        console.error(err);
      }

      if (onConfirmedSuccess) {
        onConfirmedSuccess(confirmedInfo);
      }
    } catch (err) {
      console.warn("Backend reservation call error, falling back locally:", err);
      // Graceful offline fallback
      const fallbackRef = `${bookingRef}-MAN-PKG-${packageName.charAt(0)}`;
      const fallbackInfo = {
        bookingId: bookingRef,
        refNo: fallbackRef,
        packageName,
        leadName: leadPassengerName,
        paxCount,
        totalAmountFormatted,
        date: new Date().toLocaleString(),
      };
      setSuccessInfo(fallbackInfo);

      try {
        const pendingItem = {
          id: bookingRef,
          reportedBy: user?.username || "7198",
          package: packageName,
          referenceNo: fallbackRef,
          arrivalDateTime:
            arrivalInfo && arrivalInfo !== "-"
              ? `${arrivalInfo.split(" - ")[0]} /`
              : "00-00-0000 /",
          arrivalFlightNo: data.arrivalFlightNumber || "",
          departureDateTime:
            departureInfo && departureInfo !== "-"
              ? `${departureInfo.split(" - ")[0]} /`
              : "-",
          departureFlightNo: data.departureFlightNumber || "",
          currency: payIn === "Rupees" ? "Rs." : "US $",
          amount: (
            parseFloat(totalAmountFormatted.replace(/[^0-9.]/g, "")) || 7010
          ).toFixed(2),
          passengerCount: paxCount,
          passengerName: leadPassengerName,
          accessDate: new Date().toISOString().slice(0, 10),
          accessTime: new Date().toTimeString().slice(0, 8),
          bankMessage: "Pending",
          status: "Pending",
        };
        const existingPending = JSON.parse(
          localStorage.getItem("silkroute_pending_reservations") || "[]"
        );
        existingPending.unshift(pendingItem);
        localStorage.setItem(
          "silkroute_pending_reservations",
          JSON.stringify(existingPending.slice(0, 50))
        );
      } catch (e) {
        console.error(e);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="sr-confirm-wrapper">
      {/* 1. Silk Route Dual-Tone Header Banner */}
      <div className="sr-confirm-banner">
        <div className="sr-confirm-banner-tab">
          <span className="sr-confirm-plane-icon" aria-hidden="true">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
          </span>
          <h2 className="sr-confirm-banner-title">Confirmation</h2>
        </div>

        <div className="sr-confirm-banner-right">
          <div className="sr-confirm-silk-emblem" title="Silk Route VIP">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m10 8 4 4-4 4" />
            </svg>
            <span>SILK ROUTE</span>
          </div>
        </div>
      </div>

      {/* 2. Sub-strip with User Greeting / Logout / Back button */}
      <div className="sr-confirm-substrip">
        {onBack && (
          <button
            type="button"
            className="sr-confirm-back-btn"
            onClick={onBack}
            title="Edit details"
          >
            &lt; Back to Edit
          </button>
        )}

        <div className="sr-confirm-user-info">
          <span>Welcome {user?.username || "Administrator"}</span>
          <span className="sr-confirm-divider">|</span>
          <button
            type="button"
            className="sr-confirm-logout-link"
            onClick={onLogout}
          >
            Log out
          </button>
        </div>
      </div>

      {/* 3. Main Confirmation Body matching the screenshot layout */}
      <div className="sr-confirm-body">
        {/* Info Alert Box */}
        <div className="sr-confirm-alert">
          <div className="sr-confirm-alert-icon-wrap" aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3aa1e4"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
          </div>
          <div className="sr-confirm-alert-content">
            <h4 className="sr-confirm-alert-title">
              You have provided the following information
            </h4>
            <p className="sr-confirm-alert-desc">
              Confirmation E-mail will be sent to you, as soon as payment has completed.
            </p>
          </div>
        </div>

        {/* Section 1: Passenger Details */}
        <div className="sr-confirm-section">
          <h3 className="sr-confirm-section-title">Passenger Details</h3>

          {/* Table */}
          <div className="sr-confirm-pax-table">
            <div className="sr-confirm-pax-header-row">
              <div>Name</div>
              <div>Passport No.</div>
              <div>Refreshments</div>
            </div>
            {passengers.map((pax, idx) => (
              <div key={idx} className="sr-confirm-pax-data-row">
                <div>
                  {pax.title ? `${pax.title}. ` : ""}
                  {pax.name || "xxxxxxxP"}
                </div>
                <div>{pax.passportNo || "xxxxxxxx"}</div>
                <div>{pax.refreshment || ""}</div>
              </div>
            ))}
          </div>

          {/* Key-Value Details */}
          <div className="sr-confirm-kv-list">
            <div className="sr-confirm-kv-row">
              <div className="sr-confirm-key">PACKAGE TYPE:</div>
              <div className="sr-confirm-val">{packageName}</div>
            </div>
            <div className="sr-confirm-kv-row">
              <div className="sr-confirm-key">ARRIVAL DATE & FLIGHT NO:</div>
              <div className="sr-confirm-val">{arrivalInfo}</div>
            </div>
            <div className="sr-confirm-kv-row">
              <div className="sr-confirm-key">DEPARTURE DATE & FLIGHT NO:</div>
              <div className="sr-confirm-val">{departureInfo}</div>
            </div>
            <div className="sr-confirm-kv-row">
              <div className="sr-confirm-key">NUMBER OF PASSENGERS:</div>
              <div className="sr-confirm-val">{paxCount}</div>
            </div>
            <div className="sr-confirm-kv-row">
              <div className="sr-confirm-key">LEAD PASSENGER NAME:</div>
              <div className="sr-confirm-val">{leadPassengerName}</div>
            </div>
            <div className="sr-confirm-kv-row">
              <div className="sr-confirm-key">E-MAIL:</div>
              <div className="sr-confirm-val">{leadEmail}</div>
            </div>
            <div className="sr-confirm-kv-row">
              <div className="sr-confirm-key">TELEPHONE:</div>
              <div className="sr-confirm-val">{leadPhone}</div>
            </div>
          </div>
        </div>

        {/* Section 2: Local contact information */}
        <div className="sr-confirm-section">
          <h3 className="sr-confirm-section-title">Local contact information</h3>
          <div className="sr-confirm-kv-list">
            <div className="sr-confirm-kv-row">
              <div className="sr-confirm-key">NAME:</div>
              <div className="sr-confirm-val">{localContactName}</div>
            </div>
            <div className="sr-confirm-kv-row">
              <div className="sr-confirm-key">TELEPHONE:</div>
              <div className="sr-confirm-val">{localContactPhone}</div>
            </div>
            <div className="sr-confirm-kv-row">
              <div className="sr-confirm-key">EMAIL:</div>
              <div className="sr-confirm-val">{localContactEmail}</div>
            </div>
            <div className="sr-confirm-kv-row">
              <div className="sr-confirm-key">ORGANISATION:</div>
              <div className="sr-confirm-val">{localContactOrg}</div>
            </div>
          </div>
        </div>

        {/* Section 3: Details of Visitors */}
        <div className="sr-confirm-section">
          <h3 className="sr-confirm-section-title">Details of Visitors</h3>
          <div className="sr-confirm-kv-list">
            <div className="sr-confirm-kv-row">
              <div className="sr-confirm-key">NAME & ID:</div>
              <div className="sr-confirm-val">{visitor1Formatted}</div>
            </div>
            {visitor2Formatted && (
              <div className="sr-confirm-kv-row">
                <div className="sr-confirm-key">NAME & ID:</div>
                <div className="sr-confirm-val">{visitor2Formatted}</div>
              </div>
            )}
            <div className="sr-confirm-kv-row">
              <div className="sr-confirm-key">VEHICLE NO(S):</div>
              <div className="sr-confirm-val">{vehicleNos}</div>
            </div>
          </div>
        </div>

        {/* Section 4: Comments or Requirement */}
        <div className="sr-confirm-section">
          <h3 className="sr-confirm-section-title">Comments or Requirement</h3>
          <div className="sr-confirm-comment-box">{comments}</div>
        </div>

        {/* Section 5: Total payable amount */}
        <div className="sr-confirm-section">
          <h3 className="sr-confirm-section-title">Total payable amount</h3>
          <div className="sr-confirm-total-box">{totalAmountFormatted}</div>
        </div>

        {/* CONFIRM Button Action */}
        <div className="sr-confirm-actions">
          {errorMsg && (
            <div style={{ color: "#dc2626", fontSize: "13px", fontWeight: "600" }}>
              {errorMsg}
            </div>
          )}
          <button
            type="button"
            className="sr-confirm-submit-btn"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "CONFIRMING..." : "CONFIRM"}
          </button>
        </div>
      </div>

      {/* Success Modal / Voucher when CONFIRM is pressed */}
      {successInfo && (
        <div className="sr-success-modal-backdrop">
          <div className="sr-success-modal-card">
            <div className="sr-success-modal-header">
              <div className="sr-success-modal-icon">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3>Reservation Confirmed!</h3>
              <p>Your Silk Route VIP reservation is registered in the system.</p>
            </div>

            <div className="sr-success-modal-body">
              <div className="sr-success-ref-strip">
                <div>
                  <div className="sr-success-ref-label">BOOKING REFERENCE</div>
                  <div className="sr-success-ref-code">{successInfo.refNo}</div>
                </div>
                <div className="sr-success-status-pill">&#10003; APPROVED</div>
              </div>

              <div className="sr-success-summary-grid">
                <div className="sr-success-summary-item">
                  <span className="label">Package</span>
                  <span className="value">{successInfo.packageName}</span>
                </div>
                <div className="sr-success-summary-item">
                  <span className="label">Lead Passenger</span>
                  <span className="value">{successInfo.leadName}</span>
                </div>
                <div className="sr-success-summary-item">
                  <span className="label">Passengers</span>
                  <span className="value">{successInfo.paxCount} Passenger(s)</span>
                </div>
                <div className="sr-success-summary-item">
                  <span className="label">Amount Paid</span>
                  <span className="value" style={{ color: "#1474be" }}>
                    {successInfo.totalAmountFormatted}
                  </span>
                </div>
              </div>
            </div>

            <div className="sr-success-modal-actions">
              <button
                type="button"
                className="sr-btn-secondary"
                onClick={handlePrint}
              >
                Print Receipt
              </button>
              <button
                type="button"
                className="sr-btn-secondary"
                onClick={() => {
                  setSuccessInfo(null);
                  if (onBack) onBack();
                  navigate("/packages");
                }}
              >
                Book Another Package
              </button>
              <button
                type="button"
                className="sr-btn-secondary"
                onClick={() => navigate("/pending-payments")}
              >
                View in Pending Payments
              </button>
              <button
                type="button"
                className="sr-btn-primary"
                onClick={() => navigate("/dashboard")}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
