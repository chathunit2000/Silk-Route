import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/Dashboard.css";
import { NAV_ROUTES } from "../routes/navRoutes";


function Icon({ name }) {
  // Minimal inline icon set so the sidebar has no external dependency.
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: { flexShrink: 0 },
  };

  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "credit-card-clock":
      return (
        <svg {...common}>
          <path d="M2 10V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4" />
          <path d="M2 14v4a2 2 0 0 0 2 2h7" />
          <line x1="2" y1="9" x2="22" y2="9" />
          <circle cx="17" cy="17" r="4" />
          <polyline points="17 15 17 17 18.5 17" />
        </svg>
      );
    case "calendar-check":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <path d="m9 16 2 2 4-4" />
        </svg>
      );
    case "hotel":
      return (
        <svg {...common}>
          <path d="M10 22v-6a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v6" />
          <path d="M18 2H6a2 2 0 0 0-2 2v18h16V4a2 2 0 0 0-2-2z" />
          <line x1="8" y1="6" x2="8.01" y2="6" />
          <line x1="16" y1="6" x2="16.01" y2="6" />
          <line x1="8" y1="10" x2="8.01" y2="10" />
          <line x1="16" y1="10" x2="16.01" y2="10" />
          <line x1="8" y1="14" x2="8.01" y2="14" />
          <line x1="16" y1="14" x2="16.01" y2="14" />
        </svg>
      );
    case "user-cog":
      return (
        <svg {...common}>
          <circle cx="9" cy="7" r="4" />
          <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
          <circle cx="19" cy="11" r="2" />
          <path d="M19 8v1m0 4v1m-3-3h1m4 0h1" />
        </svg>
      );
    case "credit-card":
      return (
        <svg {...common}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
          <line x1="6" y1="15" x2="10" y2="15" />
        </svg>
      );
    case "calendar-edit":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <path d="m13 14 3-3 1.5 1.5-3 3H13v-1.5z" />
        </svg>
      );
    case "calendar-clock":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <circle cx="14" cy="15" r="3.5" />
          <polyline points="14 13.5 14 15 15.5 15" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "globe":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16" y2="16" />
        </svg>
      );
    case "calendar-x":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="10" y1="14" x2="14" y2="18" />
          <line x1="14" y1="14" x2="10" y2="18" />
        </svg>
      );
    case "credit-card-x":
      return (
        <svg {...common}>
          <path d="M2 10V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4" />
          <path d="M2 14v4a2 2 0 0 0 2 2h7" />
          <line x1="2" y1="9" x2="22" y2="9" />
          <circle cx="17" cy="17" r="4" />
          <line x1="15" y1="15" x2="19" y2="19" />
          <line x1="19" y1="15" x2="15" y2="19" />
        </svg>
      );
    case "plane-landing":
      return (
        <svg {...common}>
          <path d="M2 22h20" />
          <path d="M3.77 10.77 2 9l2-4 1.1.55a2 2 0 0 1 1.1 1.45l.4 4 5.3 1.1 1.9-8.1 2.15.9-1.4 8.2 4.45 1a2 2 0 0 1 1.5 2.4 2 2 0 0 1-2.4 1.5L3.77 10.77Z" />
        </svg>
      );
    case "plane-takeoff":
      return (
        <svg {...common}>
          <path d="M2 22h20" />
          <path d="M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l3.6 1.8 5-2-3.6-7.3 2.15-.9 5.8 5.6 4.35-1.75a2 2 0 0 1 2.6 1.1 2 2 0 0 1-1.1 2.6L6.36 17.4Z" />
        </svg>
      );
    // Legacy fallback mappings
    case "dollar":
      return (
        <svg {...common}>
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      );
    case "plus-square":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      );
    case "list":
      return (
        <svg {...common}>
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3" y2="6" />
          <line x1="3" y1="12" x2="3" y2="12" />
          <line x1="3" y1="18" x2="3" y2="18" />
        </svg>
      );
    case "rotate":
      return (
        <svg {...common}>
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <polyline points="21 3 21 9 15 9" />
        </svg>
      );
    case "file":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );
    case "bars":
      return (
        <svg {...common}>
          <line x1="4" y1="19" x2="4" y2="10" />
          <line x1="12" y1="19" x2="12" y2="5" />
          <line x1="20" y1="19" x2="20" y2="14" />
        </svg>
      );
    case "user-group":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Sidebar({ active, onNavigate, isOpen = false, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isItemActive = (item) => {
    if (active) {
      return active === item.key;
    }
    if (location.pathname === item.path) {
      return true;
    }
    if (
      item.key === "add-new-reservation" &&
      (location.pathname === "/packages" ||
        location.pathname === "/add-new-reservation" ||
        location.pathname.startsWith("/package-reservation") ||
        location.pathname.startsWith("/reservation"))
    ) {
      return true;
    }
    return false;
  };

  const handleItemClick = (item) => {
    navigate(item.path);
    if (onNavigate) {
      onNavigate(item.key);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      <div
        className={`sr-sidebar-backdrop ${isOpen ? "is-visible" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sr-sidebar ${isOpen ? "is-open" : ""}`}>
        <div className="sr-sidebar-header">
          <span className="sr-sidebar-category">NAVIGATION</span>
          <button
            className="sr-sidebar-close"
            onClick={onClose}
            aria-label="Close navigation"
            type="button"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <nav className="sr-sidebar-nav">
          {NAV_ROUTES.map((item) => (
            <button
              key={item.key}
              className={`sr-sidebar-item ${isItemActive(item) ? "is-active" : ""}`}
              onClick={() => handleItemClick(item)}
              title={item.label}
              type="button"
            >
              <span className="sr-sidebar-icon-wrap">
                <Icon name={item.icon} />
              </span>
              <span className="sr-sidebar-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}

