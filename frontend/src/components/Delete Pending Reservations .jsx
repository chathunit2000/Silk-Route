import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import "../styles/Dashboard.css";
import "../styles/Delete Pending Reservations .css";

// Helper to sanitize date/time display
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

export default function DeletePendingReservations({ user, onLogout, onNavigate }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Modal State for Delete Confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch pending reservations from backend
  const fetchPendingList = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const response = await fetch("http://localhost:4000/api/reservations/pending?limit=150");
      if (response.ok) {
        const json = await response.json();
        if (json.success && Array.isArray(json.data)) {
          setReservations(json.data);
          return;
        }
      }
      throw new Error("Failed to load pending reservations.");
    } catch (err) {
      console.warn("Could not load pending bookings from backend, checking local storage:", err);
      try {
        const saved = localStorage.getItem("silkroute_pending_reservations");
        if (saved) {
          const parsed = JSON.parse(saved);
          setReservations(parsed);
        } else {
          setErrorMsg("Failed to load pending reservations from database.");
        }
      } catch {
        setErrorMsg("Failed to load pending reservations from database.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingList();
  }, [fetchPendingList]);

  // Handle Delete Confirmation via DELETE /api/reservations/pending/:id
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const response = await fetch(
        `http://localhost:4000/api/reservations/pending/${deleteTarget.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deletedBy: user?.username || user?.name || "Administrator",
          }),
        }
      );

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || "Failed to delete pending reservation.");
      }

      // Also clean up local storage if present
      try {
        const saved = localStorage.getItem("silkroute_pending_reservations");
        if (saved) {
          const list = JSON.parse(saved);
          const updated = list.filter(
            (item) => item.id !== deleteTarget.id && item.referenceNo !== deleteTarget.referenceNo
          );
          localStorage.setItem("silkroute_pending_reservations", JSON.stringify(updated));
        }
      } catch (e) {
        console.error(e);
      }

      setSuccessMsg(`Pending reservation ${deleteTarget.referenceNo} was permanently deleted from the database.`);
      setDeleteTarget(null);
      await fetchPendingList();

      setTimeout(() => {
        setSuccessMsg("");
      }, 5000);
    } catch (err) {
      setErrorMsg(err.message || "Failed to delete pending reservation.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter reservations
  const filtered = reservations.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (r.referenceNo && r.referenceNo.toLowerCase().includes(term)) ||
      (r.package && r.package.toLowerCase().includes(term)) ||
      (r.reportedBy && String(r.reportedBy).toLowerCase().includes(term)) ||
      (r.passengerName && r.passengerName.toLowerCase().includes(term)) ||
      (r.arrivalFlightNo && r.arrivalFlightNo.toLowerCase().includes(term)) ||
      (r.departureFlightNo && r.departureFlightNo.toLowerCase().includes(term))
    );
  });

  // Pagination calculation
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Quick stats
  const totalBookings = reservations.length;
  const totalPassengers = reservations.reduce((acc, curr) => acc + (parseInt(curr.passengerCount, 10) || 1), 0);

  return (
    <div className="sr-app">
      <Sidebar
        active="delete pending payments"
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
          <div className="sr-delpend-page">
            {/* 1. Breadcrumb & Navigation Bar matching Delete Confirm Reservation & Dashboard */}
            <div className="sr-delpend-header-bar">
              <div className="sr-delpend-header-left">
                <button
                  className="sr-delpend-back-btn"
                  onClick={() => {
                    if (onNavigate) onNavigate("dashboard");
                    navigate("/dashboard");
                  }}
                  type="button"
                  title="Return to Dashboard Overview"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                </button>
                <div className="sr-delpend-title-wrap">
                  <h2>Delete Pending Reservations</h2>
                  <p>
                    Review, manage, and permanently discard unpaid or cancelled pending reservations from the airport database.
                  </p>
                </div>
              </div>
              <div className="sr-delpend-header-meta">
                <div className="sr-delpend-badge-danger">
                  <span className="sr-delpend-pulse-dot" />
                  <span>Admin Authority</span>
                </div>
              </div>
            </div>

            {/* 2. Operational Warning Banner */}
            <div className="sr-delpend-notice-banner">
              <span className="sr-delpend-notice-icon">!</span>
              <div className="sr-delpend-notice-content">
                <span className="sr-delpend-notice-title">Critical Security Warning:</span>
                Permanently deleting a pending reservation will remove customer booking records, flight schedules, and associated visitor passes from airport_database.cip. Action will be recorded in action_log.
              </div>
            </div>

            {/* 3. Modern Stats Cards Grid */}
            <div className="sr-delpend-stats-grid">
              <div className="sr-delpend-stat-card">
                <div className="sr-delpend-stat-icon red">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </div>
                <div className="sr-delpend-stat-info">
                  <span className="sr-delpend-stat-val">{totalBookings}</span>
                  <span className="sr-delpend-stat-label">Pending Records</span>
                </div>
              </div>

              <div className="sr-delpend-stat-card">
                <div className="sr-delpend-stat-icon blue">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="sr-delpend-stat-info">
                  <span className="sr-delpend-stat-val">{totalPassengers}</span>
                  <span className="sr-delpend-stat-label">Pending Passengers</span>
                </div>
              </div>

              <div className="sr-delpend-stat-card">
                <div className="sr-delpend-stat-icon amber">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div className="sr-delpend-stat-info">
                  <span className="sr-delpend-stat-val">Full Privileges</span>
                  <span className="sr-delpend-stat-label">System Administrator</span>
                </div>
              </div>
            </div>

            {/* 4. Feedback Alerts */}
            {successMsg && (
              <div className="sr-delpend-alert-banner success">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="sr-delpend-alert-banner error">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 5. Main Card Container with Modern Table */}
            <div className="sr-delpend-card">
              <div className="sr-delpend-card-header">
                <div className="sr-delpend-card-title-group">
                  <span className="sr-delpend-card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <line x1="10" y1="14" x2="14" y2="18" />
                      <line x1="14" y1="14" x2="10" y2="18" />
                    </svg>
                  </span>
                  <h3>Active Pending Payment Reservations</h3>
                </div>

                <div className="sr-delpend-card-toolbar">
                  <input
                    type="text"
                    className="sr-delpend-search-input"
                    placeholder="Search reference, passenger, flight..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                  <button
                    type="button"
                    className="sr-delpend-refresh-btn"
                    onClick={fetchPendingList}
                    title="Refresh data from database"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                    </svg>
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Modern Data Table */}
              <div className="sr-delpend-table-wrap">
                <table className="sr-delpend-table">
                  <thead>
                    <tr>
                      <th className="center" style={{ width: 50 }}>No.</th>
                      <th className="center" style={{ width: 110 }}>Reported By</th>
                      <th style={{ width: 150 }}>Package</th>
                      <th style={{ width: 170 }}>Reference &amp; Passenger</th>
                      <th style={{ width: 170 }}>Arrival Date &amp; Flight</th>
                      <th style={{ width: 170 }}>Departure Date &amp; Flight</th>
                      <th className="center" style={{ width: 110 }}>Amount</th>
                      <th className="center" style={{ width: 90 }}>No of Pax</th>
                      <th className="center" style={{ width: 130 }}>Access Time</th>
                      <th className="center" style={{ width: 100 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="10">
                          <div className="sr-delpend-empty-state">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sr-spinner">
                              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                              <path d="M12 2a10 10 0 0 1 10 10" />
                            </svg>
                            <span>Loading pending reservations from database...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginated.length === 0 ? (
                      <tr>
                        <td colSpan="10">
                          <div className="sr-delpend-empty-state">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <circle cx="11" cy="11" r="8" />
                              <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <span>No pending reservations matching your filter criteria.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginated.map((row, idx) => {
                        const rowNumber = (currentPage - 1) * pageSize + idx + 1;

                        return (
                          <tr key={row.referenceNo || row.id}>
                            {/* 1. No */}
                            <td className="sr-delpend-td-center">{rowNumber}</td>

                            {/* 2. Reported by */}
                            <td className="sr-delpend-td-center">
                              <strong>{row.reportedBy || "7198"}</strong>
                            </td>

                            {/* 3. Package */}
                            <td>{row.package || "Topaz Departure"}</td>

                            {/* 4. Reference & Passenger */}
                            <td>
                              <span className="sr-delpend-ref-badge">{row.referenceNo}</span>
                              <span className="sr-delpend-pax-name">
                                {row.passengerName || "Lead Passenger"}
                              </span>
                            </td>

                            {/* 5. Arrival */}
                            <td className="sr-delpend-td-datetime">
                              <span className="sr-delpend-sub-line">{formatDisplayDateTime(row.arrivalDateTime)}</span>
                              {formatDisplayFlight(row.arrivalFlightNo) && (
                                <span className="sr-delpend-sub-flight">{formatDisplayFlight(row.arrivalFlightNo)}</span>
                              )}
                            </td>

                            {/* 6. Departure */}
                            <td className="sr-delpend-td-datetime">
                              <span className="sr-delpend-sub-line">{formatDisplayDateTime(row.departureDateTime)}</span>
                              {formatDisplayFlight(row.departureFlightNo) && (
                                <span className="sr-delpend-sub-flight">{formatDisplayFlight(row.departureFlightNo)}</span>
                              )}
                            </td>

                            {/* 7. Amount */}
                            <td className="sr-delpend-td-amount">
                              <span className="sr-delpend-sub-line">{row.currency || "Rs."}</span>
                              <span>{row.amount || "0.00"}</span>
                            </td>

                            {/* 8. Pax Count */}
                            <td className="sr-delpend-td-center">
                              <strong>{row.passengerCount || 1}</strong>
                            </td>

                            {/* 9. Access Time */}
                            <td className="sr-delpend-td-access">
                              <div>{row.accessDate || row.payment_access_time?.slice(0, 10) || row.Accessed_time?.slice(0, 10) || "-"}</div>
                              <div style={{ color: "#64748b" }}>
                                {row.accessTime || row.payment_access_time?.slice(11, 19) || row.Accessed_time?.slice(11, 19) || ""}
                              </div>
                            </td>

                            {/* 10. Delete Button */}
                            <td className="sr-delpend-td-center">
                              <button
                                type="button"
                                className="sr-delete-btn-pro"
                                onClick={() => setDeleteTarget(row)}
                                title="Permanently delete pending reservation"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                <span>Delete</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="sr-delpend-pagination">
                  <div>
                    Showing {(currentPage - 1) * pageSize + 1} to{" "}
                    {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} reservations
                  </div>
                  <div className="sr-delpend-page-btns">
                    <button
                      type="button"
                      className="sr-delpend-page-btn"
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      &lt;
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        type="button"
                        className={`sr-delpend-page-btn ${currentPage === num ? "is-active" : ""}`}
                        onClick={() => setCurrentPage(num)}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="sr-delpend-page-btn"
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

      {/* Professional Confirmation Modal */}
      {deleteTarget && (
        <div className="sr-delpend-modal-backdrop">
          <div className="sr-delpend-modal-card">
            <div className="sr-delpend-modal-top">
              <div className="sr-delpend-modal-warning-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className="sr-delpend-modal-title-wrap">
                <h3>Permanent Deletion Request</h3>
                <p>This action will discard pending records directly from airport_database</p>
              </div>
            </div>

            <div className="sr-delpend-modal-content">
              <p className="sr-delpend-modal-msg">
                Are you sure you want to permanently delete this pending reservation? All passenger records and flight schedules associated with this reference will be permanently removed.
              </p>
              <div className="sr-delpend-modal-info-box">
                <div className="sr-delpend-modal-row">
                  <span className="label">Reference No:</span>
                  <span className="value" style={{ fontFamily: "monospace", color: "#dc2626" }}>{deleteTarget.referenceNo}</span>
                </div>
                <div className="sr-delpend-modal-row">
                  <span className="label">Package:</span>
                  <span className="value">{deleteTarget.package}</span>
                </div>
                <div className="sr-delpend-modal-row">
                  <span className="label">Passenger:</span>
                  <span className="value">{deleteTarget.passengerName || "-"}</span>
                </div>
                <div className="sr-delpend-modal-row">
                  <span className="label">Amount:</span>
                  <span className="value">{deleteTarget.currency || "Rs."} {deleteTarget.amount || "0.00"}</span>
                </div>
              </div>
            </div>

            <div className="sr-delpend-modal-bottom">
              <button
                type="button"
                className="sr-delpend-btn-cancel"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sr-delpend-btn-danger"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="sr-spinner">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
