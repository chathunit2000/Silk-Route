import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import downloadExcel from "../utils/downloadExcel";
import "../styles/Dashboard.css";
import "../styles/PendingPayments.css";
import "../styles/ImmigrationEmigrationReport.css";

function readLocalReservations() {
  return ["silkroute_pending_reservations", "silkroute_confirmed_reservations"].flatMap(
    (key) => {
      try {
        const saved = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(saved) ? saved : [];
      } catch (error) {
        console.error(`Could not read ${key}:`, error);
        return [];
      }
    }
  );
}

function normalizeLocalReservation(reservation) {
  const passengers = reservation.passengersList || reservation.passengers;
  const passengerNames = Array.isArray(passengers)
    ? passengers.map((passenger) => passenger.name).filter(Boolean).join(", ")
    : reservation.passengerName || reservation.localContactName || "";
  const passportNumbers = Array.isArray(passengers)
    ? passengers
        .map((passenger) => passenger.passportNo || passenger.Passport_number)
        .filter(Boolean)
        .join(", ")
    : reservation.passportNo || "";

  return {
    ...reservation,
    passengerNames,
    passportNumbers,
  };
}

function mergeReservations(localReservations, backendReservations) {
  const byReference = new Map();
  [...localReservations.map(normalizeLocalReservation), ...backendReservations].forEach(
    (reservation, index) => {
      const key = reservation.referenceNo || reservation.id || `reservation-${index}`;
      byReference.set(String(key), reservation);
    }
  );
  return Array.from(byReference.values());
}

