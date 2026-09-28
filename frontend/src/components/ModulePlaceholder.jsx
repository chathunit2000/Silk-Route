import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import "../styles/Dashboard.css";

export default function ModulePlaceholder({
  user,
  onLogout,
  title = "Module Under Development",
  navKey = "dashboard",
  description = "This operational section is currently scheduled for deployment.",
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="sr-app">
      <Sidebar
        active={navKey}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="sr-main">
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onLogout={onLogout}
          user={user}
        />
        <main className="sr-content">
          <div className="sr-packages-page">
            <div className="sr-packages-header-bar">
              <div className="sr-packages-header-left">
                <button
                  className="sr-back-btn"
                  onClick={() => navigate(-1)}
                  type="button"
                  title="Go back to previous page"
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
                  <span>&lt; BACK</span>
                </button>
                <div className="sr-packages-title-wrap">
                  <h2>{title}</h2>
                  <p>{description}</p>
                </div>
              </div>
              <div className="sr-packages-header-meta">
                <div className="sr-res-breadcrumbs" style={{ margin: 0 }}>
                  <Link to="/dashboard">Dashboard</Link>
                  <span className="separator">/</span>
                  <span>{title}</span>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "28px",
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%)",
                borderRadius: "16px",
                border: "1px dashed rgba(255, 255, 255, 0.16)",
                padding: "50px 30px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "18px",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "rgba(217, 119, 6, 0.12)",
                  border: "1px solid rgba(217, 119, 6, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#f59e0b",
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>

              <div>
                <h3 style={{ fontSize: "20px", color: "#f8fafc", margin: "0 0 8px 0", fontWeight: 600 }}>
                  {title} Module Active Route
                </h3>
                <p style={{ color: "#94a3b8", maxWidth: "520px", margin: "0 auto", fontSize: "14px", lineHeight: "1.6" }}>
                  This operational view has been connected to React Router with full browser backward and forward history navigation. Live integration with backend records will populate here.
                </p>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "12px", flexWrap: "wrap", justifyContent: "center" }}>
                <button
                  type="button"
                  className="sr-res-submit-btn"
                  onClick={() => navigate("/dashboard")}
                  style={{ minWidth: "160px" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  <span>Dashboard Overview</span>
                </button>
                <button
                  type="button"
                  className="sr-res-cancel-btn"
                  onClick={() => navigate("/packages")}
                  style={{ minWidth: "160px" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  <span>Add New Reservation</span>
                </button>
                <button
                  type="button"
                  className="sr-res-cancel-btn"
                  onClick={() => navigate(-1)}
                  style={{ minWidth: "140px" }}
                >
                  <span>&larr; Go Back</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
