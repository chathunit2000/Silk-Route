import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { jsPDF } from "jspdf";
import "../styles/BookingConfirmation.css";
import { getPassengerDiscountRate } from "../data/packagesData";

function createBookingReceiptPdf(receipt) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 21;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 4.5;
  let y = 15;

  const clean = (value) => {
    const text = String(value ?? "").trim();
    if (!text || /^(n\/a|none|null|undefined|-+)$/i.test(text) || /^x+$/i.test(text)) {
      return "";
    }
    return text;
  };
  const ensureSpace = (height) => {
    if (y + height > pageHeight - 18) {
      pdf.addPage();
      y = 18;
    }
  };
  const addText = (text, { bold = false, size = 9, indent = 0 } = {}) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(String(text), contentWidth - indent);
    ensureSpace(lines.length * lineHeight);
    pdf.text(lines, margin + indent, y);
    y += lines.length * lineHeight;
  };
  const addDetail = (label, value) => {
    const text = clean(value);
    if (!text) return;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const valueX = margin + 60;
    const lines = pdf.splitTextToSize(text, pageWidth - margin - valueX);
    ensureSpace(lines.length * lineHeight);
    pdf.text(`${label}:`, margin, y);
    pdf.text(lines, valueX, y);
    y += lines.length * lineHeight;
  };
  const addPassengerTable = () => {
    const columns = [
      { title: "Passenger Name", width: contentWidth * 0.55 },
      { title: "Passport No", width: contentWidth * 0.22 },
      { title: "Refreshment", width: contentWidth * 0.23 },
    ];
    const drawRow = (cells, bold = false) => {
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(8.5);
      const cellLines = cells.map((cell, index) =>
        pdf.splitTextToSize(String(cell || ""), columns[index].width - 2)
      );
      const rowHeight = Math.max(6, ...cellLines.map((lines) => lines.length * 4 + 2));
      ensureSpace(rowHeight);
      let x = margin;
      columns.forEach((column, index) => {
        pdf.rect(x, y - 3.5, column.width, rowHeight);
        if (bold) {
          pdf.text(cellLines[index], x + column.width / 2, y, { align: "center" });
        } else {
          pdf.text(cellLines[index], x + 1, y);
        }
        x += column.width;
      });
      y += rowHeight;
    };

    drawRow(columns.map((column) => column.title), true);
    (receipt.passengers || []).forEach((passenger) => {
      const name = clean([passenger.title, passenger.name].filter(Boolean).join(". "));
      const passportNo = clean(passenger.passportNo);
      const refreshment = clean(passenger.refreshment);
      if (name || passportNo || refreshment) {
        drawRow([name, passportNo, refreshment]);
      }
    });
  };
  const formatFlight = (dateValue, flightNumber, stayHours) => {
    const dateTime = clean(dateValue);
    const flight = clean(flightNumber);
    if (!dateTime && !flight) return "";
    const date = dateTime.slice(0, 10);
    const timeMatch = dateTime.match(/(?:T|\s)(\d{2}:\d{2})/);
    const dateAndTime = [date || dateTime, timeMatch?.[1]].filter(Boolean).join(" - ");
    return [
      dateAndTime,
      flight,
      `${clean(stayHours) || "0"} Hr(s)`,
    ].filter(Boolean).join(" / ");
  };

  pdf.setTextColor(0, 0, 0);
  pdf.setDrawColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("SILK ROUTE RESERVATION ACKNOWLEDGEMENT", margin, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(`User: ${clean(receipt.user) || "Administrator"}`, pageWidth - margin, y, {
    align: "right",
  });
  y += 3;
  pdf.setLineWidth(0.25);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 7;

  addText("Dear Sir/Madam,");
  const introduction = `The Silk Route Lounge - ${clean(receipt.packageName)} has been reserved with Ref. No:${clean(receipt.refNo)} for the under-mentioned CIP/CIPP as per your request:`;
  addText(introduction);
  y += 1;

  addText("Passenger Details:", { bold: true });
  addPassengerTable();
  y += 5;

  addDetail(
    "Arrival Date/ Flight No/ Stay Hrs",
    formatFlight(receipt.arrivalDate, receipt.arrivalFlightNumber, receipt.arrivalStayHours)
  );
  addDetail(
    "Departure Date/ Flight No/ Stay Hrs",
    formatFlight(receipt.departureDate, receipt.departureFlightNumber, receipt.departureStayHours)
  );
  addDetail("Number of Passengers", receipt.paxCount);
  addDetail("Lead Passenger Name", receipt.leadName);
  addDetail("E-mail", receipt.email);
  addDetail("Telephone", receipt.phone);

  y += 1;
  addText("Local contact information:", { bold: true });
  addDetail("Name", receipt.localContactName);
  addDetail("Telephone", receipt.localContactPhone);
  addDetail("Email", receipt.localContactEmail);
  addDetail("Organisation", receipt.localOrganisation);

  y += 1;
  addText("Details of visitors (Following visitors are permitted to meet the CIP in the Lounge)");
  addDetail("Name", receipt.visitor1);
  addDetail("Name", receipt.visitor2);
  addDetail("Vehicle No(s)", receipt.vehicleNos);
  addDetail("Your Comment", receipt.comments);

  y += 2;
  const payableLabel = receipt.isCreditReservation ? "Total credit amount :" : "Total payable amount :";
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(`${payableLabel}  ${clean(receipt.amount)}`, pageWidth / 2, y, { align: "center" });
  y += 11;

  addText("Yours faithfully,");
  y += 3;
  addText("AIRPORT & AVIATION SERVICES (SL) LTD.");
  addText("HEAD OF AIRPORT MANAGEMENT");
  y += 1;
  addText("This is an electronically generated document. No signature required.", { size: 8 });

  return pdf;
}

