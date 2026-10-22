import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import "../styles/Dashboard.css";
import "../styles/CreateCreditCompany.css";

const TITLE_OPTIONS = ["Mr", "Mrs", "Ms", "Dr", "Rev", "Prof"];

export default function CreateCreditCompany({ user, onLogout, onNavigate }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Form states matching screenshot
  const [title, setTitle] = useState("Mr");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [address, setAddress] = useState("");
  const [contactNo, setContactNo] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // Form validations for all mandatory fields marked with *
    if (!fullName.trim()) {
      setErrorMsg("Full Name is mandatory.");
      return;
    }
    if (!email.trim()) {
      setErrorMsg("Email address is mandatory.");
      return;
    }
    if (!organisation.trim()) {
      setErrorMsg("Organisation is mandatory.");
      return;
    }
    if (!address.trim()) {
      setErrorMsg("Address is mandatory.");
      return;
    }
    if (!contactNo.trim()) {
      setErrorMsg("Contact No. is mandatory.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("http://localhost:4000/api/reservations/credit/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisation: organisation.trim(),
          id_name: `${title} ${fullName.trim()}`.trim(),
          address: address.trim(),
          email: email.trim(),
          tele: contactNo.trim(),
          creditLimit: 500000,
          expiredOn: "1899-11-29",
          createdBy: user?.username || user?.id_name || "Finance User",
        }),
      });

      const resJson = await response.json();
      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || "Failed to create corporate credit account.");
      }

      setSuccessMsg(`Corporate credit company "${organisation.trim()}" created successfully!`);

      // After brief delay, navigate back to Add Payment / Credit Reservation page with new company selected
      setTimeout(() => {
        navigate("/pending-payments", {
          state: {
            newCompanyId: resJson.company?.company_id,
            newCompanyName: organisation.trim(),
          },
        });
      }, 1200);
    } catch (err) {
      console.error("Create credit reservation/company failed:", err);
      setErrorMsg(err.message || "Failed to create credit reservation/company.");
    } finally {
      setSubmitting(false);
    }
  };

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

        <main className="sr-create-comp-page-wrap">
          {/* Top navigation back button */}
          <div className="sr-create-comp-top-bar">
            <button
              type="button"
              className="sr-create-comp-back-btn"
              onClick={() => navigate(-1)}
            >
              &lt; BACK
            </button>
          </div>

          <div className="sr-create-comp-container">
            {/* Red mandatory notice matching screenshot */}
            <div className="sr-create-comp-mandatory-note">
              All fields marked as * are mandatory
            </div>

            {/* Form matching screenshot layout exactly */}
            <form onSubmit={handleSubmit} className="sr-create-comp-form">
              {/* Row 1: Title */}
              <div className="sr-create-comp-row">
                <span className="sr-create-comp-label">Title</span>
                <div>
                  <select
                    className="sr-create-comp-select"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  >
                    {TITLE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Full Name * */}
              <div className="sr-create-comp-row">
                <span className="sr-create-comp-label">
                  Full Name <span className="star">*</span>
                </span>
                <div>
                  <input
                    type="text"
                    className="sr-create-comp-input"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setErrorMsg("");
                    }}
                    required
                  />
                </div>
              </div>

              {/* Row 3: Email address * */}
              <div className="sr-create-comp-row">
                <span className="sr-create-comp-label">
                  Email address <span className="star">*</span>
                </span>
                <div>
                  <input
                    type="email"
                    className="sr-create-comp-input"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrorMsg("");
                    }}
                    required
                  />
                </div>
              </div>

              {/* Row 4: Organisation * */}
              <div className="sr-create-comp-row">
                <span className="sr-create-comp-label">
                  Organisation <span className="star">*</span>
                </span>
                <div>
                  <input
                    type="text"
                    className="sr-create-comp-input"
                    value={organisation}
                    onChange={(e) => {
                      setOrganisation(e.target.value);
                      setErrorMsg("");
                    }}
                    required
                  />
                </div>
              </div>

              {/* Row 5: Address * */}
              <div className="sr-create-comp-row">
                <span className="sr-create-comp-label">
                  Address <span className="star">*</span>
                </span>
                <div>
                  <input
                    type="text"
                    className="sr-create-comp-input"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setErrorMsg("");
                    }}
                    required
                  />
                </div>
              </div>

              {/* Row 6: Contact No. * (noticeably shorter width) */}
              <div className="sr-create-comp-row">
                <span className="sr-create-comp-label">
                  Contact No. <span className="star">*</span>
                </span>
                <div>
                  <input
                    type="text"
                    className="sr-create-comp-input short-input"
                    value={contactNo}
                    onChange={(e) => {
                      setContactNo(e.target.value);
                      setErrorMsg("");
                    }}
                    required
                  />
                </div>
              </div>

              {/* Row 7: Submit button aligned directly under Contact No. */}
              <div className="sr-create-comp-action-row">
                <div></div>
                <div>
                  <button
                    type="submit"
                    className="sr-create-comp-submit-btn"
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </div>
            </form>

            {/* Error & Success Messages */}
            {errorMsg && (
              <div className="sr-create-comp-notice error">{errorMsg}</div>
            )}
            {successMsg && (
              <div className="sr-create-comp-notice success">{successMsg}</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
