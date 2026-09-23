import React, { useState, useMemo, useRef } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import "../styles/Dashboard.css";
import "../styles/BookingPackages.css";

import loungeSeatingImg from "../assets/packages/lounge_seating.jpg";
import executiveLoungeImg from "../assets/packages/executive_lounge.jpg";
import vipSofasImg from "../assets/packages/vip_sofas.jpg";


// Helper functions for localized date and datetime strings
function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayDateTimeString(hoursOffset = 0) {
  const d = new Date();
  if (hoursOffset) {
    d.setHours(d.getHours() + hoursOffset);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function isArrivalPackage(pkg) {
  if (!pkg) return false;
  return (
    pkg.category === "arrival-departure" ||
    pkg.category === "arrival" ||
    (pkg.inclusions && pkg.inclusions.some((i) => i.toLowerCase().includes("arrival")))
  );
}

function isDeparturePackage(pkg) {
  if (!pkg) return false;
  return (
    pkg.category === "arrival-departure" ||
    pkg.category === "departure" ||
    pkg.category === "lounge" ||
    (pkg.inclusions && pkg.inclusions.some((i) => i.toLowerCase().includes("departure") || i.toLowerCase().includes("lounge")))
  );
}

const PACKAGES_DATA = [
  {
    id: "ruby",
    name: "Ruby Package",
    subtitle: "Complete VIP airport experience",
    price: 124,
    badge: "All-Inclusive",
    featured: true,
    image: loungeSeatingImg,
    category: "arrival-departure",
    inclusions: [
      "Silk Route Arrival",
      "Silk Route Departure",
      "Executive Lounge"
    ],
    openingHours: "24 hours",
    childrenPolicy: "Children under 02 Years free of charge",
    mapDetail: "Silk Route Dedicated Pier & Lounge Area"
  },
  {
    id: "sapphire",
    name: "Sapphire Package",
    subtitle: "Fast-track departure & relaxation",
    price: 72,
    badge: "Departure + Lounge",
    image: executiveLoungeImg,
    category: "departure",
    inclusions: [
      "Silk Route Departure",
      "Executive Lounge"
    ],
    openingHours: "24 hours",
    childrenPolicy: "Children under 02 Years free of charge",
    mapDetail: "Upper Departure Level Gate 8 Pier"
  },
  {
    id: "amethyst",
    name: "Amethyst Package",
    subtitle: "Arrival & departure transit bundle",
    price: 98,
    badge: "Transit Special",
    image: executiveLoungeImg,
    category: "arrival-departure",
    inclusions: [
      "Silk Route Arrival",
      "Silk Route Departure"
    ],
    openingHours: "24 hours",
    childrenPolicy: "Children under 02 Years free of charge",
    mapDetail: "Terminal 1 Silk Route Hub"
  },
  {
    id: "topaz-arrival",
    name: "Topaz Arrival Package",
    subtitle: "Dedicated arrival assistance",
    price: 52,
    badge: "Arrival Only",
    image: vipSofasImg,
    category: "arrival",
    inclusions: [
      "Silk Route Arrival"
    ],
    openingHours: "24 hours",
    childrenPolicy: "Children under 02 Years free of charge",
    mapDetail: "Arrival Pier Gates 1-5 & Dedicated Immigration"
  },
  {
    id: "topaz-departure",
    name: "Topaz Departure Package",
    subtitle: "Priority departure assistance",
    price: 52,
    badge: "Departure Only",
    image: loungeSeatingImg,
    category: "departure",
    inclusions: [
      "Silk Route Departure"
    ],
    openingHours: "24 hours",
    childrenPolicy: "Children under 02 Years free of charge",
    mapDetail: "Departure Pier Gate 6 Dedicated Clearance"
  },
  {
    id: "garnet",
    name: "Garnet Package",
    subtitle: "Executive lounge access & hospitality",
    price: 21,
    badge: "Lounge Only",
    image: executiveLoungeImg,
    category: "lounge",
    inclusions: [
      "Executive Lounge"
    ],
    openingHours: "24 hours",
    childrenPolicy: "Children under 02 Years free of charge",
    locationNote: "Location : Pier details..",
    mapDetail: "Main Pier Executive Lounge Wing"
  }
];

const CATEGORY_TABS = [
  { key: "all", label: "All Packages (6)" },
  { key: "arrival-departure", label: "Arrival & Departure (2)" },
  { key: "arrival", label: "Arrival Only (1)" },
  { key: "departure", label: "Departure Only (2)" },
  { key: "lounge", label: "Lounge Only (1)" }
];

export default function BookingPackages({ user, onLogout, onNavigate }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modals state
  const [activeModalPackage, setActiveModalPackage] = useState(null); // for Booking Modal
  const [mapModalPackage, setMapModalPackage] = useState(null); // for Map Details Modal
  
  // Booking Form State
  const [paxCount, setPaxCount] = useState(1);
  const [arrivalDate, setArrivalDate] = useState("");
  const [arrivalFlightNumber, setArrivalFlightNumber] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureFlightNumber, setDepartureFlightNumber] = useState("");
  const [validationError, setValidationError] = useState("");
  const [successToast, setSuccessToast] = useState(null);

  const arrivalDateRef = useRef(null);
  const departureDateRef = useRef(null);

  const filteredPackages = useMemo(() => {
    return PACKAGES_DATA.filter((pkg) => {
      const matchesCategory =
        selectedCategory === "all" || pkg.category === selectedCategory;
      const matchesSearch =
        pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.inclusions.some((inc) =>
          inc.toLowerCase().includes(searchTerm.toLowerCase())
        );
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchTerm]);

    const handleOpenBooking = (pkg) => {
    setActiveModalPackage(pkg);
    setValidationError("");
    setPaxCount(1);
    setArrivalFlightNumber("");
    setDepartureFlightNumber("");
    const today = getTodayDateString();
    setArrivalDate(`${today}T10:00`);
    setDepartureDate(`${today}T14:30`);
  };

  const handleConfirmBooking = (e) => {
    e.preventDefault();
    if (!activeModalPackage) return;
    setValidationError("");

    const hasArrival = isArrivalPackage(activeModalPackage);
    const hasDeparture = isDeparturePackage(activeModalPackage);
    const todayDateOnly = getTodayDateString();

    if (hasArrival) {
      const arrDateOnly = (arrivalDate || "").slice(0, 10);
      if (!arrDateOnly || arrDateOnly < todayDateOnly) {
        setValidationError("Arrival Date cannot be in the past. Please select today or a future date.");
        return;
      }
      if (!arrivalFlightNumber.trim()) {
        setValidationError("Arrival flight number is mandatory.");
        return;
      }
    }

    if (hasDeparture) {
      const depDateOnly = (departureDate || "").slice(0, 10);
      if (!depDateOnly || depDateOnly < todayDateOnly) {
        setValidationError("Departure Date cannot be in the past. Please select today or a future date.");
        return;
      }
      if (!departureFlightNumber.trim()) {
        setValidationError("Departure flight number is mandatory.");
        return;
      }
    }

    if (hasArrival && hasDeparture) {
      if (arrivalDate && departureDate && departureDate < arrivalDate) {
        setValidationError("Departure Date and Time cannot be earlier than Arrival Date and Time.");
        return;
      }
    }

    const bookingId = "BK" + Math.floor(10000 + Math.random() * 90000);
    const totalAmount = activeModalPackage.price * paxCount;

    let flightSummary = "";
    if (hasArrival && hasDeparture) {
      flightSummary = `${arrivalFlightNumber.trim()} / ${departureFlightNumber.trim()}`;
    } else if (hasArrival) {
      flightSummary = arrivalFlightNumber.trim();
    } else if (hasDeparture) {
      flightSummary = departureFlightNumber.trim();
    } else {
      flightSummary = "UL-504";
    }

    setSuccessToast({
      bookingId,
      packageName: activeModalPackage.name,
      flight: flightSummary,
      passenger: user?.username || "Administrator",
      pax: paxCount,
      total: totalAmount
    });

    setActiveModalPackage(null);

    // Auto-dismiss toast after 6 seconds
    setTimeout(() => {
      setSuccessToast(null);
    }, 6000);
  };

  return (
    <div className="sr-app">
      <Sidebar
        active="add-new-reservation"
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
          <div className="sr-packages-page">
            
            {/* Top Navigation & Breadcrumb Header */}
            <div className="sr-packages-header-bar">
              <div className="sr-packages-header-left">
                <button
                  className="sr-back-btn"
                  onClick={() => onNavigate && onNavigate("dashboard")}
                  type="button"
                  title="Return to Dashboard Overview"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  <span>&lt; HOME</span>
                </button>
                <div className="sr-packages-title-wrap">
                  <h2>Silk Route Special Offers & Packages</h2>
                  <p>Select a package to initiate a new VIP passenger reservation.</p>
                </div>
              </div>
              <div className="sr-packages-header-meta">
                <div className="sr-badge-live">
                  <span className="sr-pulse-dot"></span>
                  <span>Instant Confirmation</span>
                </div>
              </div>
            </div>

            {/* Success Toast */}
            {successToast && (
              <div className="sr-toast-success">
                <div>
                  <strong>Reservation Created Successfully!</strong>
                  <span>
                    Booking <b>{successToast.bookingId}</b> confirmed for {successToast.passenger} ({successToast.pax} Pax) • {successToast.packageName} (Total: ${successToast.total})
                  </span>
                </div>
                <button
                  className="sr-modal-close"
                  onClick={() => setSuccessToast(null)}
                  style={{ width: 26, height: 26 }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Advisory Vaccination Notice Banner */}
            <div className="sr-notice-banner" role="alert">
              <div className="sr-notice-icon" aria-hidden="true">
                !
              </div>
              <div className="sr-notice-content">
                <span className="sr-notice-title">
                  NOTE: The Silk Route arrival facility is open for fully vaccinated passengers only.
                </span>
                Please make sure your reservation only if you have taken all recommended doses of the vaccine and a period of 14 days have lapsed after the final dose.
              </div>
            </div>

            {/* Search and Category Filter Bar */}
            <div className="sr-filters-bar">
              <div className="sr-filter-tabs">
                {CATEGORY_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    className={`sr-filter-tab ${selectedCategory === tab.key ? "is-active" : ""}`}
                    onClick={() => setSelectedCategory(tab.key)}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              
              <div className="sr-search-box">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--sr-text-muted)" }}>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search package or service..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#888", padding: 0 }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Packages Grid */}
            <div className="sr-packages-grid">
              {filteredPackages.map((pkg) => (
                <div className="sr-pkg-card" key={pkg.id}>
                  {/* Card Media */}
                  <div className="sr-pkg-media">
                    <img src={pkg.image} alt={pkg.name} loading="lazy" />
                    <span className={`sr-pkg-badge ${pkg.featured ? "is-featured" : ""}`}>
                      {pkg.badge}
                    </span>
                  </div>

                  {/* Card Content Body */}
                  <div className="sr-pkg-body">
                    <div className="sr-pkg-header">
                      <div>
                        <h3 className="sr-pkg-name">{pkg.name}</h3>
                        <div className="sr-pkg-subtitle">{pkg.subtitle}</div>
                      </div>
                      <div className="sr-pkg-price-wrap">
                        <div className="sr-pkg-price-label">Total Price Per Pax</div>
                        <div className="sr-pkg-price">
                          <span className="sr-currency">$</span>
                          <span>{pkg.price}</span>
                        </div>
                      </div>
                    </div>

                    {/* Features / Inclusions Checklist */}
                    <ul className="sr-pkg-inclusions">
                      {pkg.inclusions.map((item, idx) => (
                        <li key={idx}>
                          <span className="sr-check-icon">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Meta Specifications */}
                    <div className="sr-pkg-meta">
                      <div className="sr-pkg-meta-row">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>Opening Hours : {pkg.openingHours}</span>
                      </div>
                      <div className="sr-pkg-meta-row">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                        <span>{pkg.childrenPolicy}</span>
                      </div>
                      {pkg.locationNote && (
                        <div className="sr-pkg-meta-row">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <span>{pkg.locationNote}</span>
                        </div>
                      )}
                      <div>
                        <button
                          className="sr-pkg-map-link"
                          type="button"
                          onClick={() => setMapModalPackage(pkg)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                            <line x1="8" y1="2" x2="8" y2="18" />
                            <line x1="16" y1="6" x2="16" y2="22" />
                          </svg>
                          <span>Silk Route Map details..</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Action */}
                  <div className="sr-pkg-footer">
                    <button
                      className="sr-btn-book"
                      onClick={() => handleOpenBooking(pkg)}
                      type="button"
                    >
                      <span>BOOK NOW</span>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </main>

        <footer className="sr-footer">
          <span>© 2026 Silk Route Manual Booking. All rights reserved.</span>
          <span className="sr-footer-support">Airport &amp; Aviation Services (Sri Lanka)</span>
        </footer>
      </div>

      {/* Map Details Modal */}
      {mapModalPackage && (
        <div className="sr-modal-backdrop" onClick={() => setMapModalPackage(null)}>
          <div className="sr-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sr-modal-header">
              <div className="sr-modal-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--sr-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                  <line x1="8" y1="2" x2="8" y2="18" />
                  <line x1="16" y1="6" x2="16" y2="22" />
                </svg>
                <h3>Silk Route Map &amp; Terminal Details</h3>
              </div>
              <button
                className="sr-modal-close"
                onClick={() => setMapModalPackage(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="sr-modal-body">
              <div className="sr-map-preview">
                <strong>Bandaranaike International Airport (BIA) — Silk Route Terminal Facilities</strong>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--sr-text-muted)" }}>
                  Package: <b>{mapModalPackage.name}</b> • {mapModalPackage.mapDetail}
                </p>
                <div className="sr-map-diagram">
                  <div className="sr-map-node">
                    <strong>1. Silk Route Arrival Lounge</strong>
                    <span>Pier A / Gate 6 (Ground Level)</span>
                  </div>
                  <div className="sr-map-node">
                    <strong>2. Dedicated VIP Immigration Clearance</strong>
                    <span>Exclusive Fast-Track Counters</span>
                  </div>
                  <div className="sr-map-node">
                    <strong>3. Silk Route Departure Lounge</strong>
                    <span>Upper Level, Pier B (Post-Security)</span>
                  </div>
                  <div className="sr-map-node">
                    <strong>4. Executive Lounge &amp; Dining Area</strong>
                    <span>24/7 Buffet, Wi-Fi &amp; Shower Suites</span>
                  </div>
                </div>
              </div>

              <div className="sr-map-info-grid">
                <div className="sr-map-info-card">
                  <strong>Operating Hours</strong>
                  <span>24 Hours Continuous Service, 365 Days</span>
                </div>
                <div className="sr-map-info-card">
                  <strong>Children Exemption</strong>
                  <span>Children under 2 years accommodated free of charge</span>
                </div>
                <div className="sr-map-info-card">
                  <strong>Baggage Handling</strong>
                  <span>Dedicated porterage and priority baggage claim</span>
                </div>
                <div className="sr-map-info-card">
                  <strong>Assistance Desk</strong>
                  <span>Direct phone: +94 11 225 2861 ext. 3320</span>
                </div>
              </div>
            </div>
            <div className="sr-modal-footer">
              <button
                className="sr-btn-secondary"
                onClick={() => setMapModalPackage(null)}
              >
                Close
              </button>
              <button
                className="sr-btn-primary"
                onClick={() => {
                  const p = mapModalPackage;
                  setMapModalPackage(null);
                  handleOpenBooking(p);
                }}
              >
                Proceed to Book This Package
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Silk Route Package Reservation Modal */}
      {activeModalPackage && (() => {
        const hasArrival = isArrivalPackage(activeModalPackage);
        const hasDeparture = isDeparturePackage(activeModalPackage);

        return (
          <div className="sr-modal-backdrop" onClick={() => setActiveModalPackage(null)}>
            <div className="sr-ruby-modal-card" onClick={(e) => e.stopPropagation()}>
              {/* Header Banner */}
              <div className="sr-ruby-banner">
                <div className="sr-ruby-banner-left">
                  <span className="sr-ruby-banner-plane" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                    </svg>
                  </span>
                  <h2 className="sr-ruby-banner-title">
                    Silk Route {activeModalPackage.name} Reservation
                  </h2>
                </div>
                <div className="sr-ruby-banner-right">
                  <div className="sr-ruby-silk-emblem" title="Silk Route VIP">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="m10 8 4 4-4 4" />
                    </svg>
                    <span>SILK</span>
                  </div>
                  <button
                    type="button"
                    className="sr-ruby-close-btn"
                    onClick={() => setActiveModalPackage(null)}
                    aria-label="Close dialog"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Sub-Bar */}
              <div className="sr-ruby-subbar">
                <span className="sr-ruby-user-greeting">
                  Welcome {user?.username || "Administrator"} |{" "}
                  <button type="button" className="sr-ruby-logout-btn" onClick={onLogout}>
                    Log out
                  </button>
                </span>
              </div>

              {/* Validation Error Message */}
              {validationError && (
                <div className="sr-ruby-error-banner">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{validationError}</span>
                </div>
              )}

              {/* Reservation Form */}
              <form onSubmit={handleConfirmBooking} className="sr-ruby-form">
                <div className={`sr-ruby-columns ${!hasArrival || !hasDeparture ? "is-single-col" : ""}`}>
                  {/* Arrival Details Column */}
                  {hasArrival && (
                    <div className="sr-ruby-col">
                      <h3 className="sr-ruby-col-title">Arrival Details</h3>

                      <div className="sr-ruby-group">
                        <label className="sr-ruby-label" htmlFor="sr-arrival-date">
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
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM7 11h5v5H7z" />
                            </svg>
                          </button>
                        </div>
                        <div className="sr-ruby-hint">
                          SELECT THE ARRIVAL DATE AND THE TIME OF YOUR FLIGHT
                        </div>
                      </div>

                      <div className="sr-ruby-group">
                        <label className="sr-ruby-label" htmlFor="sr-arrival-flight">
                          Flight No *
                        </label>
                        <input
                          id="sr-arrival-flight"
                          type="text"
                          required
                          className="sr-ruby-input sr-ruby-input-flat"
                          placeholder="Arrival flight number"
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
                    <div className="sr-ruby-col">
                      <h3 className="sr-ruby-col-title">Departure Details</h3>

                      <div className="sr-ruby-group">
                        <label className="sr-ruby-label" htmlFor="sr-departure-date">
                          Departure Date*
                        </label>
                        <div className="sr-ruby-input-box">
                          <input
                            id="sr-departure-date"
                            ref={departureDateRef}
                            type="datetime-local"
                            required
                            min={hasArrival ? arrivalDate || getTodayDateTimeString() : getTodayDateTimeString()}
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
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM7 11h5v5H7z" />
                            </svg>
                          </button>
                        </div>
                        <div className="sr-ruby-hint">
                          SELECT THE DEPARTURE DATE AND THE TIME OF YOUR FLIGHT
                        </div>
                      </div>

                      <div className="sr-ruby-group">
                        <label className="sr-ruby-label" htmlFor="sr-departure-flight">
                          Flight No *
                        </label>
                        <input
                          id="sr-departure-flight"
                          type="text"
                          required
                          className="sr-ruby-input sr-ruby-input-flat"
                          placeholder="Departure flight number"
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

                {/* Number of Passengers */}
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
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((num) => (
                        <option key={num} value={num}>
                          {num}
                        </option>
                      ))}
                    </select>
                    <div className="sr-ruby-select-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 10l5 5 5-5z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* SUBMIT Button */}
                <div className="sr-ruby-submit-row">
                  <button type="submit" className="sr-ruby-submit-btn">
                    SUBMIT
                  </button>
                </div>

                {/* Disclaimers & Notes */}
                <div className="sr-ruby-footer-notes">
                  <div className="sr-ruby-mandatory-note">
                    All fields marked as * are mandatory
                  </div>
                  <div className="sr-ruby-disclaimer-note">
                    <strong>Note:</strong> Guests are allowed to stay in the Silk Route Lounges only until formalities are completed.
                  </div>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
