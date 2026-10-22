import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import "../styles/Dashboard.css";
import "../styles/EditConfirmed.css";

// Helper to convert date to YYYY-MM-DD for date inputs
function toDateInputValue(val) {
  if (!val) return "";
  const s = String(val).trim();
  if (
    !s ||
    s === "-" ||
    s.startsWith("00-00-0000") ||
    s.startsWith("0000-00-00") ||
    s.includes("1899") ||
    s.includes("1900")
  ) {
    return "";
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const parts = s.split("-");
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }
  const d = new Date(s);
  if (!isNaN(d.getTime()) && d.getFullYear() >= 2000) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return "";
}

export default function EditConfirmed({
  user,
  onLogout,
  onNavigate,
  reservationId: propReservationId,
  initialData,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Confirmed reservations list for selection dropdown
  const [confirmedList, setConfirmedList] = useState([]);
  const [selectedId, setSelectedId] = useState(() => {
    return (
      propReservationId ||
      location.state?.reservationId ||
      initialData?.id ||
      ""
    );
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailsLoaded, setDetailsLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Reservation Form State
  const [formData, setFormData] = useState({
    cip_id: "",
    packageCode: "E",
    refNo: "186127-ONL-PKG-E",
    packageName: "Topaz Departure Package",
    arrivalDate: "",
    arrivalTime: "",
    arrivalFlightNo: "",
    arrivalStayHrs: "0",
    departureDate: "2026-09-11",
    departureTime: "13:10",
    departureFlightNo: "UL 503",
    departureStayHrs: "0",
    numberOfPassengers: 1,
    leadPassengerName: "T D Wijekoon",
    leadEmail: "tharindri.wijekoon@gmail.com",
    leadPhone: "+94773593192",
    localContactName: "Chandana Wijekoon",
    localContactPhone: "+94777369043",
    localContactEmail: "chandanawijekoon@gmail.com",
    localOrganisation: "",
    visitor1Name: "Chandana Wijekoon",
    visitor1Id: "580441475V",
    visitor2Name: "Ranmini Wijekoon",
    visitor2Id: "647531300V",
    vehicleNos: "CP CBH 0332, CAA 7096",
    comments: "",
    amount: "17320.00",
    currency: "Rs.",
    paymentRef: "",
    passengers: [
      {
        name: "Dr. T D Wijekoon",
        Passport_number: "N9796200",
        Refreshments: "",
      },
    ],
  });

  // 1. Fetch available confirmed reservations to populate the selection dropdown
  useEffect(() => {
    const fetchList = async () => {
      try {
        const response = await fetch("http://localhost:4000/api/reservations/confirmed?limit=100");
        const json = await response.json();
        if (!response.ok || !json.success || !Array.isArray(json.data)) {
          throw new Error(json.error || "Failed to load confirmed reservations.");
        }
        setConfirmedList(json.data);
        if (!selectedId && json.data.length > 0) {
          setSelectedId(json.data[0].id);
        } else if (json.data.length === 0) {
          setErrorMsg("No confirmed reservations are available to edit.");
        }
      } catch (err) {
        console.warn("Could not fetch confirmed reservations list:", err);
        setErrorMsg(err.message || "Failed to load confirmed reservations.");
      }
    };
    fetchList();
  }, [selectedId]);

  // 2. Fetch specific reservation details when selectedId changes
  useEffect(() => {
    if (!selectedId) return;

    let isMounted = true;
    const loadDetails = async () => {
      setLoading(true);
      setDetailsLoaded(false);
      setErrorMsg("");
      try {
        const response = await fetch(`http://localhost:4000/api/reservations/${selectedId}`);
        const json = await response.json();
        if (!response.ok || !json.success || !json.reservation) {
          throw new Error(json.error || "Failed to load reservation details.");
        }
        if (isMounted) {
            const r = json.reservation;
            const paxList =
              Array.isArray(json.passengers) && json.passengers.length > 0
                ? json.passengers
                : [
                    {
                      name: r.proffession || "Dr. T D Wijekoon",
                      Passport_number: r.passportNo || "N9796200",
                      Refreshments: r.refreshment || "",
                    },
                  ];

            let v1Name = r.visitor1 || "";
            let v1Id = r.visitor1_id || "";
            if (v1Name.includes("/") && !v1Id) {
              const parts = v1Name.split("/");
              v1Name = parts[0].trim();
              v1Id = parts[1].trim();
            }

            let v2Name = r.visitor2 || "";
            let v2Id = r.visitor2_id || "";
            if (v2Name.includes("/") && !v2Id) {
              const parts = v2Name.split("/");
              v2Name = parts[0].trim();
              v2Id = parts[1].trim();
            }

            const rawPkg = r.Package || "E";
            let displayPkg = "Topaz Departure Package";
            if (rawPkg === "A" || rawPkg === "Diamond") displayPkg = "Diamond Package";
            else if (rawPkg === "B" || rawPkg === "Gold") displayPkg = "Gold Package";
            else if (rawPkg === "C" || rawPkg === "Silver") displayPkg = "Silver Package";
            else if (rawPkg === "D") displayPkg = "Topaz Arrival Package";
            else if (rawPkg === "E" || rawPkg === "Topaz") displayPkg = "Topaz Departure Package";
            else if (rawPkg === "F") displayPkg = "Garnet Package";

            setFormData({
              cip_id: r.cip_id,
              packageCode: String(rawPkg).toUpperCase() === "TOPAZ" ? "E" : String(rawPkg).toUpperCase(),
              refNo: r.Ref_no || `${r.cip_id}-ONL-PKG-${rawPkg}`,
              packageName: displayPkg,
              arrivalDate: toDateInputValue(r.Arrival_date),
              arrivalTime: r.Arrival_time || "",
              arrivalFlightNo: r.Arrv_Flight_no || "",
              arrivalStayHrs: r.arrv_hourse !== undefined && r.arrv_hourse !== null ? String(r.arrv_hourse) : "0",
              departureDate: toDateInputValue(r.Departure_date),
              departureTime: r.Departure_time || "",
              departureFlightNo: r.Dept_Flight_no || "",
              departureStayHrs: r.dept_hourse !== undefined && r.dept_hourse !== null ? String(r.dept_hourse) : "0",
              numberOfPassengers: r.Number_Of_Passengers || paxList.length || 1,
              leadPassengerName: r.proffession || paxList[0]?.name || "",
              leadEmail: r.E_mail || "",
              leadPhone: r.Telephone || "",
              localContactName: r.Local_contact_name || "",
              localContactPhone: r.Local_contact_tp || "",
              localContactEmail: r.Local_email || "",
              localOrganisation: r.Local_company || "",
              visitor1Name: v1Name || "",
              visitor1Id: v1Id || "",
              visitor2Name: v2Name || "",
              visitor2Id: v2Id || "",
              vehicleNos: r.vehicle_no || "",
              comments: r.Comments || "",
              amount: r.Amount_New || r.Amount || "0.00",
              currency: (r.Currency_Type || "Rs.").trim(),
              paymentRef: r.payment_ref || "",
              passengers: paxList,
            });
            setDetailsLoaded(true);
        }
      } catch (err) {
        console.error("Could not load confirmed reservation details:", err);
        if (isMounted) {
          setErrorMsg(err.message || "Failed to load reservation details.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDetails();
    return () => {
      isMounted = false;
    };
  }, [selectedId]);

  // Handle passenger input changes
  const handlePassengerChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.passengers];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, passengers: updated };
    });
  };

  const handleAddPassenger = () => {
    setFormData((prev) => ({
      ...prev,
      passengers: [
        ...prev.passengers,
        { name: "", Passport_number: "", Refreshments: "" },
      ],
      numberOfPassengers: prev.passengers.length + 1,
    }));
  };

  const handleRemovePassenger = (index) => {
    if (formData.passengers.length <= 1) return;
    setFormData((prev) => {
      const updated = prev.passengers.filter((_, idx) => idx !== index);
      return {
        ...prev,
        passengers: updated,
        numberOfPassengers: updated.length,
      };
    });
  };

  // Handle Save / Confirm Form Update
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!detailsLoaded) {
      setErrorMsg("Reservation details have not loaded. Please refresh and try again.");
      return;
    }
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const idToUpdate = formData.cip_id || selectedId;
      if (!idToUpdate) {
        throw new Error("No reservation selected to update.");
      }

      const payload = {
        arrivalDate: formData.arrivalDate || "0000-00-00",
        ...(["D", "E"].includes(String(formData.packageCode).toUpperCase())
          ? { packageCode: formData.packageCode }
          : {}),
        arrivalTime: formData.arrivalTime,
        arrivalFlightNo: formData.arrivalFlightNo,
        arrivalStayHrs: formData.arrivalStayHrs,
        departureDate: formData.departureDate || "0000-00-00",
        departureTime: formData.departureTime,
        departureFlightNo: formData.departureFlightNo,
        departureStayHrs: formData.departureStayHrs,
        numberOfPassengers: formData.numberOfPassengers,
        leadPassengerName: formData.leadPassengerName,
        leadEmail: formData.leadEmail,
        leadPhone: formData.leadPhone,
        localContactName: formData.localContactName,
        localContactPhone: formData.localContactPhone,
        localContactEmail: formData.localContactEmail,
        localOrganisation: formData.localOrganisation,
        visitor1Name: formData.visitor1Name,
        visitor1Id: formData.visitor1Id,
        visitor2Name: formData.visitor2Name,
        visitor2Id: formData.visitor2Id,
        vehicleNos: formData.vehicleNos,
        comments: formData.comments,
        passengers: formData.passengers,
        updatedBy: user?.username || user?.name || "Administrator",
      };

      const response = await fetch(
        `http://localhost:4000/api/reservations/confirmed/${idToUpdate}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || "Failed to update confirmed reservation.");
      }

      // Also update local storage if available
      try {
        const saved = localStorage.getItem("silkroute_confirmed_reservations");
        if (saved) {
          const list = JSON.parse(saved);
          const updated = list.map((item) => {
            if (item.id === idToUpdate || item.referenceNo === formData.refNo) {
              return {
                ...item,
                passengerName: formData.leadPassengerName,
                arrivalFlightNo: formData.arrivalFlightNo,
                departureFlightNo: formData.departureFlightNo,
                passengerCount: formData.numberOfPassengers,
                comments: formData.comments,
                localContactName: formData.localContactName,
                localContactPhone: formData.localContactPhone,
              };
            }
            return item;
          });
          localStorage.setItem("silkroute_confirmed_reservations", JSON.stringify(updated));
        }
      } catch (err) {
        console.error(err);
      }

      setSuccessMsg("Confirmed reservation has been successfully updated!");
      setTimeout(() => {
        setSuccessMsg("");
      }, 5000);
    } catch (err) {
      setErrorMsg(err.message || "Failed to update reservation details.");
    } finally {
      setSaving(false);
    }
  };

  const formattedAmount = `${formData.currency} ${parseFloat(formData.amount || 0).toFixed(2)}`;

  return (
    <div className="sr-app">
      <Sidebar
        active="edit-confirm-reservations"
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

        <main className="sr-content">
          <div className="sr-editconf-page-wrap">
            <div className="sr-editconf-card-modern">
              {/* 1. Silk Route Dual-Tone Header Banner matching project design */}
              <div className="sr-editconf-banner">
                <div className="sr-editconf-banner-tab">
                  <div className="sr-editconf-plane-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                    </svg>
                  </div>
                  <h2 className="sr-editconf-banner-title">
                    Update Booking Details — {formData.packageName}
                  </h2>
                </div>
                <div className="sr-editconf-banner-right">
                  <div className="sr-editconf-silk-emblem">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span>SILK ROUTE</span>
                  </div>
                </div>
              </div>

              {/* 2. Sub-strip with Back / User Greeting / Logout */}
              <div className="sr-editconf-substrip">
                <button
                  type="button"
                  className="sr-editconf-back-btn"
                  onClick={() => navigate("/reservation-confirmed")}
                >
                  &larr; Back to Confirmed Reservations
                </button>

                <div className="sr-editconf-user-info">
                  <span className="greeting">Welcome {user?.username || "Administrator"}</span>
                  <span className="divider">|</span>
                  <button
                    type="button"
                    className="sr-editconf-logout-btn-link"
                    onClick={onLogout}
                  >
                    Log out
                  </button>
                </div>
              </div>

              {/* 3. Selector Toolbar for picking Confirmed Booking */}
              <div className="sr-editconf-picker-bar">
                <div className="sr-editconf-picker-group">
                  <label htmlFor="selectConfirmedBooking" className="sr-editconf-picker-label">
                    Select Reservation:
                  </label>
                  <select
                    id="selectConfirmedBooking"
                    className="sr-editconf-select-input"
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                  >
                    {confirmedList.map((res) => (
                      <option key={res.id} value={res.id}>
                        {res.referenceNo} — {res.passengerName} ({res.package})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4. Main Body */}
              <div className="sr-editconf-body-modern">
                {/* Reference Strip */}
                <div className="sr-editconf-ref-strip">
                  <div className="sr-editconf-ref-left">
                    <span className="sr-editconf-ref-tag">Booking Reference:</span>
                    <span className="sr-editconf-ref-val">{formData.refNo}</span>
                  </div>
                  <div className="sr-editconf-status-pill">
                    <span className="sr-editconf-status-dot" />
                    Confirmed Reservation
                  </div>
                </div>

                {/* Info Callout */}
                <div className="sr-editconf-callout">
                  <div className="sr-editconf-callout-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </div>
                  <div className="sr-editconf-callout-text">
                    <h4>Edit Confirmed Reservation</h4>
                    <p>Modify flight schedules, passenger details, contacts, or visitor information.</p>
                  </div>
                </div>

                {successMsg && (
                  <div className="sr-editconf-alert-banner success">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{successMsg}</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="sr-editconf-alert-banner error">
                    <span>{errorMsg}</span>
                  </div>
                )}

                {loading ? (
                  <div style={{ padding: "40px 0", textAlign: "center", color: "#64748b" }}>
                    Loading booking details...
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    {/* Section 1: Passenger Details Table */}
                    <div className="sr-editconf-section-modern">
                      <div className="sr-editconf-section-heading">
                        <span>Passenger Details</span>
                        <button
                          type="button"
                          className="sr-editconf-pax-btn"
                          onClick={handleAddPassenger}
                        >
                          + Add Passenger
                        </button>
                      </div>

                      <table className="sr-editconf-table-modern">
                        <thead>
                          <tr>
                            <th style={{ width: "42%" }}>Passenger Name</th>
                            <th style={{ width: "28%" }}>Passport No.</th>
                            <th style={{ width: "24%" }}>Refreshments</th>
                            <th style={{ width: "6%", textAlign: "center" }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.passengers.map((pax, idx) => (
                            <tr key={idx}>
                              <td>
                                <input
                                  type="text"
                                  className="sr-editconf-input-clean"
                                  placeholder="Full Name"
                                  value={pax.name || ""}
                                  onChange={(e) =>
                                    handlePassengerChange(idx, "name", e.target.value)
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="sr-editconf-input-clean"
                                  placeholder="Passport No"
                                  value={pax.Passport_number || pax.passportNo || ""}
                                  onChange={(e) =>
                                    handlePassengerChange(idx, "Passport_number", e.target.value)
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="sr-editconf-input-clean"
                                  placeholder="Refreshment details"
                                  value={pax.Refreshments || pax.refreshment || ""}
                                  onChange={(e) =>
                                    handlePassengerChange(idx, "Refreshments", e.target.value)
                                  }
                                />
                              </td>
                              <td style={{ textAlign: "center" }}>
                                {formData.passengers.length > 1 && (
                                  <button
                                    type="button"
                                    className="sr-editconf-delete-pax-btn"
                                    title="Remove Passenger"
                                    onClick={() => handleRemovePassenger(idx)}
                                  >
                                    &times;
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Section 2: Arrival & Departure Details (Modern Cards Grid) */}
                    <div className="sr-editconf-section-modern">
                      {["D", "E"].includes(String(formData.packageCode).toUpperCase()) && (
                        <div
                          className="sr-editconf-field-group"
                          style={{ maxWidth: "360px", marginBottom: "18px" }}
                        >
                          <label htmlFor="editConfirmedTopazPackage">Topaz Package</label>
                          <select
                            id="editConfirmedTopazPackage"
                            className="sr-editconf-input-clean"
                            value={formData.packageCode}
                            onChange={(e) => {
                              const packageCode = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                packageCode,
                                packageName:
                                  packageCode === "D"
                                    ? "Topaz Arrival Package"
                                    : "Topaz Departure Package",
                              }));
                            }}
                          >
                            <option value="D">Topaz Arrival</option>
                            <option value="E">Topaz Departure</option>
                          </select>
                        </div>
                      )}
                      <div className="sr-editconf-flight-grid">
                        {/* Arrival Card */}
                        <div className="sr-editconf-flight-card arrival">
                          <div className="sr-editconf-flight-header">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 22h20" />
                              <path d="M3.77 10.77 2 9l2-4 1.1.55a2 2 0 0 1 1.1 1.45l.4 4 5.3 1.1 1.9-8.1 2.15.9-1.4 8.2 4.45 1a2 2 0 0 1 1.5 2.4 2 2 0 0 1-2.4 1.5L3.77 10.77Z" />
                            </svg>
                            <span>Arrival Details</span>
                          </div>

                          <div className="sr-editconf-form-grid">
                            <div className="sr-editconf-field-group">
                              <label>Date of Arrival</label>
                              <input
                                type="date"
                                className="sr-editconf-input-clean"
                                value={formData.arrivalDate}
                                onChange={(e) =>
                                  setFormData({ ...formData, arrivalDate: e.target.value })
                                }
                              />
                            </div>

                            <div className="sr-editconf-field-group">
                              <label>Estimated Time (ETA)</label>
                              <input
                                type="text"
                                className="sr-editconf-input-clean"
                                placeholder="HH:MM"
                                value={formData.arrivalTime}
                                onChange={(e) =>
                                  setFormData({ ...formData, arrivalTime: e.target.value })
                                }
                              />
                            </div>

                            <div className="sr-editconf-field-group">
                              <label>Flight No.</label>
                              <input
                                type="text"
                                className="sr-editconf-input-clean"
                                placeholder="UL 101"
                                value={formData.arrivalFlightNo}
                                onChange={(e) =>
                                  setFormData({ ...formData, arrivalFlightNo: e.target.value })
                                }
                              />
                            </div>

                            <div className="sr-editconf-field-group">
                              <label>Stay Hours</label>
                              <input
                                type="text"
                                className="sr-editconf-input-clean"
                                value={formData.arrivalStayHrs}
                                onChange={(e) =>
                                  setFormData({ ...formData, arrivalStayHrs: e.target.value })
                                }
                              />
                            </div>
                          </div>
                        </div>

                        {/* Departure Card */}
                        <div className="sr-editconf-flight-card departure">
                          <div className="sr-editconf-flight-header">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 22h20" />
                              <path d="M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l3.6 1.8 5-2-3.6-7.3 2.15-.9 5.8 5.6 4.35-1.75a2 2 0 0 1 2.6 1.1 2 2 0 0 1-1.1 2.6L6.36 17.4Z" />
                            </svg>
                            <span>Departure Details</span>
                          </div>

                          <div className="sr-editconf-form-grid">
                            <div className="sr-editconf-field-group">
                              <label>Date of Departure</label>
                              <input
                                type="date"
                                className="sr-editconf-input-clean"
                                value={formData.departureDate}
                                onChange={(e) =>
                                  setFormData({ ...formData, departureDate: e.target.value })
                                }
                              />
                            </div>

                            <div className="sr-editconf-field-group">
                              <label>Estimated Time (ETD)</label>
                              <input
                                type="text"
                                className="sr-editconf-input-clean"
                                placeholder="HH:MM"
                                value={formData.departureTime}
                                onChange={(e) =>
                                  setFormData({ ...formData, departureTime: e.target.value })
                                }
                              />
                            </div>

                            <div className="sr-editconf-field-group">
                              <label>Flight No.</label>
                              <input
                                type="text"
                                className="sr-editconf-input-clean"
                                placeholder="UL 503"
                                value={formData.departureFlightNo}
                                onChange={(e) =>
                                  setFormData({ ...formData, departureFlightNo: e.target.value })
                                }
                              />
                            </div>

                            <div className="sr-editconf-field-group">
                              <label>Stay Hours</label>
                              <input
                                type="text"
                                className="sr-editconf-input-clean"
                                value={formData.departureStayHrs}
                                onChange={(e) =>
                                  setFormData({ ...formData, departureStayHrs: e.target.value })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Lead Passenger Details */}
                    <div className="sr-editconf-section-modern">
                      <div className="sr-editconf-section-heading">Lead Passenger Information</div>
                      <div className="sr-editconf-form-grid">
                        <div className="sr-editconf-field-group">
                          <label>Lead Passenger Name <span className="required">*</span></label>
                          <input
                            type="text"
                            className="sr-editconf-input-clean"
                            value={formData.leadPassengerName}
                            onChange={(e) =>
                              setFormData({ ...formData, leadPassengerName: e.target.value })
                            }
                          />
                        </div>

                        <div className="sr-editconf-field-group">
                          <label>Number of Passengers</label>
                          <input
                            type="number"
                            min="1"
                            className="sr-editconf-input-clean"
                            value={formData.numberOfPassengers}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                numberOfPassengers: parseInt(e.target.value, 10) || 1,
                              })
                            }
                          />
                        </div>

                        <div className="sr-editconf-field-group">
                          <label>E-mail</label>
                          <input
                            type="email"
                            className="sr-editconf-input-clean"
                            value={formData.leadEmail}
                            onChange={(e) =>
                              setFormData({ ...formData, leadEmail: e.target.value })
                            }
                          />
                        </div>

                        <div className="sr-editconf-field-group">
                          <label>Telephone</label>
                          <input
                            type="text"
                            className="sr-editconf-input-clean"
                            value={formData.leadPhone}
                            onChange={(e) =>
                              setFormData({ ...formData, leadPhone: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Local Contact Information */}
                    <div className="sr-editconf-section-modern">
                      <div className="sr-editconf-section-heading">Local Contact Information</div>
                      <div className="sr-editconf-form-grid">
                        <div className="sr-editconf-field-group">
                          <label>Contact Name</label>
                          <input
                            type="text"
                            className="sr-editconf-input-clean"
                            value={formData.localContactName}
                            onChange={(e) =>
                              setFormData({ ...formData, localContactName: e.target.value })
                            }
                          />
                        </div>

                        <div className="sr-editconf-field-group">
                          <label>Telephone</label>
                          <input
                            type="text"
                            className="sr-editconf-input-clean"
                            value={formData.localContactPhone}
                            onChange={(e) =>
                              setFormData({ ...formData, localContactPhone: e.target.value })
                            }
                          />
                        </div>

                        <div className="sr-editconf-field-group">
                          <label>Email</label>
                          <input
                            type="email"
                            className="sr-editconf-input-clean"
                            value={formData.localContactEmail}
                            onChange={(e) =>
                              setFormData({ ...formData, localContactEmail: e.target.value })
                            }
                          />
                        </div>

                        <div className="sr-editconf-field-group">
                          <label>Organisation</label>
                          <input
                            type="text"
                            className="sr-editconf-input-clean"
                            value={formData.localOrganisation}
                            onChange={(e) =>
                              setFormData({ ...formData, localOrganisation: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 5: Details of Visitors & Vehicles */}
                    <div className="sr-editconf-section-modern">
                      <div className="sr-editconf-section-heading">Visitor & Vehicle Details</div>
                      <div className="sr-editconf-form-grid">
                        <div className="sr-editconf-field-group">
                          <label>Visitor 1 Name</label>
                          <input
                            type="text"
                            className="sr-editconf-input-clean"
                            placeholder="Name"
                            value={formData.visitor1Name}
                            onChange={(e) =>
                              setFormData({ ...formData, visitor1Name: e.target.value })
                            }
                          />
                        </div>

                        <div className="sr-editconf-field-group">
                          <label>Visitor 1 ID No.</label>
                          <input
                            type="text"
                            className="sr-editconf-input-clean"
                            placeholder="ID / NIC / Passport"
                            value={formData.visitor1Id}
                            onChange={(e) =>
                              setFormData({ ...formData, visitor1Id: e.target.value })
                            }
                          />
                        </div>

                        <div className="sr-editconf-field-group">
                          <label>Visitor 2 Name</label>
                          <input
                            type="text"
                            className="sr-editconf-input-clean"
                            placeholder="Name"
                            value={formData.visitor2Name}
                            onChange={(e) =>
                              setFormData({ ...formData, visitor2Name: e.target.value })
                            }
                          />
                        </div>

                        <div className="sr-editconf-field-group">
                          <label>Visitor 2 ID No.</label>
                          <input
                            type="text"
                            className="sr-editconf-input-clean"
                            placeholder="ID / NIC / Passport"
                            value={formData.visitor2Id}
                            onChange={(e) =>
                              setFormData({ ...formData, visitor2Id: e.target.value })
                            }
                          />
                        </div>

                        <div className="sr-editconf-field-group" style={{ gridColumn: "1 / -1" }}>
                          <label>Vehicle No(s)</label>
                          <input
                            type="text"
                            className="sr-editconf-input-clean"
                            placeholder="e.g. CP CBH 0332, CAA 7096"
                            value={formData.vehicleNos}
                            onChange={(e) =>
                              setFormData({ ...formData, vehicleNos: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 6: Comments */}
                    <div className="sr-editconf-section-modern">
                      <div className="sr-editconf-section-heading">Your Comments</div>
                      <textarea
                        className="sr-editconf-textarea-modern"
                        placeholder="Enter internal or customer notes..."
                        value={formData.comments}
                        onChange={(e) =>
                          setFormData({ ...formData, comments: e.target.value })
                        }
                      />
                    </div>

                    {/* Section 7: Amount Card */}
                    <div className="sr-editconf-total-card">
                      <div className="sr-editconf-total-label">Confirmed Amount :</div>
                      <div className="sr-editconf-total-val">{formattedAmount}</div>
                    </div>

                    {/* Submit Actions */}
                    <div className="sr-editconf-actions-strip">
                      <button
                        type="button"
                        className="sr-editconf-btn-secondary"
                        onClick={() => navigate("/reservation-confirmed")}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="sr-editconf-btn-primary"
                        disabled={saving || loading || !detailsLoaded}
                      >
                        {saving ? (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="sr-spinner">
                              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                              <path d="M12 2a10 10 0 0 1 10 10" />
                            </svg>
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>Save Changes</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
