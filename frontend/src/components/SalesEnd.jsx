import React, { useCallback, useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import Sidebar from "./Sidebar";
import Header from "./Header";
import "../styles/Dashboard.css";
import "../styles/SalesEnd.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4000/api";

function formatCount(value) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : String(value);
}

function formatAmount(value, currency) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return `${currency} ${number.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(value) {
  if (!value) return "—";
  const text = String(value).trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    return `${year}-${month}-${day}${hour ? ` ${hour}:${minute}${second ? `:${second}` : ""}` : ""}`;
  }
  return text;
}

function downloadSalesReport(report) {
  const sales = report.sales || {};
  const pdf = new jsPDF();
  const details = [
    `Shift ID: ${report.shiftId}`,
    "Shift Status: 0 (Ended)",
    `Shift Start Time: ${report.startTime ? formatDateTime(report.startTime) : "N/A"}`,
    `Shift End Time: ${report.endTime ? formatDateTime(report.endTime) : "N/A"}`,
    `Shift Ended By: ${report.endedBy || "Unknown"}`,
    `Number of Reservations: ${formatCount(sales.reservation_count).replace("—", "N/A")}`,
    `Rupee Count: ${formatCount(sales.rupee_count).replace("—", "N/A")}`,
    `Dollar Count: ${formatCount(sales.dollar_count).replace("—", "N/A")}`,
    `Rupee Total: ${formatAmount(sales.rupee_total, "Rs.").replace("—", "N/A")}`,
    `Dollar Total: ${formatAmount(sales.dollar_total, "US $").replace("—", "N/A")}`,
    `Start Serial Number: ${sales.start_serial_number || "N/A"}`,
    `End Serial Number: ${sales.end_serial_number || "N/A"}`,
  ];

  pdf.setFontSize(18);
  pdf.text("Silk Route Sales End Report", 14, 20);
  pdf.setFontSize(10);
  pdf.text(details, 14, 34);

  const shiftId = String(report.shiftId || "shift").replace(/[^\w-]/g, "_");
  pdf.save(`sales-end-shift-${shiftId}.pdf`);
}

export default function SalesEnd({ user, onLogout, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [salesRows, setSalesRows] = useState([]);
  const [activeShift, setActiveShift] = useState(null);
  const [currentShift, setCurrentShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [endingSales, setEndingSales] = useState(false);
  const [error, setError] = useState("");

  const loadSalesRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/sales-end`);
      const json = await response.json();
      if (!response.ok || !json.success || !Array.isArray(json.data)) {
        throw new Error(json.error || `Sales data request failed (${response.status}).`);
      }
      setSalesRows(json.data);
      setActiveShift(json.activeShift || null);
      setCurrentShift(json.currentShift || null);
    } catch (loadError) {
      console.error("Could not load shift sales data:", loadError);
      setError(loadError.message || "Could not load shift sales data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSalesRows();
  }, [loadSalesRows]);

  async function handleEndSales() {
    if (!window.confirm("Do you want to end sales for the current shift?")) return;

    setEndingSales(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/sales-end/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endedBy: user?.name || user?.user_id || user?.username }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || `Could not end sales (${response.status}).`);
      }
      downloadSalesReport(json);
      onLogout();
    } catch (endError) {
      console.error("Could not end the active sales shift:", endError);
      setError(endError.message || "Could not end the active sales shift.");
    } finally {
      setEndingSales(false);
    }
  }

  const selectedRow = salesRows[0] || null;

  return (
    <div className="sr-app">
      <Sidebar
        active="sales-end"
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
        <main className="sr-content sr-sales-end-content">
          <section className="sr-sales-end-page">
            <header className="sr-sales-end-heading">
              <div>
                <span className="sr-sales-end-eyebrow">SHIFT REPORT</span>
                <h1>Silk Route Sales Data</h1>
                <p>Reservation counts and income for the current shift.</p>
              </div>
              <div className="sr-sales-end-actions">
                <span className={`sr-sales-end-shift-status${activeShift ? " is-active" : ""}`}>
                  {activeShift ? "Sales shift active" : "No active sales shift"}
                </span>
                <button
                  className="sr-sales-end-refresh"
                  type="button"
                  onClick={loadSalesRows}
                  disabled={loading || endingSales}
                >
                  {loading ? "Refreshing…" : "Refresh"}
                </button>
                <button
                  className="sr-sales-end-close"
                  type="button"
                  onClick={handleEndSales}
                  disabled={!activeShift || loading || endingSales}
                >
                  {endingSales ? "Ending Sales…" : "End Sales"}
                </button>
              </div>
            </header>

            <section className="sr-sales-end-card" aria-labelledby="sr-sales-end-title">
              <div className="sr-sales-end-card-header">
                <div>
                  <h2 id="sr-sales-end-title">Shift sales summary</h2>
                  <p>
                    {currentShift
                      ? `${activeShift ? "Current" : "Latest"} shift ${currentShift.shift_id} sales totals and session details.`
                      : "Sales details will appear here after a user logs in and starts a shift."}
                  </p>
                </div>
              </div>

              {error && <div className="sr-sales-end-error" role="alert">{error}</div>}
              {loading ? (
                <div className="sr-sales-end-state" role="status">Loading shift sales data…</div>
              ) : selectedRow ? (
                <>
                  <div className="sr-sales-end-summary">
                    <article className="sr-sales-end-metric">
                      <span>Number of Reservations</span>
                      <strong>{formatCount(selectedRow.reservation_count)}</strong>
                    </article>
                    <article className="sr-sales-end-metric">
                      <span>Rupee Count</span>
                      <strong>{formatCount(selectedRow.rupee_count)}</strong>
                    </article>
                    <article className="sr-sales-end-metric">
                      <span>Dollar Count</span>
                      <strong>{formatCount(selectedRow.dollar_count)}</strong>
                    </article>
                    <article className="sr-sales-end-metric is-rupee">
                      <span>Rupee Total</span>
                      <strong>{formatAmount(selectedRow.rupee_total, "Rs.")}</strong>
                    </article>
                    <article className="sr-sales-end-metric is-dollar">
                      <span>Dollar Total</span>
                      <strong>{formatAmount(selectedRow.dollar_total, "US $")}</strong>
                    </article>
                  </div>

                  <dl className="sr-sales-end-details">
                    <dt>Start Serial Number</dt><dd>{selectedRow.start_serial_number || "—"}</dd>
                    <dt>End Serial Number</dt><dd>{selectedRow.end_serial_number || "—"}</dd>
                    <dt>Shift Start Time</dt><dd>{formatDateTime(selectedRow.shift_start_time)}</dd>
                    <dt>Shift End Time</dt><dd>{formatDateTime(selectedRow.shift_end_time)}</dd>
                    <dt>Shift ID</dt><dd>{selectedRow.shift_id || "—"}</dd>
                    {selectedRow.ended_by && (
                      <><dt>Shift Ended By</dt><dd>{selectedRow.ended_by}</dd></>
                    )}
                  </dl>
                </>
              ) : (
                !error && (
                  <div className="sr-sales-end-state">
                    No shift sales data is available yet.
                  </div>
                )
              )}
            </section>
          </section>
        </main>
      </div>
    </div>
  );
}
