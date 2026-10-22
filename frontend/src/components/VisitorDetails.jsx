import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import "../styles/Dashboard.css";
import "../styles/PendingPayments.css";
import "../styles/VisitorDetails.css";

export default function VisitorDetails({ user, onLogout, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [searchedDate, setSearchedDate] = useState("");
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!selectedDate) {
      setError("Select a date to view visitor details.");
      setVisitors([]);
      setSearchedDate("");
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError("");
    setHasSearched(true);
    setSearchedDate(selectedDate);

    try {
      const response = await fetch(
        `http://localhost:4000/api/reservations/visitors?date=${encodeURIComponent(selectedDate)}`
      );
      const result = await response.json();
      if (!response.ok || !result.success || !Array.isArray(result.data)) {
        throw new Error(result.error || "Failed to load visitor details.");
      }
      setVisitors(result.data);
    } catch (requestError) {
      setVisitors([]);
      setError(requestError.message || "Failed to load visitor details.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedDate("");
    setSearchedDate("");
    setVisitors([]);
    setError("");
    setHasSearched(false);
  };

  return (
    <div className="sr-app">
      <Sidebar
        active="visitors' details"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={onNavigate}
        user={user}
      />
      <div className="sr-main">
        <Header
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          onLogout={onLogout}
          user={user}
        />
        <main className="sr-content">
          <section className="sr-visitor-page sr-pending-page">
            <div className="sr-pending-card sr-visitor-card">
              <div className="sr-pending-header-banner sr-visitor-header">
                <div>
                  <h2>Visitors&apos; Details</h2>
                  <p>Review visitor and vehicle information for arriving reservations.</p>
                </div>
                <span className="sr-visitor-badge">VISITOR REPORT</span>
              </div>

              <div className="sr-pending-toolbar sr-visitor-toolbar">
                <div className="sr-pending-connected-tag" aria-live="polite">
                  <span className={`sr-pending-connected-dot ${error ? "is-error" : ""}`}></span>
                  <span>{loading ? "Loading visitor details..." : error || "Connected"}</span>
                </div>
                <div className="sr-visitor-controls">
                  <div className="sr-visitor-date-field">
                    <label htmlFor="visitor-report-date">Select the Date</label>
                    <input
                      id="visitor-report-date"
                      type="date"
                      value={selectedDate}
                      onChange={(event) => setSelectedDate(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleSearch();
                      }}
                    />
                  </div>
                  <div className="sr-visitor-actions">
                    <button
                      type="button"
                      className="sr-visitor-search-btn"
                      onClick={handleSearch}
                      disabled={loading}
                    >
                      Search
                    </button>
                    <button
                      type="button"
                      className="sr-pending-refresh-btn sr-visitor-reset-btn"
                      onClick={handleReset}
                      disabled={loading}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {searchedDate && (
                <div className="sr-visitor-summary">
                  <div>
                    <span className="sr-visitor-summary-label">ARRIVAL DATE</span>
                    <h3>{searchedDate}</h3>
                  </div>
                  <span className="sr-visitor-count">
                    {visitors.length} {visitors.length === 1 ? "reservation" : "reservations"}
                  </span>
                </div>
              )}

              <div className="sr-pending-table-wrap sr-visitor-table-wrap">
                <table className="sr-pending-table sr-visitor-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Ref. No</th>
                      <th>Arrival Time</th>
                      <th>Flight No.</th>
                      <th>Visitors&apos; name(s)</th>
                      <th>Vehicle No.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="sr-pending-empty">Loading visitor details...</td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan="6" className="sr-pending-empty sr-visitor-error">{error}</td>
                      </tr>
                    ) : !hasSearched ? (
                      <tr>
                        <td colSpan="6" className="sr-pending-empty">Select a date and search to view visitor details.</td>
                      </tr>
                    ) : visitors.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="sr-pending-empty">No reservations with visitor details found for this date.</td>
                      </tr>
                    ) : (
                      visitors.map((row) => (
                        <tr key={row.referenceNo || row.no}>
                          <td>{row.no}</td>
                          <td><strong>{row.referenceNo || "-"}</strong></td>
                          <td>{row.arrivalDateTime || "-"}</td>
                          <td>{row.arrivalFlightNo || "-"}</td>
                          <td>{row.visitors || "-"}</td>
                          <td>{row.vehicleNo && row.vehicleNo !== "N/A" ? row.vehicleNo : "-"}</td>
                        </tr>
                      ))
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
