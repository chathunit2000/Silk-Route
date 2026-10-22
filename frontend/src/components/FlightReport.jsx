import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import downloadExcel from "../utils/downloadExcel";
import "../styles/Dashboard.css";
import "../styles/PendingPayments.css";
import "../styles/FlightReport.css";

function readLocalReservations() {
  const key = "silkroute_confirmed_reservations";
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.error(`Could not read ${key}:`, error);
    return [];
  }
}

function mergeReservations(localReservations, backendReservations) {
  const byReference = new Map();
  [...localReservations, ...backendReservations].forEach((reservation, index) => {
    const key = reservation.referenceNo || reservation.id || `reservation-${index}`;
    byReference.set(String(key), reservation);
  });
  return Array.from(byReference.values());
}

function parseFlightDateTime(value) {
  if (!value || typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized === "-" || normalized.startsWith("00-00")) {
    return null;
  }

  const match = normalized.match(
    /^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s*\/?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (match) {
    const [, day, month, year, hour = "0", minute = "0", second = "0"] = match;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
  }

  const isoDate = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (isoDate) {
    const [, year, month, day, hour = "0", minute = "0", second = "0"] = isoDate;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
  }

  return null;
}

function formatReportDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function getReportWindow(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const start = new Date(year, month - 1, day, 8, 0, 0);
  const end = new Date(year, month - 1, day + 1, 8, 0, 0);
  return { start, end };
}

export default function FlightReport({ direction, user, onLogout, onNavigate }) {
  const isArrival = direction === "arrival";
  const dateField = isArrival ? "arrivalDateTime" : "departureDateTime";
  const flightField = isArrival ? "arrivalFlightNo" : "departureFlightNo";
  const navKey = isArrival ? "daily arrival report" : "daily departure report";
  const title = isArrival ? "Arrival Booking Details -" : "Departure Booking Details -";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [appliedDate, setAppliedDate] = useState("");
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReservations() {
      setLoading(true);
      setError("");
      setNotice("");
      const localReservations = readLocalReservations();

      try {
        const response = await fetch("http://localhost:4000/api/reservations/confirmed?limit=10000");
        if (!response.ok) {
          throw new Error(`Reservation request failed (${response.status}).`);
        }
        const json = await response.json();
        if (!json.success || !Array.isArray(json.data)) {
          throw new Error(json.error || "Reservation data is unavailable.");
        }

        if (!cancelled) {
          setReservations(mergeReservations(localReservations, json.data));
        }
      } catch (loadError) {
        if (!cancelled) {
          setReservations(mergeReservations(localReservations, []));
          if (localReservations.length > 0) {
            setNotice("Could not connect to the reservation service. Showing saved reservations.");
          } else {
            setError(loadError.message || "Failed to load reservations.");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadReservations();
    return () => {
      cancelled = true;
    };
  }, []);

  const reportRows = useMemo(() => {
    if (!appliedDate) return [];
    const { start, end } = getReportWindow(appliedDate);
    return reservations
      .filter((reservation) => {
        const flightDate = parseFlightDateTime(reservation[dateField]);
        return flightDate && flightDate >= start && flightDate < end;
      })
      .map((reservation, index) => ({
        ...reservation,
        reportNo: index + 1,
      }));
  }, [appliedDate, dateField, reservations]);

  const handleSearch = () => {
    if (!selectedDate) {
      setAppliedDate("");
      setError("Select a date to generate the report.");
      return;
    }
    setError("");
    setAppliedDate(selectedDate);
  };

  const handleReset = () => {
    setSelectedDate("");
    setAppliedDate("");
    setError("");
    setNotice("");
  };

  const handleDownload = () => {
    if (!appliedDate) {
      setError("Search for a report before downloading it.");
      return;
    }
    const headers = [
      "No.",
      "Ref No",
      "Passenger Name(s)",
      "Flight No.",
      isArrival ? "Arrival Date" : "Departure Date",
      isArrival ? "Arrival Time" : "Departure Time",
      "No of Pax",
      "Amount Rs.",
      "Amount $",
      "Remark",
    ];
    const rows = reportRows.map((row) => {
      const flightDate = parseFlightDateTime(row[dateField]);
      const isUsd = String(row.currency || "").toLowerCase().includes("$");
      return [
        row.reportNo,
        row.referenceNo || "",
        row.passengerName || row.localContactName || "",
        row[flightField] || "",
        flightDate ? formatReportDate(flightDate) : "",
        flightDate
          ? `${String(flightDate.getHours()).padStart(2, "0")}:${String(
              flightDate.getMinutes()
            ).padStart(2, "0")}`
          : "",
        row.passengerCount || 1,
        isUsd ? "" : row.amount || "",
        isUsd ? row.amount || "" : "",
        row.comments || "",
      ];
    });
    try {
      downloadExcel(
        `${isArrival ? "arrival" : "departure"}-report-${appliedDate}`,
        `${isArrival ? "Arrival" : "Departure"} Report`,
        headers,
        rows
      );
    } catch (downloadError) {
      console.error("Could not download flight report:", downloadError);
      setError("Could not create the Excel report. Please try again.");
    }
  };

  const { start: windowStart, end: windowEnd } = appliedDate
    ? getReportWindow(appliedDate)
    : { start: null, end: null };

  return (
    <div className="sr-app">
      <Sidebar
        active={navKey}
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
        <main className="sr-content">
          <section className="sr-flight-report sr-pending-page">
            <div className="sr-pending-card sr-flight-report-card">
              <div className="sr-pending-header-banner sr-flight-report-banner">
                <div>
                  <h2>{title.replace(" -", "")}</h2>
                  <p>Filter scheduled {isArrival ? "arrivals" : "departures"} and export the report.</p>
                </div>
                <span className="sr-flight-report-badge">
                  {isArrival ? "ARRIVAL REPORT" : "DEPARTURE REPORT"}
                </span>
              </div>

              <div className="sr-pending-toolbar sr-flight-report-toolbar">
                <div className="sr-pending-connected-tag sr-flight-report-connection" aria-live="polite">
                  <span className={`sr-pending-connected-dot ${error ? "is-error" : ""}`}></span>
                  <span>
                    {loading
                      ? "Loading reservations..."
                      : error || notice || "Connected"}
                  </span>
                </div>

                <div className="sr-flight-report-controls">
                  <div className="sr-flight-report-date-field">
                    <label htmlFor="flight-report-date">Report date</label>
                    <input
                      id="flight-report-date"
                      type="date"
                      value={selectedDate}
                      onChange={(event) => setSelectedDate(event.target.value)}
                    />
                    <span
                      className="sr-flight-report-help"
                      title="Includes flights from 8:00 AM on the selected date until 8:00 AM the following day."
                      aria-label="Report runs from 8:00 AM to 8:00 AM the following day"
                    >
                      i
                    </span>
                  </div>
                  <div className="sr-flight-report-actions">
                    <button
                      type="button"
                      className="sr-flight-report-search-btn"
                      onClick={handleSearch}
                    >
                      Search
                    </button>
                    <button
                      type="button"
                      className="sr-pending-refresh-btn sr-flight-report-reset-btn"
                      onClick={handleReset}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      className="sr-flight-report-download-btn"
                      onClick={handleDownload}
                      disabled={!appliedDate || loading}
                    >
                      Download Excel
                    </button>
                  </div>
                </div>
              </div>

              {appliedDate && windowStart && windowEnd && (
                <div className="sr-flight-report-summary">
                  <div>
                    <span className="sr-flight-report-summary-label">REPORT PERIOD</span>
                    <h3>
                      {formatReportDate(windowStart)} 08:00
                      <span className="sr-flight-report-period-separator">to</span>
                      {formatReportDate(windowEnd)} 08:00
                    </h3>
                  </div>
                  <span className="sr-flight-report-result-count">
                    {reportRows.length} {reportRows.length === 1 ? "booking" : "bookings"}
                  </span>
                </div>
              )}

              <div className="sr-pending-table-wrap sr-flight-report-table-wrap">
                <table className="sr-pending-table sr-flight-report-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Ref No</th>
                    <th>Passenger Name(s)</th>
                    <th>Flight No.</th>
                    <th>{isArrival ? "Arrival Date" : "Departure Date"}</th>
                    <th>{isArrival ? "Arrival Time" : "Departure Time"}</th>
                    <th>No of Pax</th>
                    <th>Amount Rs.</th>
                    <th>Amount $</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="10" className="sr-pending-empty">Loading report data...</td></tr>
                  ) : error ? (
                    <tr><td colSpan="10" className="sr-pending-empty sr-flight-report-error">{error}</td></tr>
                  ) : !appliedDate ? (
                    <tr><td colSpan="10" className="sr-pending-empty">Select a report date and search to view bookings.</td></tr>
                  ) : reportRows.length === 0 ? (
                    <tr><td colSpan="10" className="sr-pending-empty">No reservations found for this date.</td></tr>
                  ) : (
                    reportRows.map((row) => {
                      const flightDate = parseFlightDateTime(row[dateField]);
                      const isUsd = String(row.currency || "").toLowerCase().includes("$");
                      return (
                        <tr key={row.referenceNo || row.id || row.reportNo}>
                          <td>{row.reportNo}</td>
                          <td>{row.referenceNo || "-"}</td>
                          <td>{row.passengerName || row.localContactName || "Guest"}</td>
                          <td>{row[flightField] || "-"}</td>
                          <td>{flightDate ? formatReportDate(flightDate) : "-"}</td>
                          <td>{flightDate ? `${String(flightDate.getHours()).padStart(2, "0")}:${String(flightDate.getMinutes()).padStart(2, "0")}` : "-"}</td>
                          <td>{row.passengerCount || 1}</td>
                          <td>{isUsd ? "-" : row.amount || "0.00"}</td>
                          <td>{isUsd ? row.amount || "0.00" : "-"}</td>
                          <td>{row.comments || "-"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
