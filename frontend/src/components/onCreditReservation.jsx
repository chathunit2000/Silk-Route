import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { getCompanyCreditStatus, formatCurrencyLKR } from "../utils/creditValidation";
import "../styles/Dashboard.css";
import "../styles/onCreditReservation.css";

export default function OnCreditReservation({ user, onLogout, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  // Fetch authorized corporate accounts and their credit details from the backend.
  useEffect(() => {
    let isMounted = true;
    async function fetchCompanies() {
      setLoading(true);
      setLoadError("");
      try {
        const apiBase = (
          process.env.REACT_APP_API_BASE || "http://localhost:4000/api"
        ).replace(/\/+$/, "");
        const response = await fetch(`${apiBase}/reservations/credit/companies`);
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error(
            `The API at ${apiBase} did not return JSON. Restart the backend server from the backend folder and try again.`
          );
        }
        const data = await response.json();
        if (!response.ok || !data.success || !Array.isArray(data.companies)) {
          throw new Error(data.error || "Unable to load corporate credit accounts.");
        }
        if (isMounted) setCompanies(data.companies);
      } catch (err) {
        console.error("Failed to load credit companies:", err);
        if (isMounted) setLoadError(err.message || "Unable to load corporate credit accounts.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchCompanies();
    return () => {
      isMounted = false;
    };
  }, [loadAttempt]);

  const handleCompanyChange = (e) => {
    const id = e.target.value;
    setSelectedCompanyId(id);
    const comp = companies.find((c) => String(c.company_id) === String(id));
    setSelectedCompany(comp || null);
  };

  const creditStatus = selectedCompany ? getCompanyCreditStatus(selectedCompany) : null;
  const isOverCreditLimit =
    creditStatus && creditStatus.currentAmount > creditStatus.creditLimit;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCompanyId || !selectedCompany) {
      alert("Please select a company to proceed.");
      return;
    }

    const status = getCompanyCreditStatus(selectedCompany);

    // If company does NOT have remaining credits OR expire date has passed:
    // Do NOT show the booking page. Show message that credit limit is reached or expired.
    if (!status.canProceed) {
      navigate("/user-expired-on-credit", {
        state: {
          company: selectedCompany,
          isExpired: status.isExpired,
          isLimitReached: status.isLimitReached,
          reason:
            status.isExpired && status.isLimitReached
              ? "both"
              : status.isExpired
              ? "expired"
              : "limit_reached",
          message: status.reason,
          expiredOn: status.expiredOn,
          creditLimit: status.creditLimit,
          currentAmount: status.currentAmount,
          remainingCredit: status.remainingCredit,
        },
      });
      return;
    }

    // If both remaining credits and expire date are valid, proceed to the booking page
    navigate("/on-credit-select-page", {
      state: {
        isCreditReservation: true,
        company: selectedCompany,
      },
    });
  };

  const displayName = user?.name || user?.username || user?.user_id || "Administrator";

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
          <div className="sr-credit-page">
            {/* Top User Greeting Strip */}
            <div className="sr-credit-user-strip">
              <span className="sr-credit-user-greeting">
                Welcome back, <span className="sr-credit-user-name">{displayName}</span>
                <span className="sr-credit-divider">•</span>
                <button
                  type="button"
                  className="sr-credit-logout-btn"
                  onClick={onLogout}
                >
                  Log out
                </button>
              </span>
            </div>

            {/* Premium Clean Card */}
            <div className="sr-credit-card">
              {/* Card Header */}
              <div className="sr-credit-header-banner">
                <div className="sr-credit-header-left">
                  <div className="sr-credit-icon-pill">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <h2>Credit Reservation</h2>
                    <p className="sr-credit-header-sub">Select an authorized corporate account to proceed with reservation</p>
                  </div>
                </div>

                <div className="sr-credit-badge">
                  <span className="sr-credit-badge-dot"></span>
                  <span>Corporate Billing</span>
                </div>
              </div>

              {/* Form Content Area */}
              <div className="sr-credit-body">
                <form onSubmit={handleSubmit} className="sr-credit-form">
                  <div className="sr-credit-field-box">
                    <label htmlFor="company-select" className="sr-credit-label">
                      Select Corporate Client / Company
                    </label>

                    <div className="sr-credit-select-wrap">
                      <select
                        id="company-select"
                        className="sr-credit-select"
                        value={selectedCompanyId}
                        onChange={handleCompanyChange}
                        disabled={loading}
                      >
                        <option value="">
                          {loading
                            ? "Loading companies..."
                            : loadError
                            ? "Company list unavailable"
                            : companies.length
                            ? "-- Choose Company --"
                            : "No credit accounts available"}
                        </option>
                        {companies.map((c) => (
                          <option key={c.company_id} value={c.company_id}>
                            {c.organisation}
                          </option>
                        ))}
                      </select>
                      <span className="sr-credit-select-arrow" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </span>
                    </div>
                    {loadError && (
                      <div role="alert" className="sr-credit-load-error">
                        <span>{loadError}</span>
                        <button
                          type="button"
                          onClick={() => setLoadAttempt((attempt) => attempt + 1)}
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Real-time Corporate Credit Overview Card */}
                  {selectedCompany && creditStatus && (
                    <div className="sr-credit-summary-card">
                      <div className="sr-credit-summary-header">
                        <div className="sr-credit-summary-title">
                          {selectedCompany.organisation}
                        </div>
                        <span
                          className={`sr-credit-summary-badge ${
                            creditStatus.canProceed
                              ? ""
                              : creditStatus.isExpired && creditStatus.isLimitReached
                              ? "status-danger"
                              : creditStatus.isExpired
                              ? "status-danger"
                              : "status-danger"
                          }`}
                        >
                          {creditStatus.canProceed
                            ? "✓ Authorized Account"
                            : creditStatus.isExpired && creditStatus.isLimitReached
                            ? isOverCreditLimit
                              ? "⚠️ Expired & Limit Exceeded"
                              : "⚠️ Expired & Limit Reached"
                            : creditStatus.isExpired
                            ? "⚠️ Bank Guarantee Expired"
                            : isOverCreditLimit
                            ? "⚠️ Credit Limit Exceeded"
                            : "⚠️ Credit Limit Reached"}
                        </span>
                      </div>

                      <div className="sr-credit-summary-grid">
                        <div className="sr-credit-stat-box">
                          <span className="stat-label">Credit Limit</span>
                          <span className="stat-value text-blue">
                            {formatCurrencyLKR(creditStatus.creditLimit)}
                          </span>
                        </div>
                        <div className="sr-credit-stat-box">
                          <span className="stat-label">Utilized Amount</span>
                          <span className="stat-value text-muted">
                            {formatCurrencyLKR(creditStatus.currentAmount)}
                          </span>
                        </div>
                        <div className="sr-credit-stat-box">
                          <span className="stat-label">Available Credit</span>
                          <span
                            className={`stat-value ${
                              creditStatus.remainingCredit > 0 ? "text-success" : "text-danger"
                            }`}
                          >
                            {formatCurrencyLKR(creditStatus.remainingCredit)}
                          </span>
                        </div>
                        <div className="sr-credit-stat-box">
                          <span className="stat-label">Guarantee Validity</span>
                          <span
                            className={`stat-value ${
                              creditStatus.isExpired ? "text-danger" : "text-muted"
                            }`}
                          >
                            {creditStatus.expiredOn
                              ? `${creditStatus.expiredOn}${creditStatus.isExpired ? " (Expired)" : ""}`
                              : "Open / No Expiry"}
                          </span>
                        </div>
                      </div>

                      {!creditStatus.canProceed && (
                        <div className="sr-credit-alert-banner" role="alert">
                          <div className="sr-credit-alert-banner-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                          </div>
                          <div className="sr-credit-alert-banner-content">
                            <strong>
                              {isOverCreditLimit
                                ? "Credit Limit Exceeded"
                                : "Credit Authorization Alert"}
                            </strong>
                            <span>
                              {isOverCreditLimit
                                ? `${selectedCompany.organisation} has used ${formatCurrencyLKR(creditStatus.currentAmount)} against a credit limit of ${formatCurrencyLKR(creditStatus.creditLimit)}. The limit has been exceeded by ${formatCurrencyLKR(creditStatus.currentAmount - creditStatus.creditLimit)}.${creditStatus.isExpired ? " The bank guarantee has also expired." : ""}`
                                : `${creditStatus.reason} Booking cannot proceed for this corporate client.`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="sr-credit-action-row">
                    <button
                      type="submit"
                      className="sr-credit-submit-btn"
                      disabled={loading || Boolean(loadError) || !selectedCompanyId}
                    >
                      <span>Submit</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                  </div>
                </form>

                {/* Bottom Bar */}
                <div className="sr-credit-bottom-bar">
                  <button
                    type="button"
                    className="sr-credit-back-btn"
                    onClick={() => navigate(-1)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                    <span>Go Back</span>
                  </button>

                  <div className="sr-credit-tech-support">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <span>Technical Support: <strong>Ext. 3663</strong></span>
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
