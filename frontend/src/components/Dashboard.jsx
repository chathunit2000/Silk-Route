import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import "../styles/Dashboard.css";
import { fetchDashboardData } from "../api/dashboardApi";

const FALLBACK_DATA = {
  stats: {
    todaysArrivals: { value: 12, change: "+20%" },
    todaysDepartures: { value: 15, change: "+25%" },
    pendingPayments: { value: 8, meta: "3.8h" },
    confirmedReservations: { value: 28, change: "↑ 12%" },
  },
  status: {
    pending: 8,
    confirmed: 28,
    onHold: 6,
    completed: 45,
  },
  recentReservations: [
    { id: "BK01620", passenger: "John Harper", flight: "NYC – LHR", lounge: "Business Lounge", status: "Confirmed" },
    { id: "BK01618", passenger: "Mia Perry", flight: "DXB – SIN", lounge: "Emirates", status: "Pending" },
    { id: "BK01614", passenger: "Ali S. Khan", flight: "LHR – CDG", lounge: "A380 Lounge", status: "Paid" },
    { id: "BK01609", passenger: "Sofia Martinez", flight: "LAX – NYC", lounge: "—", status: "Confirmed" },
    { id: "BK01604", passenger: "Liam Alexander", flight: "SIN – DXB", lounge: "VIP Lounge", status: "Completed" },
  ],
  recentActivity: [
    { title: "Reservation Confirmed", detail: "Booking BK01620 confirmed for John Harper", time: "1h ago", icon: "check" },
    { title: "Payment Pending", detail: "Payment is needed for booking BK01618", time: "2h ago", icon: "pencil" },
    { title: "New Reservation", detail: "New reservation created for M. Perry", time: "3h ago", icon: "plane" },
    { title: "Reservation Updated", detail: "Lounge details updated for BK01614", time: "4h ago", icon: "file" },
    { title: "Daily Report Generated", detail: "Daily sales report for 14 Sep 2026 generated", time: "5h ago", icon: "chart" },
  ],
};

const STAT_CARDS = [
  { key: "todaysArrivals", label: "Today's Arrivals", icon: "plane", tint: "blue" },
  { key: "todaysDepartures", label: "Today's Departures", icon: "plane-up", tint: "purple" },
  { key: "pendingPayments", label: "Pending Payments", icon: "clock", tint: "orange" },
  { key: "confirmedReservations", label: "Confirmed Reservations", icon: "check", tint: "green" },
];

const QUICK_ACTIONS = [
  { key: "new-reservation", label: "New Reservation", icon: "plus" },
  { key: "search-booking", label: "Search Booking", icon: "search" },
  { key: "pending-payments", label: "Pending Payments", icon: "card" },
  { key: "daily-audit", label: "Daily Audit Report", icon: "chart" },
  { key: "daily-departure", label: "Daily Departure Report", icon: "plane" },
];

const STATUS_TILES = [
  { key: "pending", label: "Pending", tint: "orange" },
  { key: "confirmed", label: "Confirmed", tint: "green" },
  { key: "onHold", label: "On-hold", tint: "blue" },
  { key: "completed", label: "Completed", tint: "purple" },
];

const STATUS_PILL_CLASS = {
  Confirmed: "is-green",
  Pending: "is-orange",
  Paid: "is-blue",
  Completed: "is-purple",
};

function StatIcon({ name }) {
  const s = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "plane":
    case "plane-up":
      return <svg {...s}><path d="M17.8 19.2 16 11l3.5-3.5a1.5 1.5 0 0 0-2.1-2.1L14 9 5.8 7.2 4 9l6 3-3 3H4l-1 2 5 1.5L9.5 23l2-1-1.8-8.2 3-3 3 6z" /></svg>;
    case "clock":
      return <svg {...s}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>;
    case "check":
      return <svg {...s}><path d="M20 6 9 17l-5-5" /></svg>;
    default:
      return null;
  }
}

function QuickActionIcon({ name }) {
  const s = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "plus":
      return <svg {...s}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
    case "search":
      return <svg {...s}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
    case "card":
      return <svg {...s}><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>;
    case "chart":
      return <svg {...s}><line x1="4" y1="20" x2="4" y2="12" /><line x1="12" y1="20" x2="12" y2="6" /><line x1="20" y1="20" x2="20" y2="14" /></svg>;
    case "plane":
      return <svg {...s}><path d="M17.8 19.2 16 11l3.5-3.5a1.5 1.5 0 0 0-2.1-2.1L14 9 5.8 7.2 4 9l6 3-3 3H4l-1 2 5 1.5L9.5 23l2-1-1.8-8.2 3-3 3 6z" /></svg>;
    default:
      return null;
  }
}

