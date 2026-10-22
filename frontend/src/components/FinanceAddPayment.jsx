import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { formatCurrencyLKR } from "../utils/creditValidation";
import "../styles/Dashboard.css";
import "../styles/FinanceAddPayment.css";

function isExpiryWarning(expiryDate) {
  if (!expiryDate) return false;
  const expiry = new Date(`${expiryDate}T00:00:00`);
  if (Number.isNaN(expiry.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const twoMonthsFromToday = new Date(today);
  twoMonthsFromToday.setDate(1);
  twoMonthsFromToday.setMonth(twoMonthsFromToday.getMonth() + 2);

  return expiry < today || expiry <= twoMonthsFromToday;
}

export default function FinanceAddPayment({ user, onLogout, onNavigate }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Detailed view state for when Submit is clicked with a selected company
  const [companyDetails, setCompanyDetails] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [updatingExpiry, setUpdatingExpiry] = useState(false);

  // Add payment form state
  const [payAmount, setPayAmount] = useState("");
  const [payRemarks, setPayRemarks] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Fetch list of credit companies
  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch("http://localhost:4000/api/reservations/credit/companies");
      const data = await response.json();
      if (response.ok && data.success && Array.isArray(data.companies)) {
        setCompanies(data.companies);
      } else {
        setErrorMessage(data.error || "Failed to load corporate accounts.");
      }
    } catch (err) {
      console.error("Fetch companies failed:", err);
      setErrorMessage("Could not connect to backend server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Load selected company details and payment history
  const loadCompanyDetails = async (compId) => {
    setLoadingDetails(true);
    setErrorMessage("");
    try {
      const response = await fetch(`http://localhost:4000/api/reservations/credit/company/${compId}`);
      const data = await response.json();
      if (response.ok && data.success && data.company) {
        setCompanyDetails(data.company);
        setPaymentHistory(Array.isArray(data.payments) ? data.payments : []);
        setExpiryDate(data.company.expired_on || "");
      } else {
        setErrorMessage(data.error || "Could not retrieve company profile.");
      }
    } catch (err) {
      console.error("Fetch company details failed:", err);
      setErrorMessage("Error retrieving company details from database.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleUpdateExpiry = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    if (!expiryDate) {
      setErrorMessage("Select an expiry date before updating.");
      return;
    }

    setUpdatingExpiry(true);
    try {
      const response = await fetch(
        `http://localhost:4000/api/reservations/credit/company/${selectedCompanyId}/expiry`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expiryDate }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update credit expiry date.");
      }

      setSuccessMessage("Credit facility expiry date updated successfully.");
      await loadCompanyDetails(selectedCompanyId);
      await fetchCompanies();
    } catch (err) {
      console.error("Updating credit expiry failed:", err);
      setErrorMessage(err.message || "Failed to update credit expiry date.");
    } finally {
      setUpdatingExpiry(false);
    }
  };

  // Submit button clicked on the main selection form
  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!selectedCompanyId) {
      setErrorMessage("Please select a company to proceed.");
      return;
    }

    loadCompanyDetails(selectedCompanyId);
  };

  // Handle Recording a New Corporate Credit Payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const amt = parseFloat(payAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setErrorMessage("Please enter a valid positive payment amount.");
      return;
    }

    setSubmittingPayment(true);
    try {
      const response = await fetch("http://localhost:4000/api/reservations/credit/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          amount: amt,
          remarks: payRemarks,
          updatedBy: user?.username || user?.id_name || "Finance User",
        }),
      });

      const resJson = await response.json();
      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || "Failed to record payment.");
      }

      setSuccessMessage(`Payment of ${formatCurrencyLKR(amt)} recorded successfully!`);
      setPayAmount("");
      setPayRemarks("");

      // Refresh company profile and list
      await loadCompanyDetails(selectedCompanyId);
      await fetchCompanies();
    } catch (err) {
      console.error("Recording payment failed:", err);
      setErrorMessage(err.message || "Failed to record payment.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // If redirected back from creating a new company, select it automatically
  useEffect(() => {
    if (location.state?.newCompanyId) {
      setSelectedCompanyId(String(location.state.newCompanyId));
      loadCompanyDetails(location.state.newCompanyId);
      if (location.state?.newCompanyName) {
        setSuccessMessage(`Company "${location.state.newCompanyName}" created successfully!`);
      }
    }
  }, [location.state]);

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

        <main className="sr-finance-page-wrap">
          {/* Detailed view when a company is active */}
          {companyDetails ? (
            <div className="sr-fin-details-view">
              <div className="sr-fin-top-bar">
                <button
                  type="button"
                  className="sr-fin-back-btn"
                  onClick={() => {
                    setCompanyDetails(null);
                    setExpiryDate("");
                    setSuccessMessage("");
                    setErrorMessage("");
                  }}
                >
                  &larr; Back to Company Selection
                </button>
              </div>

              {/* Status alerts */}
              {errorMessage && (
                <div className="sr-fin-notice-box error">{errorMessage}</div>
              )}
              {successMessage && (
                <div className="sr-fin-notice-box success">{successMessage}</div>
              )}

              <section className="sr-fin-facility-heading" aria-label="Credit facility">
                <div>
                  <span className="sr-fin-section-eyebrow">CREDIT ACCOUNT</span>
                  <h1>{companyDetails.organisation}</h1>
                  <p>
                    {companyDetails.expired_on
                      ? `Credit facility expires on ${companyDetails.expired_on}`
                      : "Credit facility has no expiry date"}
                  </p>
                </div>
                <span className="sr-fin-account-mark" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 10h18M7 15h3" />
                  </svg>
                </span>
              </section>

              {isExpiryWarning(companyDetails.expired_on) && (
                <div className="sr-fin-expiry-warning" role="alert">
                  <span>
                    {companyDetails.is_expired
                      ? "Note: Credit period has expired."
                      : "Note: Credit period is less than 2 months."}
                  </span>
                </div>
              )}

              <form className="sr-fin-expiry-form" onSubmit={handleUpdateExpiry}>
                <label htmlFor="credit-expiry-date">Expiry Date:</label>
                <input
                  id="credit-expiry-date"
                  type="date"
                  value={expiryDate}
                  onChange={(event) => setExpiryDate(event.target.value)}
                  required
                />
                <button type="submit" disabled={updatingExpiry}>
                  {updatingExpiry ? "Updating..." : "Update"}
                </button>
              </form>

              <div className="sr-fin-balance-summary">
                <div>
                  <span>Current Outstanding Amount (Rs.)</span>
                  <strong>{formatCurrencyLKR(companyDetails.current_amount)}</strong>
                </div>
                <div>
                  <span>Credit Limit (Rs.)</span>
                  <strong>{formatCurrencyLKR(companyDetails.credit_limit)}</strong>
                </div>
              </div>

              {/* Add Payment Form */}
              <div className="sr-fin-payment-card sr-fin-payment-card-legacy">
                <div className="sr-fin-payment-heading">
                  <div>
                    <span className="sr-fin-section-eyebrow">PAYMENT ENTRY</span>
                    <h2>Record a payment</h2>
                    <p>Enter the amount received and add a note for your records.</p>
                  </div>
                  <span className="sr-fin-payment-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </span>
                </div>
                <form className="sr-fin-record-form" onSubmit={handleRecordPayment}>
                  <div className="sr-fin-legacy-payment-fields">
                    <div className="sr-fin-legacy-field">
                      <label htmlFor="pay-amt">Received amount <span>*</span></label>
                      <input
                        id="pay-amt"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="Enter received amount"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        required
                      />
                    </div>

                    <div className="sr-fin-legacy-field">
                      <label htmlFor="pay-ref">Remarks <span className="sr-fin-optional-label">Optional</span></label>
                      <textarea
                        id="pay-ref"
                        rows="2"
                        maxLength="250"
                        placeholder="Add a payment reference or note"
                        value={payRemarks}
                        onChange={(e) => setPayRemarks(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="sr-fin-pay-submit-btn"
                    disabled={submittingPayment}
                  >
                    {submittingPayment ? "Recording payment..." : "Record payment"}
                  </button>
                </form>
              </div>

              {/* Payment History List */}
              <div className="sr-fin-history-card sr-fin-history-card-legacy">
                <h4>Payment History - {companyDetails.organisation}</h4>
                <div className="sr-fin-table-wrap">
                  <table className="sr-fin-history-table">
                    <thead>
                      <tr>
                        <th>No.</th>
                        <th>Received Amount</th>
                        <th>Updated by</th>
                        <th>Updated time</th>
                        <th>Remarks</th>
                        <th>Outstanding Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: "center", color: "#64748b", padding: "18px" }}>
                            No previous payment records found for this company.
                          </td>
                        </tr>
                      ) : (
                        paymentHistory.map((ph, idx) => (
                          <tr key={ph.payment_id || idx}>
                            <td>{idx + 1}</td>
                            <td style={{ fontWeight: "700", color: "#16a34a" }}>
                              {formatCurrencyLKR(ph.amount)}
                            </td>
                            <td>{ph.updated_by}</td>
                            <td>{ph.updated_time}</td>
                            <td>{ph.remarks || "-"}</td>
                            <td style={{ fontWeight: "600", color: "#0f172a" }}>
                              {formatCurrencyLKR(ph.outstanding_amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="sr-fin-selection-view">
              <header className="sr-fin-selection-intro">
                <span className="sr-fin-section-eyebrow">FINANCE WORKSPACE</span>
                <h1>Add a payment</h1>
                <p>Select a corporate account to review its credit balance and record a payment.</p>
              </header>
              <section className="sr-fin-select-card">
                <div className="sr-fin-select-card-heading">
                  <span className="sr-fin-select-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="M3 10h18M7 15h3" />
                    </svg>
                  </span>
                  <div>
                    <h2>Choose a company</h2>
                    <p>Start by selecting the account you want to update.</p>
                  </div>
                </div>
                <form className="sr-fin-select-form" onSubmit={handleSubmit}>
                  <div className="sr-fin-select-row">
                    <label className="sr-fin-select-label" htmlFor="sr-fin-company">Company</label>
                    <select
                      id="sr-fin-company"
                      className="sr-fin-company-select"
                      value={selectedCompanyId}
                      onChange={(e) => {
                        setSelectedCompanyId(e.target.value);
                        setErrorMessage("");
                      }}
                      disabled={loading}
                    >
                      <option value="">-- Select Company --</option>
                      {companies.map((c) => (
                        <option key={c.company_id} value={c.company_id}>
                          {c.organisation}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="sr-fin-submit-btn"
                    disabled={loading || loadingDetails}
                  >
                    {loadingDetails ? "Loading..." : "Submit"}
                  </button>

                  <button
                    type="button"
                    className="sr-fin-create-btn"
                    onClick={() => navigate("/create-credit-company")}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Create New Credit Reservation</span>
                  </button>
                </form>

                {errorMessage && (
                  <div className="sr-fin-notice-box error" role="alert">{errorMessage}</div>
                )}
                {successMessage && (
                  <div className="sr-fin-notice-box success" role="status">{successMessage}</div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
