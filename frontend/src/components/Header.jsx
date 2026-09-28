import React from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles/Dashboard.css";

export default function Header({ onToggleSidebar, onLogout, user }) {
  const navigate = useNavigate();

  return (
    <header className="sr-header">
      <div className="sr-header-left">
        <button
          className="sr-menu-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Browser Backward & Forward Navigation Buttons */}
        <div className="sr-history-nav" aria-label="Page navigation controls">
          <button
            className="sr-nav-history-btn"
            onClick={() => navigate(-1)}
            title="Go back (Previous page)"
            aria-label="Go back"
            type="button"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            className="sr-nav-history-btn"
            onClick={() => navigate(1)}
            title="Go forward (Next page)"
            aria-label="Go forward"
            type="button"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <Link to="/dashboard" className="sr-header-brand" title="Return to Dashboard">
          <span className="sr-header-plane" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.8 19.2 16 11l3.5-3.5a1.5 1.5 0 0 0-2.1-2.1L14 9 5.8 7.2 4 9l6 3-3 3H4l-1 2 5 1.5L9.5 23l2-1-1.8-8.2 3-3 3 6z" />
            </svg>
          </span>
          <div className="sr-brand-info">
            <h1>Silk Route Manual Booking</h1>
          </div>
        </Link>
      </div>

      <div className="sr-header-meta">
        <span className="sr-header-org">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.8 19.2 16 11l3.5-3.5a1.5 1.5 0 0 0-2.1-2.1L14 9 5.8 7.2 4 9l6 3-3 3H4l-1 2 5 1.5L9.5 23l2-1-1.8-8.2 3-3 3 6z" />
          </svg>
          <span>Airport and Aviation Services<br />(Sri Lanka) Private Limited</span>
        </span>
        <div className="sr-header-avatar-wrap">
          <button
            className="sr-header-avatar"
            aria-label="Account"
            title={user ? `Signed in as ${user.username || "Admin"}` : "Account"}
            type="button"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
            </svg>
          </button>
          <span className="sr-status-dot" title="Active"></span>
        </div>
        {onLogout && (
          <button
            className="sr-header-signout"
            onClick={onLogout}
            title="Sign out of Silk Route"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </header>
  );
}
