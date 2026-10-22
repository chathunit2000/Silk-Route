import React, { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { getUserRole } from "../utils/userRoles";
import "../styles/Dashboard.css";
import "../styles/SearchPage.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4000/api";

const SEARCH_TABS = [
  { id: "reference", label: "By Ref. ID" },
  { id: "trip", label: "By Trip Type" },
  { id: "date", label: "By date range" },
  { id: "package", label: "By Packages" },
  { id: "booking", label: "By Booking Type" },
  { id: "credit", label: "By Credit company" },
  { id: "currency", label: "By $ and Rs" },
  { id: "failed", label: "By Failed Booking" },
  { id: "prepaid", label: "Prepaid Info" },
  { id: "direction", label: "By Arrival Or Departure" },
];

const EMPTY_FILTER = {
  reference: "",
  trip: "",
  dateFrom: "",
  dateTo: "",
  package: "",
  booking: "",
  credit: "",
  currency: "",
  amountFrom: "",
  amountTo: "",
  failed: "",
  prepaid: "",
  direction: "",
};

function readLocalReservations() {
  return [
    "silkroute_pending_reservations",
    "silkroute_confirmed_reservations",
  ].flatMap((key) => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "[]");
      if (!Array.isArray(saved)) {
        console.error(`Could not read ${key}: expected a list of reservations.`);
        return [];
      }
      return saved.map((reservation) => ({
        ...reservation,
        sourceStatus: reservation.sourceStatus || (key.includes("pending") ? "Pending" : "Confirmed"),
      }));
    } catch (error) {
      console.error(`Could not read ${key}:`, error);
      return [];
    }
  });
}

function getReservationKey(reservation) {
  return String(reservation.referenceNo || reservation.id || "");
}

function getReservationDate(reservation) {
  return (
    reservation.accessDate ||
    reservation.bookingDate ||
    reservation.createdAt ||
    reservation.date ||
    reservation.arrivalDateTime ||
    reservation.departureDateTime ||
    ""
  );
}

function parseDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const dmy = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hasArrival(reservation) {
  return Boolean(
    (reservation.arrivalFlightNo && reservation.arrivalFlightNo !== "-") ||
    (reservation.arrivalDateTime && reservation.arrivalDateTime !== "-")
  );
}

function hasDeparture(reservation) {
  return Boolean(
    (reservation.departureFlightNo && reservation.departureFlightNo !== "-") ||
    (reservation.departureDateTime && reservation.departureDateTime !== "-")
  );
}

function getBookingType(reservation) {
  const type = String(reservation.bookingType || reservation.booking_type || "").toLowerCase();
  if (reservation.isCreditReservation || reservation.creditCompany || reservation.companyName || type.includes("credit")) {
    return "credit";
  }
  if (type.includes("manual") || String(reservation.referenceNo || "").includes("-MAN-")) return "manual";
  if (type.includes("online") || String(reservation.referenceNo || "").includes("-ONL-")) return "online";
  return type;
}

function getStatus(reservation) {
  return String(
    reservation.status ||
      reservation.bankMessage ||
      reservation.bookingStatus ||
      reservation.sourceStatus ||
      ""
  ).toLowerCase();
}