function ActivityIcon({ name }) {
  const s = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "check":
      return <svg {...s}><circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-6" /></svg>;
    case "pencil":
      return <svg {...s}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>;
    case "plane":
      return <svg {...s}><path d="M17.8 19.2 16 11l3.5-3.5a1.5 1.5 0 0 0-2.1-2.1L14 9 5.8 7.2 4 9l6 3-3 3H4l-1 2 5 1.5L9.5 23l2-1-1.8-8.2 3-3 3 6z" /></svg>;
    case "file":
      return <svg {...s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
    case "chart":
      return <svg {...s}><line x1="4" y1="20" x2="4" y2="12" /><line x1="12" y1="20" x2="12" y2="6" /><line x1="20" y1="20" x2="20" y2="14" /></svg>;
    default:
      return null;
  }
}

export default function Dashboard({ user, onLogout, onNavigate }) {
  const [data, setData] = useState(FALLBACK_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchDashboardData()
      .then((result) => {
        if (!cancelled && result) setData(result);
      })
      .catch(() => {
        // Keep the fallback sample data if the API isn't reachable yet.
        if (!cancelled) setError("Showing sample data — could not reach the API.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="sr-app">
      <Sidebar
        active="dashboard"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={onNavigate}
      />
      <div className="sr-main">
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onLogout={onLogout}
          user={user}
        />
        <main className="sr-content">
          <div className="sr-welcome">
            <div className="sr-welcome-content">
              <h2>Welcome, {user?.username || "Admin"}</h2>
              <p>Manage reservations, payments and lounges securely and efficiently.</p>
            </div>
            <div className="sr-welcome-badge">
              <span className="sr-pulse-dot"></span>
              <span>Live Operations</span>
            </div>
          </div>

          {error && <div className="sr-banner">{error}</div>}

          <section className="sr-stat-grid">
            {STAT_CARDS.map((card) => {
              const stat = data.stats[card.key] || {};
              return (
                <div className="sr-stat-card" key={card.key}>
                  <div className="sr-stat-card-top">
                    <div className={`sr-stat-icon sr-tint-${card.tint}`}>
                      <StatIcon name={card.icon} />
                    </div>
                    {(stat.change || stat.meta) && (
                      <div className="sr-stat-sub">{stat.change || stat.meta}</div>
                    )}
                  </div>
                  <div className="sr-stat-value">{loading ? "…" : stat.value}</div>
                  <div className="sr-stat-label">{card.label}</div>
                </div>
              );
            })}
          </section>

          <h3 className="sr-section-title">Quick Actions</h3>
          <section className="sr-quick-actions">
            {QUICK_ACTIONS.map((action) => (
              <button
                className="sr-quick-action"
                key={action.key}
                onClick={() => {
                  if (action.key === "new-reservation" && onNavigate) {
                    onNavigate("add-new-reservation");
                  }
                }}
              >
                <span className="sr-quick-action-icon">
                  <QuickActionIcon name={action.icon} />
                </span>
                <span className="sr-quick-action-label">{action.label}</span>
              </button>
            ))}
          </section>

          <h3 className="sr-section-title">Reservation Status</h3>
          <section className="sr-status-grid">
            {STATUS_TILES.map((tile) => (
              <div className={`sr-status-tile sr-tint-soft-${tile.tint}`} key={tile.key}>
                <div className="sr-status-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-6" />
                  </svg>
                  <span>{tile.label}</span>
                </div>
                <div className="sr-status-value">{loading ? "…" : data.status[tile.key]}</div>
              </div>
            ))}
          </section>

          <section className="sr-panels">
            <div className="sr-panel sr-reservations">
              <div className="sr-panel-header">
                <h3>Recent Reservations</h3>
                <a href="#view-all" className="sr-view-all">View All →</a>
              </div>
              <div className="sr-table-wrap">
                <table className="sr-table">
                  <thead>
                    <tr>
                      <th>Booking ID</th>
                      <th>Passenger</th>
                      <th>Flight</th>
                      <th>Lounge</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentReservations.map((row) => (
                      <tr key={row.id}>
                        <td className="sr-booking-id">{row.id}</td>
                        <td className="sr-passenger-name">{row.passenger}</td>
                        <td><span className="sr-flight-tag">{row.flight}</span></td>
                        <td>{row.lounge}</td>
                        <td>
                          <span className={`sr-pill ${STATUS_PILL_CLASS[row.status] || ""}`}>{row.status}</span>
                        </td>
                        <td>
                          <button className="sr-view-link">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="sr-panel sr-activity">
              <div className="sr-panel-header">
                <h3>Recent Activity</h3>
                <span className="sr-more">•••</span>
              </div>
              <ul className="sr-activity-list">
                {data.recentActivity.map((item, idx) => (
                  <li key={idx} className="sr-activity-item">
                    <span className="sr-activity-icon">
                      <ActivityIcon name={item.icon} />
                    </span>
                    <span className="sr-activity-body">
                      <span className="sr-activity-title-row">
                        <strong>{item.title}</strong>
                        <span className="sr-activity-time">{item.time}</span>
                      </span>
                      <span className="sr-activity-detail">{item.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </main>
        <footer className="sr-footer">
          <span>© 2026 Silk Route Manual Booking. All rights reserved.</span>
          <span className="sr-footer-support"></span>
        </footer>
      </div>
    </div>
  );
}
