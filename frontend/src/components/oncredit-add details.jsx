import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { getCompanyCreditStatus } from "../utils/creditValidation";
import "../styles/Dashboard.css";
import "../styles/oncredit-add details.css";
import {
  PACKAGES_DATA,
  isArrivalPackage,
  isDeparturePackage,
  getTodayDateTimeString,
  calculatePackagePricing,
} from "../data/packagesData";

export default function OnCreditAddDetails({ user, onLogout, onNavigate }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Retrieve corporate company passed from on-credit select page
  const creditCompany = location.state?.company;

  useEffect(() => {
    if (!creditCompany?.company_id) {
      navigate("/on-credit-reservations", { replace: true });
      return;
    }
    const status = getCompanyCreditStatus(creditCompany);
    if (!status.canProceed) {
      navigate("/user-expired-on-credit", {
        replace: true,
        state: {
          company: creditCompany,
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
    }
  }, [creditCompany, navigate]);

  // Retrieve initially selected package
  const [selectedPkg, setSelectedPkg] = useState(() => {
    return (
      location.state?.packageData ||
      PACKAGES_DATA.find((p) => p.id === "ruby") ||
      PACKAGES_DATA[0]
    );
  });

  const hasArrival = isArrivalPackage(selectedPkg);
  const hasDeparture = isDeparturePackage(selectedPkg);

  // Form State - start empty to validate required fields
  const [paxCount, setPaxCount] = useState(1);
  const [arrivalDate, setArrivalDate] = useState("");
  const [arrivalFlightNumber, setArrivalFlightNumber] = useState("");

  const [departureDate, setDepartureDate] = useState("");
  const [departureFlightNumber, setDepartureFlightNumber] = useState("");
  const [validationError, setValidationError] = useState("");

  const arrivalDateRef = useRef(null);
  const departureDateRef = useRef(null);

  // Dynamic pricing with passenger discount tiers
  const pricing = calculatePackagePricing(selectedPkg?.price || 0, paxCount);

  // Handle switching packages from right sidebar dropdown
  const handlePackageChange = (e) => {
    const found = PACKAGES_DATA.find((p) => p.id === e.target.value);
    if (found) {
      setSelectedPkg(found);
      setValidationError("");
    }
  };

  // Form Submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError("");

    if (!creditCompany?.company_id) {
      navigate("/on-credit-reservations", { replace: true });
      return;
    }

    // Required Arrival Date check with browser dialog alert
    if (hasArrival && !arrivalDate) {
      alert("Arrival Date Required");
      setValidationError("Arrival Date Required");
      arrivalDateRef.current?.focus();
      return;
    }

    if (hasArrival && !arrivalFlightNumber.trim()) {
      alert("Arrival Flight Number Required");
      setValidationError("Arrival flight number is mandatory.");
      return;
    }

    if (hasDeparture && !departureDate) {
      alert("Departure Date Required");
      setValidationError("Departure Date Required");
      departureDateRef.current?.focus();
      return;
    }

    if (hasDeparture && !departureFlightNumber.trim()) {
      alert("Departure Flight Number Required");
      setValidationError("Departure flight number is mandatory.");
      return;
    }

    if (hasArrival && hasDeparture) {
      if (arrivalDate && departureDate && departureDate < arrivalDate) {
        alert("Departure Date and Time cannot be earlier than Arrival Date and Time.");
        setValidationError(
          "Departure Date and Time cannot be earlier than Arrival Date and Time."
        );
        return;
      }
    }

    // Check if corporate credit account is valid (not expired AND has remaining credit)
    const status = getCompanyCreditStatus(creditCompany);
    if (!status.canProceed) {
      navigate("/user-expired-on-credit", {
        state: {
          company: creditCompany,
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
          packageData: selectedPkg,
        },
      });
      return;
    }

    // Otherwise proceed to Step 2: Passenger Details
    navigate(`/package-reservation/${selectedPkg.id}?step=2`, {
      state: {
        packageData: selectedPkg,
        isCreditReservation: true,
        company: creditCompany,
        initialPaxCount: paxCount,
        initialArrivalDate: arrivalDate,
        initialArrivalFlight: arrivalFlightNumber,
        initialDepartureDate: departureDate,
        initialDepartureFlight: departureFlightNumber,
        bookingPricing: pricing,
        totalAmount: pricing.finalTotal,
      },
    });
  };

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
          <div className="sr-res-page">
            {/* 1. Header & Navigation (ඉහළ කොටස) */}
            <div className="sr-res-header-bar">
              <div className="sr-res-header-left">
                <button
                  className="sr-res-back-btn"
                  onClick={() =>
                    navigate("/on-credit-select-page", {
                      state: { company: creditCompany },
                    })
                  }
                  type="button"
                  title="Return to Packages Listing"
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
                  <span>&lt; BACK TO PACKAGES</span>
                </button>
                <div className="sr-res-title-wrap">
                  <h2>Silk Route Package Reservation</h2>
                  <span className="sr-res-subtitle">
                    Step 1: Flight Schedule &bull; {selectedPkg.name}
                  </span>
                </div>
              </div>

              {/* Breadcrumb Navigation */}
              <div className="sr-res-breadcrumbs">
                <Link to="/dashboard">Dashboard</Link>
                <span className="separator">/</span>
                <Link
                  to="/on-credit-select-page"
                  state={{ company: creditCompany }}
                >
                  Packages
                </Link>
                <span className="separator">/</span>
                <span>Flight Details</span>
              </div>
            </div>

            {/* Two-Column Reservation Page Layout */}
            <div className="sr-res-grid">
              {/* =========================================================
                  2. Form Section - Left Column (පෝරම කොටස)
                  ========================================================= */}
              <div className="sr-res-form-card">
                {/* Distinctive Silk Route Dual-Tone Header Banner */}
                <div className="sr-ruby-banner">
                  <div className="sr-ruby-banner-left">
                    <span
                      className="sr-ruby-banner-plane"
                      aria-hidden="true"
                    >
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                      </svg>
                    </span>
                    <h2 className="sr-ruby-banner-title">
                      Silk Route {selectedPkg.name} Reservation
                    </h2>
                  </div>
                  <div className="sr-ruby-banner-right">
                    <div
                      className="sr-ruby-silk-emblem"
                      title="Silk Route VIP"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                      >
                        <circle cx="12" cy="10" r="8" />
                        <path d="m10 8 4 4-4 4" />
                      </svg>
                      <span>SILK</span>
                    </div>
                  </div>
                </div>

                {/* Sub-Bar: Welcome Greeting & Corporate Badge */}
                <div className="sr-res-subbar">
                  <span className="sr-res-user-greeting">
                    Welcome {user?.username || "Administrator"} |{" "}
                    <button
                      type="button"
                      className="sr-ruby-logout-btn"
                      onClick={onLogout}
                    >
                      Log out
                    </button>
                  </span>
                  <div className="sr-res-badge-tag">
                    <span>Account: {creditCompany?.organisation || "Corporate account"}</span>
                    {pricing.discountPercent > 0 && (
                      <span style={{ marginLeft: "8px", color: "#16a34a", fontWeight: "700" }}>
                        • {pricing.discountPercent}% Discount ({paxCount} PAX)
                      </span>
                    )}
                  </div>
                </div>

                {/* Validation Error Message */}
                {validationError && (
                  <div className="sr-ruby-error-banner" style={{ margin: "14px 28px 0" }}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{validationError}</span>
                  </div>
                )}

                {/* Flight Schedule Form */}
                <form onSubmit={handleSubmit} className="sr-res-form" noValidate>
                  <div
                    className={`sr-res-columns ${!hasArrival || !hasDeparture ? "is-single-col" : ""
                      }`}
                  >
                    {/* Arrival Details Column */}
                    {hasArrival && (
                      <div className="sr-res-col">
                        <h3 className="sr-res-col-title">
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M17.8 19.2 16 11l3.5-3.5a1.5 1.5 0 0 0-2.1-2.1L14 9 5.8 7.2 4 9l6 3-3 3H4l-1 2 5 1.5L9.5 23l2-1-1.8-8.2 3-3 3 6z" />
                          </svg>
                          <span>Arrival Details</span>
                        </h3>

                        <div className="sr-ruby-group">
                          <label
                            className="sr-ruby-label"
                            htmlFor="sr-arrival-date"
                          >
                            Arrival Date*
                          </label>
                          <div className="sr-ruby-input-box">
                            <input
                              id="sr-arrival-date"
                              ref={arrivalDateRef}
                              type="datetime-local"
                              required
                              min={getTodayDateTimeString()}
                              className="sr-ruby-input"
                              value={arrivalDate}
                              onChange={(e) => {
                                setValidationError("");
                                const newArrival = e.target.value;
                                setArrivalDate(newArrival);
                                if (departureDate && departureDate < newArrival) {
                                  setDepartureDate(newArrival);
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="sr-ruby-picker-btn"
                              onClick={() =>
                                arrivalDateRef.current?.showPicker
                                  ? arrivalDateRef.current.showPicker()
                                  : arrivalDateRef.current?.focus()
                              }
                              title="Choose Arrival Date and Time"
                              tabIndex={-1}
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM7 11h5v5H7z" />
                              </svg>
                            </button>
                          </div>
                          <div className="sr-ruby-hint">
                            SELECT THE ARRIVAL DATE AND THE TIME OF YOUR FLIGHT
                          </div>
                        </div>

                        <div className="sr-ruby-group">
                          <label
                            className="sr-ruby-label"
                            htmlFor="sr-arrival-flight"
                          >
                            Flight No *
                          </label>
                          <input
                            id="sr-arrival-flight"
                            type="text"
                            required
                            className="sr-ruby-input sr-ruby-input-flat"
                            placeholder="e.g. UL-504"
                            value={arrivalFlightNumber}
                            onChange={(e) => {
                              setValidationError("");
                              setArrivalFlightNumber(e.target.value);
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Departure Details Column */}
                    {hasDeparture && (
                      <div className="sr-res-col">
                        <h3 className="sr-res-col-title">
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            style={{ transform: "rotate(-45deg)" }}
                          >
                            <path d="M17.8 19.2 16 11l3.5-3.5a1.5 1.5 0 0 0-2.1-2.1L14 9 5.8 7.2 4 9l6 3-3 3H4l-1 2 5 1.5L9.5 23l2-1-1.8-8.2 3-3 3 6z" />
                          </svg>
                          <span>Departure Details</span>
                        </h3>

                        <div className="sr-ruby-group">
                          <label
                            className="sr-ruby-label"
                            htmlFor="sr-departure-date"
                          >
                            Departure Date*
                          </label>
                          <div className="sr-ruby-input-box">
                            <input
                              id="sr-departure-date"
                              ref={departureDateRef}
                              type="datetime-local"
                              required
                              min={
                                hasArrival
                                  ? arrivalDate || getTodayDateTimeString()
                                  : getTodayDateTimeString()
                              }
                              className="sr-ruby-input"
                              value={departureDate}
                              onChange={(e) => {
                                setValidationError("");
                                setDepartureDate(e.target.value);
                              }}
                            />
                            <button
                              type="button"
                              className="sr-ruby-picker-btn"
                              onClick={() =>
                                departureDateRef.current?.showPicker
                                  ? departureDateRef.current.showPicker()
                                  : departureDateRef.current?.focus()
                              }
                              title="Choose Departure Date and Time"
                              tabIndex={-1}
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM7 11h5v5H7z" />
                              </svg>
                            </button>
                          </div>
                          <div className="sr-ruby-hint">
                            SELECT THE DEPARTURE DATE AND THE TIME OF YOUR FLIGHT
                          </div>
                        </div>

                        <div className="sr-ruby-group">
                          <label
                            className="sr-ruby-label"
                            htmlFor="sr-departure-flight"
                          >
                            Flight No *
                          </label>
                          <input
                            id="sr-departure-flight"
                            type="text"
                            required
                            className="sr-ruby-input sr-ruby-input-flat"
                            placeholder="e.g. EK-651"
                            value={departureFlightNumber}
                            onChange={(e) => {
                              setValidationError("");
                              setDepartureFlightNumber(e.target.value);
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Passenger Selection */}
                  <div className="sr-ruby-pax-section">
                    <label className="sr-ruby-label" htmlFor="sr-ruby-pax">
                      Number of passengers*
                    </label>
                    <div className="sr-ruby-select-wrap">
                      <select
                        id="sr-ruby-pax"
                        className="sr-ruby-select"
                        value={paxCount}
                        onChange={(e) => setPaxCount(Number(e.target.value))}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30].map((num) => (
                          <option key={num} value={num}>
                            {num} {num === 1 ? "" : ""}
                          </option>
                        ))}
                      </select>
                      <div className="sr-ruby-select-icon">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M7 10l5 5 5-5z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="sr-res-actions-row">
                    <button type="submit" className="sr-res-submit-btn">
                      <span>SUBMIT</span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="sr-res-cancel-btn"
                      onClick={() =>
                        navigate("/on-credit-select-page", {
                          state: { company: creditCompany },
                        })
                      }
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Disclaimers & Red Stay Note */}
                  <div className="sr-ruby-footer-notes">
                    <div className="sr-ruby-mandatory-note">
                      All fields marked as * are mandatory
                    </div>
                    <div className="sr-ruby-disclaimer-note">
                      <strong>Note:</strong> Guests are allowed to stay in the
                      Silk Route Lounges only until formalities are completed.
                    </div>
                  </div>
                </form>
              </div>

              {/* =========================================================
                  3. Summary Sidebar - Right Column (දකුණු පස සාරාංශය)
                  ========================================================= */}
              <div className="sr-res-sidebar-card">
                {/* Package Preview Image & Overlay Badge */}
                <div className="sr-res-pkg-thumb-wrap">
                  <img
                    src={selectedPkg.image}
                    alt={selectedPkg.name}
                    className="sr-res-pkg-thumb"
                  />
                  <div className="sr-res-pkg-badge-overlay">
                    {selectedPkg.badge || "ALL-INCLUSIVE"}
                    {pricing.discountPercent > 0 && ` • ${pricing.discountPercent}% OFF`}
                  </div>
                </div>

                <div className="sr-res-sidebar-body">
                  {/* Package Title & Subtitle */}
                  <div className="sr-res-pkg-title-area">
                    <h3>{selectedPkg.name}</h3>
                    <p>{selectedPkg.subtitle || "Complete VIP airport experience"}</p>
                  </div>

                  {/* Selected Package Dropdown Switcher */}
                  <div className="sr-res-pkg-switcher">
                    <label htmlFor="package-select">SELECTED PACKAGE</label>
                    <select
                      id="package-select"
                      className="sr-res-pkg-select"
                      value={selectedPkg.id}
                      onChange={handlePackageChange}
                    >
                      {PACKAGES_DATA.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} (${pkg.price} USD)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Included Services with Checkmarks */}
                  <div className="sr-res-inclusions-list">
                    <div className="sr-res-inclusions-label">
                      INCLUDED SERVICES
                    </div>
                    {selectedPkg.inclusions &&
                      selectedPkg.inclusions.map((item, idx) => (
                        <div key={idx} className="sr-res-inclusion-item">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>{item}</span>
                        </div>
                      ))}
                  </div>

                  {/* Price Calculation Box */}
                  <div className="sr-res-pricing-card">
                    <div className="sr-res-pricing-row">
                      <span>Price per passenger</span>
                      <strong>${selectedPkg.price} USD</strong>
                    </div>
                    <div className="sr-res-pricing-row">
                      <span>Passengers</span>
                      <strong>&times; {paxCount}</strong>
                    </div>
                    <div className="sr-res-pricing-row">
                      <span>Subtotal</span>
                      <strong>${pricing.baseTotal.toFixed(2)} USD</strong>
                    </div>
                    {pricing.discountPercent > 0 && (
                      <div className="sr-res-pricing-row" style={{ color: "#16a34a" }}>
                        <span>Passenger Discount ({pricing.discountPercent}%)</span>
                        <strong style={{ color: "#16a34a" }}>-${pricing.discountAmount.toFixed(2)} USD</strong>
                      </div>
                    )}
                    <div className="sr-res-pricing-row">
                      <span>VIP Lounge &amp; Formalities</span>
                      <span style={{ color: "#16a34a", fontWeight: 700 }}>
                        Included
                      </span>
                    </div>
                    <div className="sr-res-pricing-row is-total">
                      <span>Total Payable</span>
                      <span className="price-tag">
                        ${pricing.finalTotal.toFixed(2)} USD
                      </span>
                    </div>
                  </div>

                  {/* Support Contact */}
                  <div className="sr-res-contact-card">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <div>
                      <strong>Silk Route Assistance Desk</strong>
                      <span>+94 11 225 2861 ext. 3320 &bull; 24 Hours</span>
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