function reservationDetails(reservation, fullReservation, passengers = []) {
  const source = fullReservation || {};
  const values = { ...reservation, ...source };
  const list = passengers.length
    ? passengers
    : Array.isArray(reservation.passengers)
      ? reservation.passengers
      : [];
  const arrivalDate = values.Arrival_date || reservation.arrivalDateTime || "";
  const departureDate = values.Departure_date || reservation.departureDateTime || "";
  const formatFlight = (date, time, flight) => {
    if (!date || date === "-") return flight || "-";
    const dateText = String(date).slice(0, 10);
    const formattedDate = /^\d{4}-\d{2}-\d{2}$/.test(dateText)
      ? `${dateText.slice(8, 10)}-${dateText.slice(5, 7)}-${dateText.slice(0, 4)}`
      : dateText;
    return `${formattedDate}${time ? ` - ${String(time).slice(0, 5)}` : ""}${flight ? ` / ${flight}` : ""}`;
  };
  const get = (...keys) => keys.map((key) => values[key]).find((value) => value != null && value !== "") || "";
  const visitorDetails = (nameKeys, idKeys) => {
    const name = get(...nameKeys);
    const id = get(...idKeys);
    if (!name) return id;
    if (!id || String(name).toLowerCase().includes(String(id).toLowerCase())) return name;
    return `${name} / ${id}`;
  };

  return {
    reference: get("Ref_no", "referenceNo", "ref_no") || get("id", "cip_id") || "-",
    package: get("Package", "package", "packageName") || "Standard Package",
    status: get("status", "bankMessage", "sourceStatus") || "Unknown",
    passengers: list.map((passenger) => ({
      name: passenger.name || passenger.Name || passenger.passengerName || "-",
      passport: passenger.Passport_number || passenger.passportNo || passenger.passport || "-",
      refreshment: passenger.Refreshments || passenger.refreshment || "-",
    })),
    arrival: formatFlight(arrivalDate, values.Arrival_time, values.Arrv_Flight_no || reservation.arrivalFlightNo),
    departure: formatFlight(departureDate, values.Departure_time, values.Dept_Flight_no || reservation.departureFlightNo),
    arrivalStay: get("arrv_hourse", "arrivalStayHours") || "-",
    departureStay: get("dept_hourse", "departureStayHours") || "-",
    passengerCount: get("Number_Of_Passengers", "passengerCount", "paxCount") || list.length || 1,
    leadName: get("proffession", "leadName", "passengerName", "passenger_name") || list[0]?.name || "-",
    email: get("E_mail", "leadEmail", "email") || "-",
    telephone: get("Telephone", "leadPhone", "telephone", "localContactPhone") || "-",
    localContact: get("Local_contact_name", "localContactName") || "-",
    localTelephone: get("Local_contact_tp", "localContactPhone") || "-",
    localEmail: get("Local_email", "localContactEmail") || "-",
    organisation: get("Local_company", "localOrganisation", "organisation") || "-",
    visitors: [
      visitorDetails(["visitor1", "visitor1Name"], ["visitor1_id", "visitor1Id"]),
      visitorDetails(["visitor2", "visitor2Name"], ["visitor2_id", "visitor2Id"]),
    ].filter(Boolean),
    vehicle: get("vehicle_no", "vehicleNos", "vehicleNo") || "-",
    comments: get("Comments", "comments") || "-",
    amount: get("Amount_New", "Amount", "amount", "totalAmount") || "-",
    currency: get("Currency_Type", "currency", "currencyType") || "",
  };
}

