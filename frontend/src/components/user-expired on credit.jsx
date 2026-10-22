import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { getCompanyCreditStatus, formatCurrencyLKR } from "../utils/creditValidation";
import "../styles/Dashboard.css";
import "../styles/user-expired on credit.css";

export default function UserExpiredOnCredit({ user, onLogout, onNavigate }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Retrieve corporate company & validation information
  const company = location.state?.company || null;
  const status = getCompanyCreditStatus(company);

  const isExpired = Boolean(location.state?.isExpired ?? status.isExpired);
  const isLimitReached = Boolean(location.state?.isLimitReached ?? status.isLimitReached);
  const rawReason = location.state?.reason;
  const reason =
    rawReason ||
    (isExpired && isLimitReached ? "both" : isExpired ? "expired" : "limit_reached");

  const creditLimit = Number(location.state?.creditLimit ?? status.creditLimit);
  const currentAmount = Number(location.state?.currentAmount ?? status.currentAmount);
  const remainingCredit = Number(location.state?.remainingCredit ?? status.remainingCredit);
  const expiredDateStr = location.state?.expiredOn || status.expiredOn;
  const displayDate = expiredDateStr ? String(expiredDateStr).split("T")[0] : null;

  // Determine dynamic titles and messaging
  let headingTitle = "BANK GUARANTEE HAS BEEN EXPIRED..!!";
  let mainMessage = "I'm sorry, Given credit period exceeded.";
  let badgeSubtitle = "Bank Guarantee Expired";

  if (reason === "both" || (isExpired && isLimitReached)) {
    headingTitle = "CREDIT LIMIT REACHED & GUARANTEE EXPIRED..!!";
    mainMessage = "I'm sorry, Corporate credit limit has been reached and bank guarantee period has expired.";
    badgeSubtitle = "Expired & Credit Limit Reached";
  } else if (reason === "limit_reached" || isLimitReached) {
    headingTitle = "CREDIT LIMIT HAS BEEN REACHED..!!";
    mainMessage = "I'm sorry, Corporate credit limit has been reached. No remaining credits are available for this booking.";
    badgeSubtitle = "Credit Limit Reached";
  } else {
    headingTitle = "BANK GUARANTEE HAS BEEN EXPIRED..!!";
    mainMessage = "I'm sorry, Given credit period exceeded.";
    badgeSubtitle = "Bank Guarantee Expired";
  }

  return (
    <div className="sr-app">
      <Sidebar
        active="on-credit-reservation"
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
          <div className="uec-page-container">
            {/* Top Navigation Bar with Back & Breadcrumb / Status */}
            <div className="uec-nav-bar">
              <button
                type="button"
                className="uec-back-btn"
                onClick={() => navigate("/on-credit-reservations")}
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
                <span>&lt; Back to Corporate Accounts</span>
              </button>

              <div className="uec-status-pill">
                <span className="uec-status-dot"></span>
                <span>{badgeSubtitle}</span>
              </div>
            </div>

            {/* Modern VIP Error Card */}
            <div className="uec-card">
              {/* Card Header Banner */}
              <div className="uec-card-header">
                <div className="uec-card-header-left">
                  <div className="uec-alert-icon-wrap">
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <div className="uec-card-header-titles">
                    <span className="uec-badge-pill">CORPORATE CREDIT NOTICE</span>
                    <h2 className="uec-heading">{headingTitle}</h2>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="uec-card-body">
                {/* Alert Summary Box */}
                <div className="uec-alert-summary">
                  <div className="uec-alert-summary-icon">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div className="uec-alert-summary-content">
                    <p className="uec-text-msg">{mainMessage}</p>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "4px" }}>
                      {displayDate && (
                        <div className="uec-expired-date-badge">
                          <span>Bank Guarantee Validity:</span>
                          <span className="uec-date-tag">Expired On {displayDate}</span>
                        </div>
                      )}
                      {(isLimitReached || reason === "limit_reached" || reason === "both") && (
                        <div className="uec-expired-date-badge">
                          <span>Available Credit:</span>
                          <span className="uec-date-tag" style={{ color: "#dc2626" }}>
                            {formatCurrencyLKR(remainingCredit)} (Exhausted)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account Details Strip */}
                {company && (
                  <div className="uec-account-strip">
                    <div className="uec-account-strip-left">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0C457A"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                      <div>
                        <div className="uec-account-label">Client Account</div>
                        <div className="uec-account-name">
                          {company.organisation || "Selected Corporate Client"}
                        </div>
                      </div>
                    </div>

                    <div className="uec-account-strip-stats">
                      <div className="uec-account-stat-item">
                        <div className="uec-account-label">Credit Limit</div>
                        <div className="uec-account-stat-val">
                          {formatCurrencyLKR(creditLimit)}
                        </div>
                      </div>

                      <div className="uec-account-stat-item">
                        <div className="uec-account-label">Utilized Amount</div>
                        <div className="uec-account-stat-val">
                          {formatCurrencyLKR(currentAmount)}
                        </div>
                      </div>

                      <div className="uec-account-stat-item">
                        <div className="uec-account-label">Available Credit</div>
                        <div
                          className={`uec-account-stat-val ${
                            remainingCredit > 0 ? "text-success" : "text-danger"
                          }`}
                        >
                          {formatCurrencyLKR(remainingCredit)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="uec-actions-row">
                  <button
                    type="button"
                    className="uec-home-btn"
                    onClick={() => navigate("/dashboard")}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    <span>Go to the Home page</span>
                  </button>

                  <button
                    type="button"
                    className="uec-secondary-btn"
                    onClick={() => navigate("/on-credit-reservations")}
                  >
                    <span>Select Another Company</span>
                  </button>
                </div>

                {/* Help & Support Ribbon Section */}
                <div className="uec-help-card">
                  <div className="uec-help-bar">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span>Help &amp; Inquiries</span>
                  </div>
                  <div className="uec-help-content">
                    <div className="uec-help-text-wrap">
                      <p className="uec-help-text">
                        Please contact finance division for more details
                      </p>
                      <p className="uec-help-subtext">
                        Finance &amp; Accounts Division &bull; Bandaranaike International Airport
                      </p>
                    </div>

                    <div className="uec-phone-badges">
                      <a href="tel:+9411223221" className="uec-phone-pill">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        <span>+94-11-223221</span>
                      </a>
                      <a href="tel:+9411223246" className="uec-phone-pill">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        <span>+94-11-223246</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
