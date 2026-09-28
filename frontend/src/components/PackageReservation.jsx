import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation, useSearchParams, Link } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import "../styles/Dashboard.css";
import "../styles/BookingPackages.css";
import "../styles/PackageReservation.css";

import {
  PACKAGES_DATA,
  isArrivalPackage,
  isDeparturePackage,
  getTodayDateString,
  getTodayDateTimeString,
} from "../data/packagesData";

export default function PackageReservation({
  user,
  packageData,
  onLogout,
  onNavigate,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { packageId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [step, setStep] = useState(() => {
    const s = parseInt(searchParams.get("step") || "1", 10);
    return s === 1 || s === 2 || s === 3 ? s : 1;
  });

  // Fallback to the first package if none provided
  const [selectedPkg, setSelectedPkg] = useState(() => {
    if (location.state?.packageData) return location.state.packageData;
    if (packageId) {
      const match = PACKAGES_DATA.find((p) => p.id.toLowerCase() === packageId.toLowerCase());
      if (match) return match;
    }
    if (packageData) return packageData;
    return PACKAGES_DATA[0];
  });

  // When route param, router state, or prop changes, update selectedPkg
  useEffect(() => {
    if (location.state?.packageData) {
      setSelectedPkg(location.state.packageData);
    } else if (packageId) {
      const match = PACKAGES_DATA.find((p) => p.id.toLowerCase() === packageId.toLowerCase());
      if (match) {
        setSelectedPkg(match);
      }
    } else if (packageData) {
      setSelectedPkg(packageData);
    }
  }, [packageId, location.state, packageData]);

  // Synchronize step with browser back/forward navigation
  useEffect(() => {
    const s = parseInt(searchParams.get("step") || "1", 10);
    if (s === 1 || s === 2 || s === 3) {
      setStep(s);
    }
  }, [searchParams]);


  // Step 1: Flight & Passenger count state
  const [paxCount, setPaxCount] = useState(1);
  const [arrivalDate, setArrivalDate] = useState(() => {
    const today = getTodayDateString();
    return `${today}T10:00`;
  });
  const [arrivalFlightNumber, setArrivalFlightNumber] = useState("");
  const [departureDate, setDepartureDate] = useState(() => {
    const today = getTodayDateString();
    return `${today}T14:30`;
  });
  const [departureFlightNumber, setDepartureFlightNumber] = useState("");
  const [validationError, setValidationError] = useState("");

  const arrivalDateRef = useRef(null);
  const departureDateRef = useRef(null);

  const hasArrival = isArrivalPackage(selectedPkg);
  const hasDeparture = isDeparturePackage(selectedPkg);

  // Step 2: Passenger & Contact Details (matching Image 2)
  const [passengers, setPassengers] = useState([
    { title: "Mr", name: "", passportNo: "" },
  ]);

  // Adjust passengers list whenever paxCount changes
  useEffect(() => {
    setPassengers((prev) => {
      const next = [...prev];
      if (next.length < paxCount) {
        while (next.length < paxCount) {
          next.push({ title: "Mr", name: "", passportNo: "" });
        }
      } else if (next.length > paxCount) {
        return next.slice(0, paxCount);
      }
      return next;
    });
  }, [paxCount]);

  const [payIn, setPayIn] = useState("Rupees");

  // Contact Details of the Lead Passenger
  const [leadContactNumber, setLeadContactNumber] = useState(user?.tele || "");
  const [leadEmail, setLeadEmail] = useState(user?.email || "");
  const [leadName, setLeadName] = useState(user?.name || user?.username || "");

  // Local Contact Person
  const [localContactName, setLocalContactPersonName] = useState("");
  const [localContactEmail, setLocalContactEmail] = useState("");
  const [localContactNumber, setLocalContactNumber] = useState("");
  const [localOrganisation, setLocalOrganisation] = useState(
    user?.organisation || ""
  );

  // Details of Visitors
  const [visitor1Name, setVisitor1Name] = useState("");
  const [visitor1Id, setVisitor1Id] = useState("");
  const [visitor2Name, setVisitor2Name] = useState("");
  const [visitor2Id, setVisitor2Id] = useState("");
  const [vehicleNos, setVehicleNos] = useState("");
  const [comments, setComments] = useState("");

  // Terms and conditions checkbox (checked by default as shown in Image 2)
  const [termsAccepted, setTermsAccepted] = useState(true);

  // Confirmed booking state
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const handlePackageChange = (e) => {
    const pkgId = e.target.value;
    const found = PACKAGES_DATA.find((p) => p.id === pkgId);
    if (found) {
      setSelectedPkg(found);
      setValidationError("");
      navigate(`/package-reservation/${found.id}${location.search}`, {
        replace: true,
        state: { packageData: found },
      });
    }
  };


  // Step 1: Submit flight schedule & proceed to Step 2
  const handleProceedToPassengerDetails = (e) => {
    e.preventDefault();
    if (!selectedPkg) return;
    setValidationError("");

    const todayDateOnly = getTodayDateString();

    if (hasArrival) {
      const arrDateOnly = (arrivalDate || "").slice(0, 10);
      if (!arrDateOnly || arrDateOnly < todayDateOnly) {
        setValidationError(
          "Arrival Date cannot be in the past. Please select today or a future date."
        );
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
        setValidationError(
          "Departure Date cannot be in the past. Please select today or a future date."
        );
        return;
      }
      if (!departureFlightNumber.trim()) {
        setValidationError("Departure flight number is mandatory.");
        return;
      }
    }

    if (hasArrival && hasDeparture) {
      if (arrivalDate && departureDate && departureDate < arrivalDate) {
        setValidationError(
          "Departure Date and Time cannot be earlier than Arrival Date and Time."
        );
        return;
      }
    }

    // Advance to Step 2: Passenger Details (Image 2)
    setStep(2);
    setSearchParams({ step: "2" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };


  const handlePassengerChange = (index, field, value) => {
    setPassengers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Step 2: Final Submit
  const handleFinalSubmit = (e) => {
    e.preventDefault();
    setValidationError("");

    if (!termsAccepted) {
      setValidationError("Please agree to the Terms and Conditions to proceed.");
      return;
    }

    // Ensure first passenger has name
    const primaryName = (passengers[0]?.name || leadName || "").trim();
    if (!primaryName) {
      setValidationError("Passenger name is required.");
      return;
    }

    const bookingId = "BK" + Math.floor(10000 + Math.random() * 90000);
    const totalAmount = selectedPkg.price * paxCount;

    let flightSummary = "";
    if (hasArrival && hasDeparture) {
      flightSummary = `${arrivalFlightNumber.trim()} / ${departureFlightNumber.trim()}`;
    } else if (hasArrival) {
      flightSummary = arrivalFlightNumber.trim();
    } else if (hasDeparture) {
      flightSummary = departureFlightNumber.trim();
    } else {
      flightSummary = "N/A";
    }

    setConfirmedBooking({
      bookingId,
      packageName: selectedPkg.name,
      packageBadge: selectedPkg.badge,
      passengerTitle: passengers[0]?.title || "Mr",
      passengerName: primaryName,
      passportNo: passengers[0]?.passportNo || "N/A",
      passengersList: passengers,
      paxCount,
      payIn,
      leadContactNumber: leadContactNumber.trim() || "N/A",
      leadEmail: leadEmail.trim() || "N/A",
      leadName: leadName.trim() || primaryName,
      localContactName: localContactName.trim() || "N/A",
      localContactEmail: localContactEmail.trim() || "N/A",
      localContactNumber: localContactNumber.trim() || "N/A",
      localOrganisation: localOrganisation.trim() || "N/A",
      visitor1Name: visitor1Name.trim() || "N/A",
      visitor1Id: visitor1Id.trim() || "N/A",
      visitor2Name: visitor2Name.trim() || "N/A",
      visitor2Id: visitor2Id.trim() || "N/A",
      vehicleNos: vehicleNos.trim() || "N/A",
      comments: comments.trim() || "None",
      flightSummary,
      arrivalFlightNumber: arrivalFlightNumber.trim() || "N/A",
      arrivalDate: hasArrival ? arrivalDate.replace("T", " ") : "N/A",
      departureFlightNumber: departureFlightNumber.trim() || "N/A",
      departureDate: hasDeparture ? departureDate.replace("T", " ") : "N/A",
      unitPrice: selectedPkg.price,
      totalAmount,
      dateBooked: new Date().toLocaleString(),
    });

    setStep(3);
    setSearchParams({ step: "3" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };


  const handlePrint = () => {
    window.print();
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
          <div className="sr-res-page">
            {/* Step 3: Confirmed Booking State Screen */}
            {confirmedBooking && step === 3 ? (
              <div className="sr-confirmed-card">
                <div className="sr-confirmed-banner">
                  <div className="sr-confirmed-icon-circle">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div className="sr-confirmed-banner-text">
                    <h2>Reservation Confirmed Successfully!</h2>
                    <p>
                      Your Silk Route VIP reservation has been booked and
                      confirmed in the system.
                    </p>
                  </div>
                </div>

                <div className="sr-confirmed-body">
                  <div className="sr-confirmed-ref-strip">
                    <div>
                      <div className="ref-title">BOOKING REFERENCE</div>
                      <div className="ref-code">
                        {confirmedBooking.bookingId}
                      </div>
                    </div>
                    <div>
                      <span className="ref-status">&bull; CONFIRMED</span>
                    </div>
                  </div>

                  <div className="sr-confirmed-details-grid">
                    <div className="sr-confirmed-detail-item">
                      <span className="label">Package</span>
                      <span className="value">
                        {confirmedBooking.packageName} (
                        {confirmedBooking.packageBadge})
                      </span>
                    </div>
                    <div className="sr-confirmed-detail-item">
                      <span className="label">Lead Passenger</span>
                      <span className="value">
                        {confirmedBooking.passengerTitle}{" "}
                        {confirmedBooking.passengerName}
                      </span>
                    </div>
                    <div className="sr-confirmed-detail-item">
                      <span className="label">Passport No</span>
                      <span className="value">
                        {confirmedBooking.passportNo}
                      </span>
                    </div>
                    <div className="sr-confirmed-detail-item">
                      <span className="label">Number of Passengers</span>
                      <span className="value">
                        {confirmedBooking.paxCount} Passenger(s)
                      </span>
                    </div>
                    <div className="sr-confirmed-detail-item">
                      <span className="label">Payment Mode</span>
                      <span className="value">
                        Pay in {confirmedBooking.payIn}
                      </span>
                    </div>
                    <div className="sr-confirmed-detail-item">
                      <span className="label">Total Amount</span>
                      <span
                        className="value"
                        style={{ color: "#1474be", fontSize: 17 }}
                      >
                        ${confirmedBooking.totalAmount} USD
                      </span>
                    </div>
                    <div className="sr-confirmed-detail-item">
                      <span className="label">Flight Summary</span>
                      <span className="value">
                        {confirmedBooking.flightSummary}
                      </span>
                    </div>
                    <div className="sr-confirmed-detail-item">
                      <span className="label">Lead Contact Phone</span>
                      <span className="value">
                        {confirmedBooking.leadContactNumber}
                      </span>
                    </div>
                    <div className="sr-confirmed-detail-item">
                      <span className="label">Lead Contact Email</span>
                      <span className="value">
                        {confirmedBooking.leadEmail}
                      </span>
                    </div>
                    {confirmedBooking.localContactName !== "N/A" && (
                      <div className="sr-confirmed-detail-item">
                        <span className="label">Local Contact Person</span>
                        <span className="value">
                          {confirmedBooking.localContactName} (
                          {confirmedBooking.localContactNumber})
                        </span>
                      </div>
                    )}
                    {confirmedBooking.visitor1Name !== "N/A" && (
                      <div className="sr-confirmed-detail-item">
                        <span className="label">Visitor</span>
                        <span className="value">
                          {confirmedBooking.visitor1Name} (ID:{" "}
                          {confirmedBooking.visitor1Id})
                        </span>
                      </div>
                    )}
                    {confirmedBooking.vehicleNos !== "N/A" && (
                      <div className="sr-confirmed-detail-item">
                        <span className="label">Vehicle No(s)</span>
                        <span className="value">
                          {confirmedBooking.vehicleNos}
                        </span>
                      </div>
                    )}
                    {hasArrival && (
                      <div className="sr-confirmed-detail-item">
                        <span className="label">Arrival Schedule</span>
                        <span className="value">
                          Flight {confirmedBooking.arrivalFlightNumber} &bull;{" "}
                          {confirmedBooking.arrivalDate}
                        </span>
                      </div>
                    )}
                    {hasDeparture && (
                      <div className="sr-confirmed-detail-item">
                        <span className="label">Departure Schedule</span>
                        <span className="value">
                          Flight {confirmedBooking.departureFlightNumber} &bull;{" "}
                          {confirmedBooking.departureDate}
                        </span>
                      </div>
                    )}
                    {confirmedBooking.comments !== "None" && (
                      <div
                        className="sr-confirmed-detail-item"
                        style={{ gridColumn: "1 / -1" }}
                      >
                        <span className="label">Comments / Requirements</span>
                        <span className="value">
                          {confirmedBooking.comments}
                        </span>
                      </div>
                    )}
                    <div
                      className="sr-confirmed-detail-item"
                      style={{ gridColumn: "1 / -1" }}
                    >
                      <span className="label">Date Booked</span>
                      <span className="value">
                        {confirmedBooking.dateBooked}
                      </span>
                    </div>
                  </div>

                  <div className="sr-confirmed-actions">
                    <button
                      type="button"
                      className="sr-res-submit-btn"
                      onClick={() => {
                        setConfirmedBooking(null);
                        setStep(1);
                        setSearchParams({});
                        if (onNavigate) onNavigate("add-new-reservation");
                        navigate("/packages");
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      <span>Book Another Package</span>
                    </button>
                    <button
                      type="button"
                      className="sr-res-cancel-btn"
                      onClick={handlePrint}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ verticalAlign: "middle", marginRight: 6 }}
                      >
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                      </svg>
                      Print Receipt
                    </button>
                    <button
                      type="button"
                      className="sr-res-cancel-btn"
                      onClick={() => {
                        if (onNavigate) onNavigate("dashboard");
                        navigate("/dashboard");
                      }}
                    >
                      Go to Dashboard
                    </button>

                  </div>
                </div>
              </div>
            ) : step === 2 ? (
              /* Step 2: Passenger & Contact Details (Exactly matching Image 2) */
              <div className="sr-step2-wrapper">
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
                        <circle cx="12" cy="12" r="10" />
                        <path d="m10 8 4 4-4 4" />
                      </svg>
                      <span>SILK</span>
                    </div>
                  </div>
                </div>

                {/* Sub-Bar */}
                <div className="sr-step2-header-strip">
                  <button
                    type="button"
                    className="sr-step2-back-link"
                    onClick={() => {
                      setValidationError("");
                      setStep(1);
                      setSearchParams({ step: "1" });
                    }}
                  >
                    &lt; Back to Flight Details
                  </button>

                  <span className="sr-ruby-user-greeting">
                    Welcome {user?.username || "Administrator"} |{" "}
                    <button
                      type="button"
                      className="sr-ruby-logout-btn"
                      onClick={onLogout}
                    >
                      Log out
                    </button>
                  </span>
                  <div className="sr-step2-pkg-pill">
                    {selectedPkg.name} &bull; {paxCount}{" "}
                    {paxCount === 1 ? "Passenger" : "Passengers"} &bull; $
                    {selectedPkg.price * paxCount} USD
                  </div>
                </div>

                {/* Validation Error Message */}
                {validationError && (
                  <div
                    className="sr-ruby-error-banner"
                    style={{ margin: "16px 36px 0" }}
                  >
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

                <form onSubmit={handleFinalSubmit} className="sr-step2-body">
                  {/* 1. Passenger Details */}
                  <div className="sr-step2-section">
                    <h3 className="sr-step2-section-title">Passenger Details</h3>

                    {passengers.map((pax, index) => (
                      <div key={index} className="sr-step2-pax-grid">
                        <div className="sr-step2-field">
                          <label className="sr-step2-field-label">TITLE</label>
                          <div className="sr-step2-title-select-wrap">
                            <select
                              className="sr-step2-title-select"
                              value={pax.title}
                              onChange={(e) =>
                                handlePassengerChange(
                                  index,
                                  "title",
                                  e.target.value
                                )
                              }
                            >
                              <option value="Mr">Mr</option>
                              <option value="Mrs">Mrs</option>
                              <option value="Ms">Ms</option>
                              <option value="Rev">Rev</option>
                              <option value="Dr">Dr</option>
                              <option value="Prof">Prof</option>
                            </select>
                            <div className="sr-step2-title-btn-icon">
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M7 10l5 5 5-5z" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        <div className="sr-step2-field">
                          <label className="sr-step2-field-label">
                            {paxCount > 1
                              ? `NAME (PASSENGER ${index + 1})`
                              : "NAME"}
                          </label>
                          <input
                            type="text"
                            className="sr-step2-input"
                            placeholder="Passenger full name"
                            value={pax.name}
                            onChange={(e) =>
                              handlePassengerChange(
                                index,
                                "name",
                                e.target.value
                              )
                            }
                            required={index === 0}
                          />
                        </div>

                        <div className="sr-step2-field">
                          <label className="sr-step2-field-label">
                            PASSPORT NO
                          </label>
                          <input
                            type="text"
                            className="sr-step2-input"
                            placeholder="Passport number"
                            value={pax.passportNo}
                            onChange={(e) =>
                              handlePassengerChange(
                                index,
                                "passportNo",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}

                    <div className="sr-step2-note">
                      **Refreshments/ Meals will not be provided at Departure
                      Silk Route
                    </div>
                  </div>

                  {/* 2. Payment Details */}
                  <div className="sr-step2-section">
                    <h3 className="sr-step2-section-title">Payment Details</h3>
                    <div className="sr-step2-payment-row">
                      <div className="sr-step2-field">
                        <label className="sr-step2-field-label">PAY IN</label>
                        <div className="sr-step2-payin-wrap">
                          <select
                            className="sr-step2-payin-select"
                            value={payIn}
                            onChange={(e) => setPayIn(e.target.value)}
                          >
                            <option value="Rupees">Rupees</option>
                            <option value="US $ ">US $ (USD)</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                          </select>
                          <div className="sr-step2-title-btn-icon">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M7 10l5 5 5-5z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div
                        className="sr-step2-secure-badge"
                        style={{ alignSelf: "flex-end", height: 38 }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#d97706"
                          strokeWidth="2"
                        >
                          <rect
                            x="3"
                            y="11"
                            width="18"
                            height="11"
                            rx="2"
                            ry="2"
                          />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span>100% Secure Payments</span>
                        <div className="sr-step2-card-logos">
                          <div className="sr-mc-logo" title="Mastercard">
                            <span className="sr-mc-circle-red"></span>
                            <span className="sr-mc-circle-yellow"></span>
                          </div>
                          <span className="sr-visa-text" title="VISA">
                            VISA
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr className="sr-step2-divider" />

                  {/* 3. Contact Details of the Lead Passenger */}
                  <div className="sr-step2-section">
                    <h3 className="sr-step2-section-title">
                      Contact Details of the Lead Passenger
                    </h3>
                    <div className="sr-step2-grid-2col">
                      <div className="sr-step2-field">
                        <label className="sr-step2-field-label">
                          CONTACT NUMBER
                        </label>
                        <input
                          type="text"
                          className="sr-step2-input"
                          placeholder="Contact phone number"
                          value={leadContactNumber}
                          onChange={(e) =>
                            setLeadContactNumber(e.target.value)
                          }
                        />
                      </div>

                      <div className="sr-step2-field">
                        <label className="sr-step2-field-label">E-MAIL</label>
                        <input
                          type="email"
                          className="sr-step2-input"
                          placeholder="e.g. dilrukshi.it@airport.lk"
                          value={leadEmail}
                          onChange={(e) => setLeadEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div
                      className="sr-step2-field"
                      style={{ maxWidth: "48.5%" }}
                    >
                      <label className="sr-step2-field-label">NAME</label>
                      <input
                        type="text"
                        className="sr-step2-input"
                        placeholder="Lead passenger name"
                        value={leadName}
                        onChange={(e) => setLeadName(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* 4. Local Contact Person */}
                  <div className="sr-step2-section">
                    <h3 className="sr-step2-section-title">
                      Local Contact Person
                    </h3>
                    <div className="sr-step2-grid-2col">
                      <div className="sr-step2-field">
                        <label className="sr-step2-field-label">NAME</label>
                        <input
                          type="text"
                          className="sr-step2-input"
                          placeholder="Local contact name"
                          value={localContactName}
                          onChange={(e) =>
                            setLocalContactPersonName(e.target.value)
                          }
                        />
                      </div>

                      <div className="sr-step2-field">
                        <label className="sr-step2-field-label">E-MAIL</label>
                        <input
                          type="email"
                          className="sr-step2-input"
                          placeholder="Local contact email"
                          value={localContactEmail}
                          onChange={(e) =>
                            setLocalContactEmail(e.target.value)
                          }
                        />
                      </div>

                      <div className="sr-step2-field">
                        <label className="sr-step2-field-label">
                          CONTACT NUMBER
                        </label>
                        <input
                          type="text"
                          className="sr-step2-input"
                          placeholder="Local contact phone"
                          value={localContactNumber}
                          onChange={(e) =>
                            setLocalContactNumber(e.target.value)
                          }
                        />
                      </div>

                      <div className="sr-step2-field">
                        <label className="sr-step2-field-label">
                          ORGANISATION
                        </label>
                        <input
                          type="text"
                          className="sr-step2-input"
                          placeholder="Company / Organisation name"
                          value={localOrganisation}
                          onChange={(e) =>
                            setLocalOrganisation(e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* 5. Details of Visitors */}
                  <div className="sr-step2-section">
                    <h3 className="sr-step2-section-title">
                      Details of Visitors
                    </h3>
                    {/* Visitor 1 */}
                    <div className="sr-step2-grid-2col">
                      <div className="sr-step2-field">
                        <label className="sr-step2-field-label">NAME</label>
                        <input
                          type="text"
                          className="sr-step2-input"
                          placeholder="Visitor 1 name"
                          value={visitor1Name}
                          onChange={(e) => setVisitor1Name(e.target.value)}
                        />
                      </div>

                      <div className="sr-step2-field">
                        <label className="sr-step2-field-label">ID NO.</label>
                        <input
                          type="text"
                          className="sr-step2-input"
                          placeholder="Visitor 1 ID / NIC"
                          value={visitor1Id}
                          onChange={(e) => setVisitor1Id(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Visitor 2 */}
                    <div className="sr-step2-grid-2col">
                      <div className="sr-step2-field">
                        <label className="sr-step2-field-label">NAME</label>
                        <input
                          type="text"
                          className="sr-step2-input"
                          placeholder="Visitor 2 name"
                          value={visitor2Name}
                          onChange={(e) => setVisitor2Name(e.target.value)}
                        />
                      </div>

                      <div className="sr-step2-field">
                        <label className="sr-step2-field-label">ID NO.</label>
                        <input
                          type="text"
                          className="sr-step2-input"
                          placeholder="Visitor 2 ID / NIC"
                          value={visitor2Id}
                          onChange={(e) => setVisitor2Id(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Vehicle No */}
                    <div
                      className="sr-step2-field"
                      style={{ maxWidth: "48.5%" }}
                    >
                      <label className="sr-step2-field-label">
                        VEHICLE NO(S).
                      </label>
                      <input
                        type="text"
                        className="sr-step2-input"
                        placeholder="e.g. WP CAB-1234"
                        value={vehicleNos}
                        onChange={(e) => setVehicleNos(e.target.value)}
                      />
                    </div>

                    {/* Comments or Requirement */}
                    <div className="sr-step2-field">
                      <label className="sr-step2-field-label">
                        COMMENTS OR REQUIREMENT
                      </label>
                      <textarea
                        className="sr-step2-textarea"
                        placeholder="Special requirements, notes for airport duty staff..."
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* 6. Terms Checkbox */}
                  <label className="sr-step2-terms">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                    />
                    <span>
                      I agree to the{" "}
                      <a
                        href="#terms"
                        onClick={(e) => {
                          e.preventDefault();
                          alert(
                            "Silk Route Terms & Conditions: Guests are accommodated in accordance with AASL airport security, customs and immigration protocols."
                          );
                        }}
                      >
                        Terms and Conditions
                      </a>
                    </span>
                  </label>

                  {/* 7. Submit Button */}
                  <div className="sr-step2-submit-row">
                    <button type="submit" className="sr-step2-submit-btn">
                      SUBMIT
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Step 1: Flight Schedule & Package Reservation Page */
              <>
                {/* Header & Breadcrumb Bar */}
                <div className="sr-res-header-bar">
                  <div className="sr-res-header-left">
                    <button
                      className="sr-res-back-btn"
                      onClick={() => {
                        if (onNavigate) onNavigate("add-new-reservation");
                        navigate("/packages");
                      }}
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
                  <div className="sr-res-breadcrumbs">
                    <Link to="/dashboard">Dashboard</Link>
                    <span className="separator">/</span>
                    <Link to="/packages">Packages</Link>
                    <span className="separator">/</span>
                    <span>Flight Details</span>
                  </div>

                </div>

                {/* Two-Column Reservation Page Layout */}
                <div className="sr-res-grid">
                  {/* Left Column: The Reservation Form */}
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
                            <circle cx="12" cy="12" r="10" />
                            <path d="m10 8 4 4-4 4" />
                          </svg>
                          <span>SILK</span>
                        </div>
                      </div>
                    </div>

                    {/* Sub-Bar */}
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
                      <span className="sr-res-badge-tag">
                        {selectedPkg.badge}
                      </span>
                    </div>

                    {/* Validation Error Message */}
                    {validationError && (
                      <div className="sr-ruby-error-banner">
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

                    {/* Reservation Form (Only Flight Details & Pax Count) */}
                    <form
                      onSubmit={handleProceedToPassengerDetails}
                      className="sr-res-form"
                    >
                      <div
                        className={`sr-res-columns ${
                          !hasArrival || !hasDeparture ? "is-single-col" : ""
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
                                    if (
                                      departureDate &&
                                      departureDate < newArrival
                                    ) {
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
                                SELECT THE ARRIVAL DATE AND THE TIME OF YOUR
                                FLIGHT
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
                                SELECT THE DEPARTURE DATE AND THE TIME OF YOUR
                                FLIGHT
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

                      {/* Number of Passengers */}
                      <div className="sr-ruby-pax-section">
                        <label
                          className="sr-ruby-label"
                          htmlFor="sr-ruby-pax"
                        >
                          Number of passengers*
                        </label>
                        <div className="sr-ruby-select-wrap">
                          <select
                            id="sr-ruby-pax"
                            className="sr-ruby-select"
                            value={paxCount}
                            onChange={(e) =>
                              setPaxCount(Number(e.target.value))
                            }
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map(
                              (num) => (
                                <option key={num} value={num}>
                                  {num} {num === 1 ? "Passenger" : "Passengers"}
                                </option>
                              )
                            )}
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

                      {/* Actions Row */}
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
                          onClick={() => {
                            if (onNavigate) onNavigate("add-new-reservation");
                            navigate("/packages");
                          }}
                        >
                          Cancel
                        </button>

                      </div>

                      {/* Disclaimers & Notes */}
                      <div className="sr-ruby-footer-notes">
                        <div className="sr-ruby-mandatory-note">
                          All fields marked as * are mandatory
                        </div>
                        <div className="sr-ruby-disclaimer-note">
                          <strong>Note:</strong> Guests are allowed to stay in
                          the Silk Route Lounges only until formalities are
                          completed.
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Right Column: Package Overview & Price Breakdown */}
                  <div className="sr-res-sidebar-card">
                    <div className="sr-res-pkg-thumb-wrap">
                      <img
                        src={selectedPkg.image}
                        alt={selectedPkg.name}
                        className="sr-res-pkg-thumb"
                      />
                      <div className="sr-res-pkg-badge-overlay">
                        {selectedPkg.badge}
                      </div>
                    </div>

                    <div className="sr-res-sidebar-body">
                      <div className="sr-res-pkg-title-area">
                        <h3>{selectedPkg.name}</h3>
                        <p>{selectedPkg.subtitle}</p>
                      </div>

                      {/* Package Switcher */}
                      <div className="sr-res-pkg-switcher">
                        <label htmlFor="package-select">Selected Package</label>
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

                      {/* Inclusions */}
                      <div className="sr-res-inclusions-list">
                        <div className="sr-res-inclusions-label">
                          Included Services
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

                      {/* Pricing Breakdown Card */}
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
                          <span>VIP Lounge &amp; Formalities</span>
                          <span style={{ color: "#16a34a", fontWeight: 700 }}>
                            Included
                          </span>
                        </div>
                        <div className="sr-res-pricing-row is-total">
                          <span>Total Payable</span>
                          <span className="price-tag">
                            ${selectedPkg.price * paxCount} USD
                          </span>
                        </div>
                      </div>

                      {/* Assistance contact card */}
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
                          <span>
                            +94 11 225 2861 ext. 3320 &bull; 24 Hours
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
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
    </div>
  );
}