function buildReservationPdf(details) {
  const lines = [
    "SILK ROUTE RESERVATION ACKNOWLEDGEMENT",
    `${details.package} | Reference: ${details.reference} | Status: ${details.status}`,
    "",
    "PASSENGER DETAILS",
    ...details.passengers.map((passenger, index) =>
      `${index + 1}. ${passenger.name} | Passport: ${passenger.passport} | Refreshments: ${passenger.refreshment}`
    ),
    "",
    `Departure: ${details.departure}`,
    `Departure stay hours: ${details.departureStay}`,
    `Arrival: ${details.arrival}`,
    `Arrival stay hours: ${details.arrivalStay}`,
    `Number of passengers: ${details.passengerCount}`,
    `Lead passenger: ${details.leadName}`,
    `Email: ${details.email}`,
    `Telephone: ${details.telephone}`,
    "",
    "LOCAL CONTACT INFORMATION",
    `Name: ${details.localContact}`,
    `Telephone: ${details.localTelephone}`,
    `Email: ${details.localEmail}`,
    `Organisation: ${details.organisation}`,
    "",
    "VISITOR DETAILS",
    `Visitors: ${details.visitors.join(", ") || "-"}`,
    `Vehicle number(s): ${details.vehicle}`,
    `Comments: ${details.comments}`,
    "",
    `AMOUNT: ${details.currency} ${details.amount}`.trim(),
  ];
  const wrappedLines = lines.flatMap((line) => {
    const safeLine = String(line).replace(/[^\x20-\x7E]/g, "?");
    if (!safeLine) return [""];
    const wrapped = [];
    for (let start = 0; start < safeLine.length; start += 92) {
      wrapped.push(safeLine.slice(start, start + 92));
    }
    return wrapped;
  });
  const pages = [];
  for (let index = 0; index < wrappedLines.length; index += 55) {
    pages.push(wrappedLines.slice(index, index + 55));
  }
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  pages.forEach((pageLines, pageIndex) => {
    const pageId = 4 + pageIndex * 2;
    const contentId = pageId + 1;
    const commands = pageLines.map((line, lineIndex) => {
      const escaped = line.replace(/([\\()])/g, "\\$1");
      const size = pageIndex === 0 && lineIndex === 0 ? 16 : 10;
      return `BT /F1 ${size} Tf 48 ${790 - lineIndex * 13} Td (${escaped}) Tj ET`;
    }).join("\n");
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`,
      `<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`
    );
  });
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function reservationMatches(reservation, filter, activeTab) {
  if (activeTab === "reference" && filter.reference.trim()) {
    return String(reservation.referenceNo || reservation.id || "")
      .toLowerCase()
      .includes(filter.reference.trim().toLowerCase());
  }
  if (activeTab === "trip" && filter.trip) {
    const tripType = String(reservation.tripType || reservation.trip_type || "").toLowerCase();
    const hasArr = hasArrival(reservation);
    const hasDep = hasDeparture(reservation);
    if (filter.trip === "arrival" && !(tripType.includes("arrival") || (hasArr && !hasDep))) return false;
    if (filter.trip === "departure" && !(tripType.includes("departure") || (hasDep && !hasArr))) return false;
    if (
      filter.trip === "both" &&
      !(tripType.includes("both") || tripType.includes("round") || (hasArr && hasDep))
    ) {
      return false;
    }
  }
  if (activeTab === "date" && (filter.dateFrom || filter.dateTo)) {
    const date = parseDate(getReservationDate(reservation));
    if (!date) return false;
    if (filter.dateFrom && date < parseDate(filter.dateFrom)) return false;
    if (filter.dateTo && date > parseDate(filter.dateTo)) return false;
  }
  if (
    activeTab === "package" &&
    filter.package &&
    String(reservation.package || reservation.packageName || "").toLowerCase() !==
      filter.package.toLowerCase()
  ) {
    return false;
  }
  if (activeTab === "booking" && filter.booking && getBookingType(reservation) !== filter.booking) {
    return false;
  }
  if (activeTab === "credit" && filter.credit.trim()) {
    const company = [
      reservation.creditCompany,
      reservation.companyName,
      reservation.organisation,
      reservation.organization,
      reservation.creditCompanyName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!company.includes(filter.credit.trim().toLowerCase())) return false;
  }
  if (activeTab === "currency" && filter.currency) {
    const currency = String(reservation.currency || reservation.currencyType || "").toLowerCase();
    const isRupee = currency.includes("rs") || currency.includes("rupee");
    if (filter.currency === "rs" ? !isRupee : isRupee) return false;
  }
  if (activeTab === "currency" && (filter.amountFrom || filter.amountTo)) {
    const amount = Number(String(reservation.amount || reservation.totalAmount || "").replace(/,/g, ""));
    if (!Number.isFinite(amount)) return false;
    if (filter.amountFrom && amount < Number(filter.amountFrom)) return false;
    if (filter.amountTo && amount > Number(filter.amountTo)) return false;
  }
  if (activeTab === "failed") {
    const status = getStatus(reservation);
    const failed =
      reservation.isFailed === true ||
      reservation.failed === true ||
      status.includes("fail") ||
      status.includes("declin");
    if (!failed) return false;
    if (
      filter.failed &&
      !String(reservation.referenceNo || "").toLowerCase().includes(filter.failed.toLowerCase()) &&
      !status.includes(filter.failed.toLowerCase())
    ) {
      return false;
    }
  }
  if (activeTab === "prepaid" && filter.prepaid) {
    const prepaidValue = reservation.prepaidInfo ?? reservation.prepaid ?? reservation.isPrepaid;
    const hasPrepaid =
      prepaidValue === true ||
      (prepaidValue !== false && prepaidValue != null && String(prepaidValue).trim() !== "" && String(prepaidValue).toLowerCase() !== "no");
    if (filter.prepaid === "yes" ? !hasPrepaid : hasPrepaid) return false;
  }
  if (activeTab === "direction" && filter.direction) {
    if (filter.direction === "arrival" && !hasArrival(reservation)) return false;
    if (filter.direction === "departure" && !hasDeparture(reservation)) return false;
  }
  return true;
}

function readBackendResults(json, source) {
  if (!json?.success || !Array.isArray(json.data)) {
    throw new Error(`The ${source} reservations response was invalid.`);
  }
  return json.data.map((reservation) => ({ ...reservation, sourceStatus: source }));
}

function TabFilter({ activeTab, filter, setFilter, packages }) {
  const inputProps = {
    value: "",
    onChange: (event) => setFilter((current) => ({ ...current, [event.target.name]: event.target.value })),
  };
  const selectProps = {
    ...inputProps,
    className: "sr-search-select",
  };

  if (activeTab === "reference") {
    return (
      <label className="sr-search-field">
        Reservation reference
        <input {...inputProps} name="reference" value={filter.reference} placeholder="Enter reference ID" />
      </label>
    );
  }
  if (activeTab === "trip") {
    return (
      <label className="sr-search-field">
        Trip type
        <select {...selectProps} name="trip" value={filter.trip}>
          <option value="">All trip types</option>
          <option value="arrival">Arrival only</option>
          <option value="departure">Departure only</option>
          <option value="both">Arrival and departure</option>
        </select>
      </label>
    );
  }
  if (activeTab === "date") {
    return (
      <>
        <label className="sr-search-field">
          From
          <input {...inputProps} type="date" name="dateFrom" value={filter.dateFrom} />
        </label>
        <label className="sr-search-field">
          To
          <input {...inputProps} type="date" name="dateTo" value={filter.dateTo} />
        </label>
      </>
    );
  }
  if (activeTab === "package") {
    return (
      <label className="sr-search-field">
        Package
        <select {...selectProps} name="package" value={filter.package}>
          <option value="">All packages</option>
          {packages.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>
    );
  }
  if (activeTab === "booking") {
    return (
      <label className="sr-search-field">
        Booking type
        <select {...selectProps} name="booking" value={filter.booking}>
          <option value="">All booking types</option>
          <option value="online">Online</option>
          <option value="manual">Manual</option>
          <option value="credit">Credit</option>
        </select>
      </label>
    );
  }
  if (activeTab === "credit") {
    return (
      <label className="sr-search-field">
        Credit company
        <input {...inputProps} name="credit" value={filter.credit} placeholder="Enter company name" />
      </label>
    );
  }
  if (activeTab === "currency") {
    return (
      <>
        <label className="sr-search-field">
          Currency
          <select {...selectProps} name="currency" value={filter.currency}>
            <option value="">Any currency</option>
            <option value="usd">US dollars ($)</option>
            <option value="rs">Sri Lankan rupees (Rs.)</option>
          </select>
        </label>
        <label className="sr-search-field sr-search-field-compact">
          Amount from
          <input {...inputProps} type="number" min="0" name="amountFrom" value={filter.amountFrom} placeholder="0" />
        </label>
        <label className="sr-search-field sr-search-field-compact">
          Amount to
          <input {...inputProps} type="number" min="0" name="amountTo" value={filter.amountTo} placeholder="Any" />
        </label>
      </>
    );
  }
  if (activeTab === "failed") {
    return (
      <label className="sr-search-field">
        Failed booking reference or status
        <input {...inputProps} name="failed" value={filter.failed} placeholder="Leave blank to show failed bookings" />
      </label>
    );
  }
  if (activeTab === "prepaid") {
    return (
      <label className="sr-search-field">
        Prepaid information
        <select {...selectProps} name="prepaid" value={filter.prepaid}>
          <option value="">Any prepaid status</option>
          <option value="yes">Prepaid</option>
          <option value="no">Not prepaid</option>
        </select>
      </label>
    );
  }
  return (
    <label className="sr-search-field">
      Flight direction
      <select {...selectProps} name="direction" value={filter.direction}>
        <option value="">Arrival or departure</option>
        <option value="arrival">Arrival</option>
        <option value="departure">Departure</option>
      </select>
    </label>
  );
}

export default function SearchPage({ user, onLogout, onNavigate }) {
  const visibleTabs = getUserRole(user) === "user"
    ? SEARCH_TABS.filter((tab) => tab.id === "reference" || tab.id === "date")
    : SEARCH_TABS;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [activeTab, setActiveTab] = useState(SEARCH_TABS[0].id);
  const [filter, setFilter] = useState(EMPTY_FILTER);
  const [appliedFilter, setAppliedFilter] = useState(EMPTY_FILTER);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [fullReservation, setFullReservation] = useState(null);
  const [reservationPassengers, setReservationPassengers] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [pdfNotice, setPdfNotice] = useState("");
  const [sharingPdf, setSharingPdf] = useState(false);
  const detailRequestId = useRef(0);

  useEffect(() => {
    let isCurrent = true;
    async function loadReservations() {
      setLoading(true);
      setError("");
      const localReservations = readLocalReservations();
      const results = await Promise.allSettled([
        fetch(`${API_BASE}/reservations/pending?limit=100`).then(async (response) => {
          if (!response.ok) throw new Error(`Pending reservations request failed (${response.status}).`);
          return readBackendResults(await response.json(), "Pending");
        }),
        fetch(`${API_BASE}/reservations/confirmed?limit=100`).then(async (response) => {
          if (!response.ok) throw new Error(`Confirmed reservations request failed (${response.status}).`);
          return readBackendResults(await response.json(), "Confirmed");
        }),
      ]);
      if (!isCurrent) return;

      const backendReservations = [];
      const failures = [];
      results.forEach((result) => {
        if (result.status === "fulfilled") backendReservations.push(...result.value);
        else failures.push(result.reason);
      });
      const backendKeys = new Set(backendReservations.map(getReservationKey).filter(Boolean));
      const merged = [
        ...localReservations.filter((reservation) => !backendKeys.has(getReservationKey(reservation))),
        ...backendReservations,
      ];
      const uniqueReservations = new Map();
      merged.forEach((reservation, index) => {
        const key = getReservationKey(reservation) || `reservation-${index}`;
        uniqueReservations.set(key, reservation);
      });
      setReservations(Array.from(uniqueReservations.values()));
      if (failures.length) {
        console.warn("Some reservation search sources could not be loaded:", ...failures);
        setError("Some reservations could not be loaded from the server. Showing the available records.");
      }
      setLoading(false);
    }

    loadReservations();
    return () => {
      isCurrent = false;
    };
  }, []);

  const packages = useMemo(
    () =>
      Array.from(
        new Set(
          reservations
            .map((reservation) => reservation.package || reservation.packageName)
            .filter(Boolean)
        )
      ).sort((first, second) => first.localeCompare(second)),
    [reservations]
  );
  const activeSearchTab = visibleTabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : visibleTabs[0].id;
  const filteredReservations = useMemo(
    () => reservations.filter((reservation) => reservationMatches(reservation, appliedFilter, activeSearchTab)),
    [reservations, appliedFilter, activeSearchTab]
  );

  const changeTab = (tabId) => {
    setActiveTab(tabId);
    setFilter(EMPTY_FILTER);
    setAppliedFilter(EMPTY_FILTER);
  };

  const openReservation = async (reservation) => {
    const requestId = ++detailRequestId.current;
    setSelectedReservation(reservation);
    setFullReservation(null);
    setReservationPassengers([]);
    setDetailsLoading(true);
    setDetailsError("");
    setPdfNotice("");
    if (!reservation.id) {
      setDetailsLoading(false);
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/reservations/${encodeURIComponent(reservation.id)}`);
      const json = await response.json();
      if (!response.ok || !json.success || !json.reservation) {
        throw new Error(json.error || `Could not load reservation details (${response.status}).`);
      }
      if (detailRequestId.current !== requestId) return;
      setFullReservation(json.reservation);
      setReservationPassengers(Array.isArray(json.passengers) ? json.passengers : []);
    } catch (loadError) {
      if (detailRequestId.current !== requestId) return;
      console.error("Could not load full reservation details:", loadError);
      setDetailsError("Some detailed fields could not be loaded. Showing information available in the search result.");
    } finally {
      if (detailRequestId.current === requestId) setDetailsLoading(false);
    }
  };

  const selectedDetails = selectedReservation
    ? reservationDetails(selectedReservation, fullReservation, reservationPassengers)
    : null;
  const downloadPdf = () => {
    if (!selectedDetails) return;
    const file = buildReservationPdf(selectedDetails);
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `silk-route-reservation-${selectedDetails.reference.replace(/[^a-z0-9-_]/gi, "_")}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setPdfNotice("Reservation PDF downloaded.");
  };

  const sharePdf = async () => {
    if (!selectedDetails) return;
    const file = new File(
      [buildReservationPdf(selectedDetails)],
      `silk-route-reservation-${selectedDetails.reference.replace(/[^a-z0-9-_]/gi, "_")}.pdf`,
      { type: "application/pdf" }
    );
    if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
      downloadPdf();
      setPdfNotice("File sharing is not available in this browser. The PDF was downloaded so you can attach it to a message.");
      return;
    }
    setSharingPdf(true);
    try {
      await navigator.share({
        title: `Reservation ${selectedDetails.reference}`,
        text: "Silk Route reservation acknowledgement",
        files: [file],
      });
      setPdfNotice("Reservation PDF shared.");
    } catch (shareError) {
      if (shareError.name !== "AbortError") {
        console.error("Could not share reservation PDF:", shareError);
        setPdfNotice("Could not share the PDF. Please download it and attach it to your message.");
      }
    } finally {
      setSharingPdf(false);
    }
  };

  return (
    <div className="sr-app">
      <Sidebar
        active="search"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={onNavigate}
        user={user}
      />
      <div className="sr-main">
        <Header
          onToggleSidebar={() => setSidebarOpen((previous) => !previous)}
          onLogout={onLogout}
          user={user}
        />
        <main className="sr-content sr-search-content">
          <section className="sr-search-page">
            <header className="sr-search-heading">
              <div>
                <span className="sr-search-eyebrow">RESERVATIONS</span>
                <h1>Search</h1>
                <p>Find bookings by reference, trip details, payment, and more.</p>
              </div>
              <span className="sr-search-total">{reservations.length} bookings</span>
            </header>

            <div className="sr-search-card">
              <div className="sr-search-tabs" role="tablist" aria-label="Search categories">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    id={`sr-search-tab-${tab.id}`}
                    className={`sr-search-tab ${activeSearchTab === tab.id ? "is-active" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={activeSearchTab === tab.id}
                    aria-controls="sr-search-panel"
                    onClick={() => changeTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <section
                id="sr-search-panel"
                className="sr-search-panel"
                role="tabpanel"
                aria-labelledby={`sr-search-tab-${activeSearchTab}`}
              >
                <div className="sr-search-panel-heading">
                  <div>
                    <h2>{visibleTabs.find((tab) => tab.id === activeSearchTab)?.label}</h2>
                    <p>Choose your criteria and search reservation records.</p>
                  </div>
                  <span className="sr-search-result-count">{filteredReservations.length} results</span>
                </div>
                <form
                  className="sr-search-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setAppliedFilter({ ...filter });
                  }}
                >
                  <div className="sr-search-fields">
                    <TabFilter
                      activeTab={activeSearchTab}
                      filter={filter}
                      setFilter={setFilter}
                      packages={packages}
                    />
                  </div>
                  <div className="sr-search-actions">
                    <button className="sr-search-submit" type="submit">Search bookings</button>
                    <button
                      className="sr-search-reset"
                      type="button"
                      onClick={() => {
                        setFilter(EMPTY_FILTER);
                        setAppliedFilter(EMPTY_FILTER);
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                </form>

                {error && <div className="sr-search-notice" role="status">{error}</div>}
                <div className="sr-search-results">
                  <div className="sr-search-table-wrap">
                    <table className="sr-search-table">
                      <thead>
                        <tr>
                          <th>Reference ID</th>
                          <th>Passenger</th>
                          <th>Package</th>
                          <th>Trip</th>
                          <th>Booking type</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td className="sr-search-empty" colSpan="8">Loading bookings…</td></tr>
                        ) : filteredReservations.length === 0 ? (
                          <tr>
                            <td className="sr-search-empty" colSpan="8">
                              {activeSearchTab === "failed"
                                ? "No failed bookings were found."
                                : "No bookings match your search."}
                            </td>
                          </tr>
                        ) : (
                          filteredReservations.map((reservation, index) => {
                            const trip = [hasArrival(reservation) && "Arrival", hasDeparture(reservation) && "Departure"]
                              .filter(Boolean)
                              .join(" / ") || "-";
                            const amount = reservation.amount ?? reservation.totalAmount;
                            return (
                              <tr key={getReservationKey(reservation) || index}>
                                <td><strong>{reservation.referenceNo || reservation.id || "-"}</strong></td>
                                <td>{reservation.passengerName || reservation.leadName || "-"}</td>
                                <td>{reservation.package || reservation.packageName || "-"}</td>
                                <td>{trip}</td>
                                <td>{getBookingType(reservation) || "-"}</td>
                                <td>{amount != null ? `${reservation.currency || reservation.currencyType || ""} ${amount}` : "-"}</td>
                                <td>
                                  <span className="sr-search-status">
                                    {reservation.status || reservation.bankMessage || reservation.sourceStatus || "Unknown"}
                                  </span>
                                </td>
                                <td>
                                  <button
                                    className="sr-search-view"
                                    type="button"
                                    onClick={() => openReservation(reservation)}
                                    aria-label={`View reservation ${reservation.referenceNo || reservation.id || ""}`}
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>
          </section>
        </main>
      </div>
      {selectedDetails && (
        <div
          className="sr-reservation-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !sharingPdf) setSelectedReservation(null);
          }}
        >
          <section
            className="sr-reservation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sr-reservation-modal-title"
          >
            <header className="sr-reservation-modal-header">
              <div>
                <span className="sr-search-eyebrow">SILK ROUTE RESERVATION ACKNOWLEDGEMENT</span>
                <h2 id="sr-reservation-modal-title">{selectedDetails.package}</h2>
                <p>Reference No: <strong>{selectedDetails.reference}</strong></p>
              </div>
              <button
                className="sr-reservation-modal-close"
                type="button"
                onClick={() => setSelectedReservation(null)}
                aria-label="Close reservation details"
              >
                ×
              </button>
            </header>
            <div className="sr-reservation-modal-body">
              {detailsLoading && <p className="sr-reservation-detail-hint">Loading full reservation details…</p>}
              {detailsError && <p className="sr-reservation-detail-warning" role="status">{detailsError}</p>}
              <p className="sr-reservation-intro">
                Dear Sir/Madam,<br />
                The Silk Route Lounge has been reserved with Ref. No: <strong>{selectedDetails.reference}</strong>.
              </p>
              <h3>Passenger Details</h3>
              <div className="sr-reservation-passenger-table">
                <div className="sr-reservation-passenger-row is-heading">
                  <span>Name</span><span>Passport No.</span><span>Refreshments</span>
                </div>
                {selectedDetails.passengers.length ? selectedDetails.passengers.map((passenger, index) => (
                  <div className="sr-reservation-passenger-row" key={`${passenger.name}-${index}`}>
                    <span>{passenger.name}</span><span>{passenger.passport}</span><span>{passenger.refreshment}</span>
                  </div>
                )) : (
                  <div className="sr-reservation-passenger-row"><span>{selectedDetails.leadName}</span><span>-</span><span>-</span></div>
                )}
              </div>
              <div className="sr-reservation-detail-grid">
                <div><h3>Flight & Lead Passenger</h3>
                  <dl>
                    <dt>Departure Date / Flight</dt><dd>{selectedDetails.departure}</dd>
                    <dt>Departure Stay (hours)</dt><dd>{selectedDetails.departureStay}</dd>
                    <dt>Arrival Date / Flight</dt><dd>{selectedDetails.arrival}</dd>
                    <dt>Arrival Stay (hours)</dt><dd>{selectedDetails.arrivalStay}</dd>
                    <dt>Number of Passengers</dt><dd>{selectedDetails.passengerCount}</dd>
                    <dt>Lead Passenger Name</dt><dd>{selectedDetails.leadName}</dd>
                    <dt>Email</dt><dd>{selectedDetails.email}</dd>
                    <dt>Telephone</dt><dd>{selectedDetails.telephone}</dd>
                  </dl>
                </div>
                <div><h3>Local Contact Information</h3>
                  <dl>
                    <dt>Name</dt><dd>{selectedDetails.localContact}</dd>
                    <dt>Telephone</dt><dd>{selectedDetails.localTelephone}</dd>
                    <dt>Email</dt><dd>{selectedDetails.localEmail}</dd>
                    <dt>Organisation</dt><dd>{selectedDetails.organisation}</dd>
                  </dl>
                </div>
              </div>
              <h3>Visitors & Requirements</h3>
              <dl className="sr-reservation-visitor-details">
                <dt>Visitor(s)</dt><dd>{selectedDetails.visitors.join(", ") || "-"}</dd>
                <dt>Vehicle No(s)</dt><dd>{selectedDetails.vehicle}</dd>
                <dt>Your Comment</dt><dd>{selectedDetails.comments}</dd>
              </dl>
              <div className="sr-reservation-total">
                AMOUNT: {selectedDetails.currency} {selectedDetails.amount}
              </div>
            </div>
            <footer className="sr-reservation-modal-actions">
              {pdfNotice && <span className="sr-reservation-pdf-notice" role="status">{pdfNotice}</span>}
              <button className="sr-search-reset" type="button" onClick={() => setSelectedReservation(null)}>Close</button>
              <button className="sr-reservation-download" type="button" onClick={downloadPdf}>Download PDF</button>
              <button className="sr-search-submit" type="button" onClick={sharePdf} disabled={sharingPdf}>
                {sharingPdf ? "Sharing…" : "Send PDF"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
