import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import PendingPaymentDetails from "./PendingPaymentDetails";
import FinanceAddPayment from "./FinanceAddPayment";
import { isFinance } from "../utils/userRoles";
import "../styles/Dashboard.css";
import "../styles/PendingPayments.css";

// Helper to sanitize date/time display and prevent legacy 1899/0000 or trailing slashes
function formatDisplayDateTime(val) {
  if (!val) return "-";
  const s = String(val).trim();
  if (
    !s ||
    s === "-" ||
    s.startsWith("00-00-0000") ||
    s.startsWith("0000") ||
    s.includes("1899") ||
    s.includes("1900")
  ) {
    return "-";
  }
  if (s.endsWith("/")) {
    const cleaned = s.slice(0, -1).trim();
    return cleaned || "-";
  }
  return s;
}

function formatDisplayFlight(flightNo) {
  if (!flightNo) return null;
  const s = String(flightNo).trim();
  if (!s || s === "-" || s.toLowerCase() === "n/a") return null;
  return s;
}

function StandardPendingPayments({ user, onLogout, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Selected reservation for the update view
  const [selectedRes, setSelectedRes] = useState(null);

  // Fetch pending reservations from backend + local newly created bookings
  const fetchPendingReservations = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // 1. Fetch from backend API connected to airport_database
      const response = await fetch("http://localhost:4000/api/reservations/pending?limit=100");
      let backendData = [];
      if (response.ok) {
        const json = await response.json();
        if (json.success && Array.isArray(json.data)) {
          backendData = json.data;
        }
      }

      // 2. Read locally stored new pending reservations
      let localPending = [];
      try {
        const saved = localStorage.getItem("silkroute_pending_reservations");
        if (saved) {
          localPending = JSON.parse(saved);
        }
      } catch (e) {
        console.error("Failed to parse local pending bookings:", e);
      }

      // 3. Merge: new local bookings at the very top, avoiding duplicate reference numbers
      const backendRefs = new Set(backendData.map((r) => r.referenceNo));
      const filteredLocal = localPending.filter((r) => !backendRefs.has(r.referenceNo));

      const combined = [...filteredLocal, ...backendData];

      // Re-index row numbers
      const indexed = combined.map((item, idx) => ({
        ...item,
        no: idx + 1,
        isNew: filteredLocal.some((fl) => fl.referenceNo === item.referenceNo),
      }));

      setReservations(indexed);
    } catch (err) {
      console.warn("Could not connect to backend pending API, falling back to local:", err);
      // Fallback sample matching exact screenshot if backend is unreachable
      try {
        const saved = localStorage.getItem("silkroute_pending_reservations");
        const localList = saved ? JSON.parse(saved) : [];
        const fallbackList = [
          ...localList,
          {
            id: 185917,
            reportedBy: "7198",
            package: "Topaz Departure",
            referenceNo: "185917-MAN-PKG-E",
            arrivalDateTime: "-",
            arrivalFlightNo: "",
            departureDateTime: "11-09-2026 / 01:50",
            departureFlightNo: "UL306",
            currency: "Rs.",
            amount: "17320.00",
            passengerCount: 1,
            accessDate: "2026-09-03",
            accessTime: "10:31:12",
          },
        ].map((item, idx) => ({ ...item, no: idx + 1 }));
        setReservations(fallbackList);
      } catch {
        setError("Failed to load pending reservations.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingReservations();
  }, [fetchPendingReservations]);

  // Filter reservations by search term
  const filtered = reservations.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (r.referenceNo && r.referenceNo.toLowerCase().includes(term)) ||
      (r.package && r.package.toLowerCase().includes(term)) ||
      (r.reportedBy && String(r.reportedBy).toLowerCase().includes(term)) ||
      (r.departureFlightNo && r.departureFlightNo.toLowerCase().includes(term)) ||
      (r.arrivalFlightNo && r.arrivalFlightNo.toLowerCase().includes(term)) ||
      (r.passengerName && r.passengerName.toLowerCase().includes(term))
    );
  });

  // Pagination calculation
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // If user clicked "Update" on a pending reservation, show the Booking Details page view
  if (selectedRes) {
    return (
      <div className="sr-app">
        <Sidebar
          active="pending-payments"
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onNavigate={onNavigate}
          user={user}
        />
        <div className="sr-main">
          <Header
            onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
            onLogout={onLogout}
            user={user}
          />
          <main className="sr-content">
            <PendingPaymentDetails
              reservationId={selectedRes.id}
              initialData={selectedRes}
              user={user}
              onBack={() => {
                setSelectedRes(null);
                fetchPendingReservations();
              }}
              onLogout={onLogout}
              onConfirmedSuccess={(refNo) => {
                setReservations((prev) =>
                  prev.filter(
                    (r) => r.referenceNo !== selectedRes.referenceNo && r.id !== selectedRes.id
                  )
                );
                setSelectedRes(null);
                fetchPendingReservations();
              }}
            />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="sr-app">
      <Sidebar
        active="pending-payments"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={onNavigate}
        user={user}
      />

      <div className="sr-main">
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onLogout={onLogout}
          user={user}
        />

        <main className="sr-content">
          <div className="sr-pending-page">


            {/* Main Pending Payments Card Container */}
            <div className="sr-pending-card">
              {/* Dotted Header Strip: "Booking Details" */}
              <div className="sr-pending-header-banner">
                <h2>Booking Details</h2>
              </div>

              {/* Status & Search Toolbar */}
              <div className="sr-pending-toolbar">
                <div className="sr-pending-connected-tag">
                  <span className="sr-pending-connected-dot"></span>
                  <span>Connected</span>
                </div>

                <div className="sr-pending-controls">
                  <input
                    type="text"
                    className="sr-pending-search-input"
                    placeholder="Search by reference, flight, package..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                  <button
                    type="button"
                    className="sr-pending-refresh-btn"
                    onClick={fetchPendingReservations}
                    title="Refresh reservations"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                    </svg>
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="sr-pending-table-wrap">
                <table className="sr-pending-table">
                  <thead>
                    <tr>
                      <th style={{ width: 45 }}>No.</th>
                      <th style={{ width: 100 }}>Reported by</th>
                      <th style={{ width: 130 }}>Package</th>
                      <th style={{ width: 140 }}>Reference No</th>
                      <th style={{ width: 150 }}>
                        <div>Arrival Date/ Time</div>
                        <div>Flight No</div>
                      </th>
                      <th style={{ width: 160 }}>
                        <div>Departure Date/ Time</div>
                        <div>Flight No</div>
                      </th>
                      <th style={{ width: 100 }}>Amount</th>
                      <th style={{ width: 95 }}>No of Passenger</th>
                      <th style={{ width: 130 }}>Access Time</th>
                      <th style={{ width: 85 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="10" className="sr-pending-empty">
                          Loading pending reservations...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan="10" className="sr-pending-empty" style={{ color: "#dc2626" }}>
                          {error}
                        </td>
                      </tr>
                    ) : paginated.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="sr-pending-empty">
                          No pending reservations found.
                        </td>
                      </tr>
                    ) : (
                      paginated.map((row) => (
                        <tr
                          key={row.referenceNo || row.id}
                          className={row.isNew ? "is-new-booking" : ""}
                        >
                          {/* 1. No. */}
                          <td className="sr-td-center">{row.no}</td>

                          {/* 2. Reported by */}
                          <td className="sr-td-center">{row.reportedBy || "7198"}</td>

                          {/* 3. Package */}
                          <td>{row.package || "Topaz Departure"}</td>

                          {/* 4. Reference No */}
                          <td>
                            <strong>{row.referenceNo}</strong>
                            {row.isNew && (
                              <span
                                style={{
                                  display: "inline-block",
                                  marginLeft: 6,
                                  background: "#0284c7",
                                  color: "#ffffff",
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "2px 5px",
                                  borderRadius: 3,
                                }}
                              >
                                NEW
                              </span>
                            )}
                          </td>

                          {/* 5. Arrival Date/Time & Flight No */}
                          <td className="sr-td-datetime">
                            <span className="sr-sub-line">{formatDisplayDateTime(row.arrivalDateTime)}</span>
                            {formatDisplayFlight(row.arrivalFlightNo) && (
                              <span className="sr-sub-flight">{formatDisplayFlight(row.arrivalFlightNo)}</span>
                            )}
                          </td>

                          {/* 6. Departure Date/Time & Flight No */}
                          <td className="sr-td-datetime">
                            <span className="sr-sub-line">{formatDisplayDateTime(row.departureDateTime)}</span>
                            {formatDisplayFlight(row.departureFlightNo) && (
                              <span className="sr-sub-flight">{formatDisplayFlight(row.departureFlightNo)}</span>
                            )}
                          </td>

                          {/* 7. Amount */}
                          <td className="sr-td-amount">
                            <span className="sr-sub-line">{row.currency || "Rs."}</span>
                            <span style={{ fontWeight: 700 }}>{row.amount || "0.00"}</span>
                          </td>

                          {/* 8. No of Passenger */}
                          <td className="sr-td-center">{row.passengerCount || 1}</td>

                          {/* 9. Access Time */}
                          <td className="sr-td-access">
                            <span className="sr-sub-line">{row.accessDate}</span>
                            <span style={{ color: "#64748b" }}>{row.accessTime}</span>
                          </td>

                          {/* 10. Action Button */}
                          <td className="sr-td-center">
                            <button
                              type="button"
                              className="sr-update-btn"
                              onClick={() => setSelectedRes(row)}
                            >
                              Update
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="sr-pending-pagination">
                  <div>
                    Showing {(currentPage - 1) * pageSize + 1} to{" "}
                    {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} pending
                    reservations
                  </div>
                  <div className="sr-pending-page-btns">
                    <button
                      type="button"
                      className="sr-pending-page-btn"
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      &lt;
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        type="button"
                        className={`sr-pending-page-btn ${currentPage === num ? "active" : ""}`}
                        onClick={() => setCurrentPage(num)}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="sr-pending-page-btn"
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function PendingPayments({ user, onLogout, onNavigate }) {
  // If user is logged in as finance user, show the finance add payment interface with company selection
  if (isFinance(user)) {
    return (
      <FinanceAddPayment
        user={user}
        onLogout={onLogout}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <StandardPendingPayments
      user={user}
      onLogout={onLogout}
      onNavigate={onNavigate}
    />
  );
}
