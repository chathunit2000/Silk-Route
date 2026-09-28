import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import "../styles/Dashboard.css";
import "../styles/BookingPackages.css";
import { PACKAGES_DATA } from "../data/packagesData";

const CATEGORY_TABS = [
  { key: "all", label: "All Packages", icon: "all" },
  { key: "arrival-departure", label: "Arrival & Departure", icon: "arrival-departure" },
  { key: "arrival", label: "Arrival Only", icon: "arrival" },
  { key: "departure", label: "Departure Only", icon: "departure" },
  { key: "lounge", label: "Lounge Only", icon: "lounge" },
];

function CategoryIcon({ type }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  switch (type) {
    case "all":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "arrival-departure":
      return (
        <svg {...common}>
          <path d="M17.8 19.2 16 11l3.5-3.5a1.5 1.5 0 0 0-2.1-2.1L14 9 5.8 7.2 4 9l6 3-3 3H4l-1 2 5 1.5L9.5 23l2-1-1.8-8.2 3-3 3 6z" />
        </svg>
      );
    case "arrival":
      return (
        <svg {...common}>
          <path d="M2 22h20" />
          <path d="M19 13l-6-6-7 2-2-2 4-1 3-3 3 1 6 6z" />
          <path d="M4 17l4-2" />
        </svg>
      );
    case "departure":
      return (
        <svg {...common}>
          <path d="M2 22h20" />
          <path d="M19 8l-6 6-7-2-2 2 4 1 3 3 3-1 6-6z" />
          <path d="M4 10l4 2" />
        </svg>
      );
    case "lounge":
      return (
        <svg {...common}>
          <path d="M3 11v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
          <path d="M2 14h20" />
          <path d="M6 18v2" />
          <path d="M18 18v2" />
          <path d="M6 8a4 4 0 0 1 8 0v3H6V8z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function BookingPackages({
  user,
  onLogout,
  onNavigate,
  onSelectPackage,
}) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Map Details Modal state
  const [mapModalPackage, setMapModalPackage] = useState(null);

  // Dynamic counts for category tabs
  const categoryCounts = useMemo(() => {
    return {
      all: PACKAGES_DATA.length,
      "arrival-departure": PACKAGES_DATA.filter(
        (p) => p.category === "arrival-departure"
      ).length,
      arrival: PACKAGES_DATA.filter((p) => p.category === "arrival").length,
      departure: PACKAGES_DATA.filter((p) => p.category === "departure").length,
      lounge: PACKAGES_DATA.filter((p) => p.category === "lounge").length,
    };
  }, []);

  const filteredPackages = useMemo(() => {
    return PACKAGES_DATA.filter((pkg) => {
      const matchesCategory =
        selectedCategory === "all" || pkg.category === selectedCategory;
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        pkg.name.toLowerCase().includes(term) ||
        (pkg.subtitle && pkg.subtitle.toLowerCase().includes(term)) ||
        (pkg.badge && pkg.badge.toLowerCase().includes(term)) ||
        pkg.inclusions.some((inc) => inc.toLowerCase().includes(term));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchTerm]);

  // Navigate directly to the package reservation page
  const handleOpenBooking = (pkg) => {
    if (onSelectPackage) {
      onSelectPackage(pkg);
    }
    if (onNavigate) {
      onNavigate("package-reservation", pkg);
    }
    navigate(`/package-reservation/${pkg.id}`, { state: { packageData: pkg } });
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
                  onClick={() => {
                    if (onNavigate) onNavigate("dashboard");
                    navigate("/dashboard");
                  }}
                  type="button"
                  title="Return to Dashboard Overview"
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

                </button>
                <div className="sr-packages-title-wrap">
                  <h2>Silk Route Special Offers &amp; Packages</h2>
                  <p>
                    Select a VIP package to initiate a new passenger reservation.
                  </p>
                </div>
              </div>
              <div className="sr-packages-header-meta">
                <div className="sr-badge-live">
                  <span className="sr-pulse-dot"></span>
                  <span>Instant Confirmation</span>
                </div>
              </div>
            </div>

            {/* Official Silk Route VIP Notice Banner */}
            <div className="sr-notice-banner">
              <span className="sr-notice-icon">i</span>
              <div className="sr-notice-content">
                <span className="sr-notice-title">Silk Route Operations:</span>
                VIP terminal services are operated 24 hours daily at Bandaranaike International Airport (CMB). Fast-track immigration, baggage escort, and luxury lounge amenities included.
              </div>
            </div>

            {/* Upgraded Filter Tabs & Search Bar */}
            <div className="sr-packages-toolbar">
              <div className="sr-category-tabs" role="tablist" aria-label="Package category filters">
                {CATEGORY_TABS.map((tab) => {
                  const isActive = selectedCategory === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`sr-tab-btn ${isActive ? "is-active" : ""}`}
                      onClick={() => setSelectedCategory(tab.key)}
                    >
                      <CategoryIcon type={tab.icon} />
                      <span>{tab.label}</span>
                      <span className="sr-tab-count">
                        {categoryCounts[tab.key] || 0}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="sr-packages-search">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search package name, service..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search packages"
                />
                {searchTerm && (
                  <button
                    className="sr-search-clear"
                    onClick={() => setSearchTerm("")}
                    type="button"
                    title="Clear search"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Filter Feedback Status Bar */}
            <div className="sr-filter-status-bar">
              <span className="sr-filter-status-text">
                Showing <strong>{filteredPackages.length}</strong> of{" "}
                <strong>{PACKAGES_DATA.length}</strong> VIP packages
                {selectedCategory !== "all" && (
                  <span>
                    {" "}&bull; Filter: <em>{CATEGORY_TABS.find(t => t.key === selectedCategory)?.label}</em>
                  </span>
                )}
              </span>
              {(selectedCategory !== "all" || searchTerm) && (
                <button
                  type="button"
                  className="sr-clear-filters-link"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSearchTerm("");
                  }}
                >
                  Reset filters ✕
                </button>
              )}
            </div>

            {/* Empty Search Results State */}
            {filteredPackages.length === 0 ? (
              <div className="sr-no-results">
                <div className="sr-no-results-icon">
                  <svg
                    width="34"
                    height="34"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                </div>
                <h3>No VIP packages found</h3>
                <p>
                  We couldn't find any packages matching "
                  <strong>{searchTerm || selectedCategory}</strong>".
                  Try searching for another keyword or reset the filters.
                </p>
                <button
                  type="button"
                  className="sr-reset-btn"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSearchTerm("");
                  }}
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              /* Packages Grid */
              <div className="sr-packages-grid">
                {filteredPackages.map((pkg) => (
                  <div
                    className={`sr-pkg-card ${pkg.featured ? "is-featured" : ""}`}
                    key={pkg.id}
                  >
                    {/* Card Media Header */}
                    <div className="sr-pkg-media">
                      <img
                        src={pkg.image}
                        alt={pkg.name}
                        className="sr-pkg-img"
                      />
                      <div className="sr-pkg-media-overlay"></div>
                      <span className="sr-pkg-badge">{pkg.badge}</span>
                      {pkg.featured && (
                        <span className="sr-pkg-badge-featured">★ POPULAR</span>
                      )}
                      <div className="sr-pkg-price-tag">
                        <span className="sr-pkg-currency">$</span>
                        <span className="sr-pkg-amount">{pkg.price}</span>
                        <span className="sr-pkg-unit">USD</span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="sr-pkg-body">
                      <div className="sr-pkg-header">
                        <h3 className="sr-pkg-name">{pkg.name}</h3>
                        <p className="sr-pkg-subtitle">{pkg.subtitle}</p>
                      </div>

                      <div className="sr-pkg-section-title">
                        PACKAGE INCLUSIONS
                      </div>
                      <ul className="sr-pkg-inclusions">
                        {pkg.inclusions.map((inc, i) => (
                          <li key={i}>
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="2.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>{inc}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Operational Details */}
                      <div className="sr-pkg-meta">
                        <div className="sr-pkg-meta-row">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span>Opening Hours : {pkg.openingHours}</span>
                        </div>
                        <div className="sr-pkg-meta-row">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          <span>Children Policy : {pkg.childrenPolicy}</span>
                        </div>
                        {pkg.locationNote && (
                          <div className="sr-pkg-meta-row">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
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
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                              <line x1="8" y1="2" x2="8" y2="18" />
                              <line x1="16" y1="6" x2="16" y2="22" />
                            </svg>
                            <span>Silk Route Map details..</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card Action - Navigates directly to dedicated package-reservation page */}
                    <div className="sr-pkg-footer">
                      <button
                        className="sr-btn-book"
                        onClick={() => handleOpenBooking(pkg)}
                        type="button"
                      >
                        <span>BOOK NOW</span>
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        <footer className="sr-footer">
          <span>&copy; 2026 Silk Route Manual Booking. All rights reserved.</span>
          <span className="sr-footer-support">
            Airport &amp; Aviation Services (Sri Lanka)
          </span>
        </footer>
      </div>

      {/* Map Details Modal */}
      {mapModalPackage && (
        <div
          className="sr-modal-backdrop"
          onClick={() => setMapModalPackage(null)}
        >
          <div className="sr-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sr-modal-header">
              <div className="sr-modal-title">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--sr-blue)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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
                <strong>
                  Bandaranaike International Airport (BIA) — Silk Route Terminal Facilities
                </strong>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 13,
                    color: "var(--sr-text-muted)",
                  }}
                >
                  Package: <b>{mapModalPackage.name}</b> &bull;{" "}
                  {mapModalPackage.mapDetail}
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
    </div>
  );
}