async function emailBookingReceipt(bookingId, receiptPdfBase64) {
  const response = await fetch(
    `http://localhost:4000/api/reservations/${bookingId}/email-receipt`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiptPdfBase64 }),
    }
  );
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Could not email the booking PDF.");
  }
}

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
  const isCreditReservation = data.isCreditReservation === true;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [receiptPdfBase64, setReceiptPdfBase64] = useState("");
  const [isRetryingEmail, setIsRetryingEmail] = useState(false);

  useEffect(() => () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

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

  const leadEmail = String(
    data.leadEmail ||
    user?.email ||
    "dilrukshi.it@airport.lk"
  ).trim();

  const leadPhone = (
    data.leadContactNumber ||
    user?.tele ||
    "XXXXXXXX"
  ).toUpperCase();

  // Local contact info
  const localContactName = (data.localContactName || "XXXXXL").toUpperCase();
  const localContactPhone = data.localContactNumber || "11111111";
  const localContactEmail = String(
    data.localContactEmail ||
    data.leadEmail ||
    user?.email ||
    "dilrukshi.it@airport.lk"
  ).trim();
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

  // Tiered discount based on number of passengers
  const discountRate = getPassengerDiscountRate(paxCount);
  const discountPercent = Math.round(discountRate * 100);

  // Calculate the amount once so the confirmation display and API payload agree.
  const calculateTotalAmount = () => {
    if (payIn !== "Rupees" && data.totalPayableFormatted) {
      const providedAmount = Number(
        String(data.totalPayableFormatted)
          .replace(/,/g, "")
          .replace(/[^\d.-]/g, "")
      );
      if (Number.isFinite(providedAmount) && providedAmount > 0) {
        return providedAmount;
      }
    }

    if (payIn === "Rupees") {
      let baseUnitPrice = 7010;
      if (packageName.includes("GARNET")) {
        baseUnitPrice = 7010;
      } else if (packageName.includes("RUBY")) {
        baseUnitPrice = 41400;
      } else if (packageName.includes("SAPPHIRE")) {
        baseUnitPrice = 24050;
      } else if (packageName.includes("AMETHYST")) {
        baseUnitPrice = 32700;
      } else if (packageName.includes("TOPAZ")) {
        baseUnitPrice = 17350;
      } else {
        const unitPrice = data.unitPrice || data.selectedPkg?.price || 21;
        baseUnitPrice = unitPrice * 333.8;
      }
      const baseTotal = baseUnitPrice * paxCount;
      const discount = baseTotal * discountRate;
      return Number((baseTotal - discount).toFixed(2));
    }
    const unitPrice = data.unitPrice || data.selectedPkg?.price || 21;
    const baseTotal = unitPrice * paxCount;
    const discount = baseTotal * discountRate;
    return Number((baseTotal - discount).toFixed(2));
  };

  const totalPayableAmount = calculateTotalAmount();
  const totalAmountFormatted = `${payIn === "Rupees" ? "Rs." : "US $"} ${totalPayableAmount.toFixed(2)}`;

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
          bookingType: isCreditReservation ? "credit" : "online",
          isCreditReservation,
          companyId: data.creditCompanyId || data.creditCompany?.company_id,
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
          totalAmount: totalPayableAmount,
          currencyType: isCreditReservation
            ? "Rs. "
            : payIn === "Rupees"
            ? "Rs. "
            : "US $ ",
          passengers,
          enteredBy: user?.username || "admin",
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || "Failed to save the reservation.");
      }

      const confirmedRefNo =
        resData?.refNo ||
        resData?.bookingId ||
        `${bookingRef}-ONL-PKG-${packageName.charAt(0)}`;

      const bookingDate = new Date().toLocaleString();
      const pdfDocument = createBookingReceiptPdf({
        refNo: confirmedRefNo,
        isCreditReservation,
        packageName: data.packageName || data.selectedPkg?.name || packageName,
        user: user?.username || user?.name,
        leadName: data.leadName || passengers[0]?.name,
        paxCount,
        email: data.leadEmail,
        phone: data.leadContactNumber,
        arrivalDate: data.hasArrival === false ? "" : data.arrivalDate,
        arrivalFlightNumber: data.hasArrival === false ? "" : data.arrivalFlightNumber,
        arrivalStayHours: data.arrivalStayHours,
        departureDate: data.hasDeparture === false ? "" : data.departureDate,
        departureFlightNumber: data.hasDeparture === false ? "" : data.departureFlightNumber,
        departureStayHours: data.departureStayHours,
        amount: totalAmountFormatted,
        passengers,
        localContactName: data.localContactName,
        localContactPhone: data.localContactNumber,
        localContactEmail: data.localContactEmail,
        localOrganisation: data.localOrganisation,
        visitor1: data.visitor1Name,
        visitor2: data.visitor2Name,
        vehicleNos: data.vehicleNos,
        comments: data.comments,
      });
      const pdfBlob = pdfDocument.output("blob");
      const pdfBase64 = pdfDocument.output("datauristring").split(",")[1];
      setPdfUrl(URL.createObjectURL(pdfBlob));
      setReceiptPdfBase64(pdfBase64);

      let emailSent = false;
      let emailError = "";
      try {
        await emailBookingReceipt(resData.bookingId, pdfBase64);
        emailSent = true;
      } catch (emailSendError) {
        console.error("Could not email the booking PDF:", emailSendError);
        emailError = emailSendError.message || "Could not email the booking PDF.";
      }

      const confirmedInfo = {
        bookingId: resData?.bookingId || bookingRef,
        refNo: confirmedRefNo,
        packageName,
        leadName: leadPassengerName,
        paxCount,
        totalAmountFormatted,
        date: bookingDate,
        emailSent,
        emailError,
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
          amount: totalPayableAmount.toFixed(2),
          passengerCount: paxCount,
          passengerName: leadPassengerName,
          accessDate: new Date().toISOString().slice(0, 10),
          accessTime: new Date().toTimeString().slice(0, 8),
          bankMessage: isCreditReservation ? "Credit" : "Pending",
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
      if (isCreditReservation) {
        setErrorMsg(err.message || "Failed to save the credit reservation.");
        return;
      }

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
        emailSent: false,
        emailError: "The backend is unavailable, so the PDF receipt could not be emailed.",
      };
      setSuccessInfo(fallbackInfo);
      const fallbackPdf = createBookingReceiptPdf({
        refNo: fallbackRef,
        isCreditReservation,
        packageName: data.packageName || data.selectedPkg?.name || packageName,
        user: user?.username || user?.name,
        leadName: data.leadName || passengers[0]?.name,
        paxCount,
        email: data.leadEmail,
        phone: data.leadContactNumber,
        arrivalDate: data.hasArrival === false ? "" : data.arrivalDate,
        arrivalFlightNumber: data.hasArrival === false ? "" : data.arrivalFlightNumber,
        arrivalStayHours: data.arrivalStayHours,
        departureDate: data.hasDeparture === false ? "" : data.departureDate,
        departureFlightNumber: data.hasDeparture === false ? "" : data.departureFlightNumber,
        departureStayHours: data.departureStayHours,
        amount: totalAmountFormatted,
        passengers,
        localContactName: data.localContactName,
        localContactPhone: data.localContactNumber,
        localContactEmail: data.localContactEmail,
        localOrganisation: data.localOrganisation,
        visitor1: data.visitor1Name,
        visitor2: data.visitor2Name,
        vehicleNos: data.vehicleNos,
        comments: data.comments,
      });
      setPdfUrl(URL.createObjectURL(fallbackPdf.output("blob")));

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
          amount: totalPayableAmount.toFixed(2),
          passengerCount: paxCount,
          passengerName: leadPassengerName,
          accessDate: new Date().toISOString().slice(0, 10),
          accessTime: new Date().toTimeString().slice(0, 8),
          bankMessage: isCreditReservation ? "Credit" : "Pending",
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

  const handleRetryEmail = async () => {
    if (!successInfo?.bookingId || !receiptPdfBase64) return;
    setIsRetryingEmail(true);
    try {
      await emailBookingReceipt(successInfo.bookingId, receiptPdfBase64);
      setSuccessInfo((previous) => ({
        ...previous,
        emailSent: true,
        emailError: "",
      }));
    } catch (emailSendError) {
      console.error("Could not retry booking receipt email:", emailSendError);
      setSuccessInfo((previous) => ({
        ...previous,
        emailError: emailSendError.message || "Could not email the booking PDF.",
      }));
    } finally {
      setIsRetryingEmail(false);
    }
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
              The reservation will be saved as pending. A PDF booking receipt will be emailed to the passenger after submission.
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

        {/* Section 5: Amount due */}
        <div className="sr-confirm-section">
          <h3 className="sr-confirm-section-title">
            {isCreditReservation ? "Credit amount" : "Total payable amount"}
          </h3>
          <div className="sr-confirm-total-box">{totalAmountFormatted}</div>
          {discountPercent > 0 && (
            <div
              style={{
                marginTop: "8px",
                fontSize: "12px",
                color: "#16a34a",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>&#10004;</span>
              <span>
                Includes {discountPercent}% passenger tier discount for {paxCount} {paxCount === 1 ? "passenger" : "passengers"}
              </span>
            </div>
          )}
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
              <h3>
                {isCreditReservation
                  ? "On-credit Reservation Submitted"
                  : "Reservation Pending Payment"}
              </h3>
              <p>
                {isCreditReservation
                  ? "Your reservation and corporate credit balance have been recorded."
                  : "Your Silk Route reservation has been saved. Payment is still due."}
              </p>
            </div>

            <div className="sr-success-modal-body">
              <div className="sr-success-ref-strip">
                <div>
                  <div className="sr-success-ref-label">BOOKING REFERENCE</div>
                  <div className="sr-success-ref-code">{successInfo.refNo}</div>
                </div>
                <div className="sr-success-status-pill is-pending">
                  {isCreditReservation ? "ON CREDIT" : "PENDING PAYMENT"}
                </div>
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
                  <span className="label">
                    {isCreditReservation ? "Credit Amount" : "Amount Payable"}
                  </span>
                  <span className="value" style={{ color: "#1474be" }}>
                    {successInfo.totalAmountFormatted}
                  </span>
                </div>
              </div>

              {pdfUrl && (
                <iframe
                  className="sr-booking-pdf-preview"
                  src={pdfUrl}
                  title="Booking receipt PDF preview"
                />
              )}
              {successInfo.emailSent ? (
                <p className="sr-booking-email-status" role="status">
                  PDF receipt emailed to {leadEmail}.
                </p>
              ) : (
                <div>
                  <p className="sr-booking-email-status is-error" role="alert">
                    {successInfo.emailError || "The booking PDF could not be emailed. Download it below."}
                  </p>
                  {Number.isInteger(Number(successInfo.bookingId)) &&
                    Number(successInfo.bookingId) > 0 && (
                    <button
                      type="button"
                      className="sr-btn-secondary"
                      onClick={handleRetryEmail}
                      disabled={isRetryingEmail}
                    >
                      {isRetryingEmail ? "Retrying email…" : "Retry email"}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="sr-success-modal-actions">
              {pdfUrl && (
                <a
                  className="sr-btn-secondary"
                  href={pdfUrl}
                  download={`Silk-Route-Receipt-${successInfo.refNo}.pdf`}
                >
                  Download PDF
                </a>
              )}
              <button
                type="button"
                className="sr-btn-secondary"
                onClick={() => {
                  setSuccessInfo(null);
                  if (onBack) onBack();
                  navigate(
                    isCreditReservation ? "/on-credit-select-page" : "/packages",
                    isCreditReservation ? { state: { company: data.creditCompany } } : undefined
                  );
                }}
              >
                Book Another Package
              </button>
              <button
                type="button"
                className="sr-btn-secondary"
                onClick={() => navigate("/pending-payments")}
              >
                View in Pending Reservations
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