function parseFlightDateTime(value) {
  if (!value || typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized === "-" || normalized.startsWith("00-00")) return null;

  const dayMonthYear = normalized.match(
    /^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s*\/?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (dayMonthYear) {
    const [, day, month, year, hour = "0", minute = "0", second = "0"] = dayMonthYear;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
  }

  const isoDate = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/
  );
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

function formatDate(date) {
  return `${String(date.getDate()).padStart(2, "0")}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${date.getFullYear()}`;
}

function getFlightDateTime(value) {
  const date = parseFlightDateTime(value);
  if (!date) return { date: "-", time: "-" };
  return {
    date: formatDate(date),
    time: `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`,
  };
}

export default function ImmigrationEmigrationReport({ user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [direction, setDirection] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [appliedDate, setAppliedDate] = useState("");
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReservations() {
      const localReservations = readLocalReservations();
      try {
        const response = await fetch("http://localhost:4000/api/reservations/all");
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
          if (localReservations.length) {
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

  const isArrival = direction === "arrival";
  const dateField = isArrival ? "arrivalDateTime" : "departureDateTime";
  const flightField = isArrival ? "arrivalFlightNo" : "departureFlightNo";
  const reportRows = useMemo(() => {
    if (!direction || !appliedDate) return [];
    const [year, month, day] = appliedDate.split("-").map(Number);
    const start = new Date(year, month - 1, day);
    const end = new Date(year, month - 1, day + 1);

    return reservations
      .filter((reservation) => {
        const flightDate = parseFlightDateTime(reservation[dateField]);
        return flightDate && flightDate >= start && flightDate < end;
      })
      .map((reservation, index) => ({ ...reservation, reportNo: index + 1 }));
  }, [appliedDate, dateField, direction, reservations]);

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
    if (!direction || !appliedDate) {
      setError("Select a report type and date before downloading.");
      return;
    }

    const headers = [
      "No.",
      "Passenger Name(s)",
      "Passport No(s)",
      "Flight No.",
      isArrival ? "Arrival Date" : "Departure Date",
      isArrival ? "Arrival Time" : "Departure Time",
      "Ref No",
    ];
    const rows = reportRows.map((row) => {
      const flightDateTime = getFlightDateTime(row[dateField]);
      return [
        row.reportNo,
        row.passengerNames || row.passengerName || "-",
        row.passportNumbers || row.passportNo || "-",
        row[flightField] || "-",
        flightDateTime.date,
        flightDateTime.time,
        row.referenceNo || "-",
      ];
    });

    try {
      downloadExcel(
        `${isArrival ? "immigration-arrival" : "emigration-departure"}-report-${appliedDate}`,
        `${isArrival ? "Arrival" : "Departure"} Report`,
        headers,
        rows
      );
    } catch (downloadError) {
      console.error("Could not download immigration/emigration report:", downloadError);
      setError("Could not create the Excel report. Please try again.");
    }
  };

  return (
    <div className="sr-app">
      <Sidebar
        active="Immigration Emigration Report"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
      />
      <div className="sr-main">
        <Header
          onToggleSidebar={() => setSidebarOpen((previous) => !previous)}
          onLogout={onLogout}
          user={user}
        />
        <main className="sr-content">
          <section className="sr-ie-report sr-pending-page">
            <div className="sr-pending-card">
              <div className="sr-pending-header-banner sr-ie-report-header">
                <div>
                  <h2>Immigration / Emigration Report</h2>
                  <p>Select passenger details by arrival or departure date.</p>
                </div>
              </div>

              <div className="sr-ie-report-options" role="group" aria-label="Passenger report type">
                <span>Please Select an Option:</span>
                <button
                  type="button"
                  className={isArrival ? "is-selected" : ""}
                  aria-pressed={isArrival}
                  onClick={() => {
                    setDirection("arrival");
                    setAppliedDate("");
                    setError("");
                  }}
                >
                  Arrival Passenger Details
                </button>
                <button
                  type="button"
                  className={direction === "departure" ? "is-selected" : ""}
                  aria-pressed={direction === "departure"}
                  onClick={() => {
                    setDirection("departure");
                    setAppliedDate("");
                    setError("");
                  }}
                >
                  Departure Passenger Details
                </button>
              </div>

              {direction && (
                <>
                  <div className="sr-ie-report-toolbar">
                    <div className="sr-ie-report-status" aria-live="polite">
                      <span className={`sr-ie-report-dot ${error ? "is-error" : ""}`} />
                      {loading ? "Loading reservations..." : error || notice || "Connected"}
                    </div>
                    <div className="sr-ie-report-controls">
                      <label htmlFor="ie-report-date">Select the Date</label>
                      <input
                        id="ie-report-date"
                        type="date"
                        value={selectedDate}
                        onChange={(event) => setSelectedDate(event.target.value)}
                      />
                      <div className="sr-ie-report-actions">
                        <button type="button" onClick={handleSearch}>Search</button>
                        <button type="button" className="is-secondary" onClick={handleReset}>Reset</button>
                        <button
                          type="button"
                          onClick={handleDownload}
                          disabled={!appliedDate || loading}
                        >
                          Download Excel
                        </button>
                      </div>
                    </div>
                  </div>

                  {appliedDate && !error && (
                    <div className="sr-ie-report-count" aria-live="polite">
                      {reportRows.length} {reportRows.length === 1 ? "passenger booking" : "passenger bookings"}
                    </div>
                  )}

                  <div className="sr-ie-report-table-wrap">
                    <table className="sr-ie-report-table">
                      <thead>
                        <tr>
                          <th>No.</th>
                          <th>Passenger Name(s)</th>
                          <th>Passport No(s)</th>
                          <th>Flight No.</th>
                          <th>{isArrival ? "Arrival Date" : "Departure Date"}</th>
                          <th>{isArrival ? "Arrival Time" : "Departure Time"}</th>
                          <th>Ref No</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan="7">Loading reservations...</td></tr>
                        ) : error ? (
                          <tr><td colSpan="7" className="is-error">{error}</td></tr>
                        ) : !appliedDate ? (
                          <tr><td colSpan="7">Select a date and search to view passenger details.</td></tr>
                        ) : reportRows.length === 0 ? (
                          <tr><td colSpan="7">No reservations found for this date.</td></tr>
                        ) : reportRows.map((row) => {
                          const flightDateTime = getFlightDateTime(row[dateField]);
                          return (
                            <tr key={row.referenceNo || row.id || row.reportNo}>
                              <td>{row.reportNo}</td>
                              <td>{row.passengerNames || row.passengerName || "-"}</td>
                              <td>{row.passportNumbers || row.passportNo || "-"}</td>
                              <td>{row[flightField] || "-"}</td>
                              <td>{flightDateTime.date}</td>
                              <td>{flightDateTime.time}</td>
                              <td>{row.referenceNo || "-"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
