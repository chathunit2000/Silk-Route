import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import "../styles/Dashboard.css";
import "../styles/CreateEditUser.css";
import { isAdmin } from "../utils/userRoles";

const TITLE_OPTIONS = ["Mrs", "Mr", "Ms", "Dr", "Rev", "Prof"];

const USER_TYPE_OPTIONS = [
  { label: "User", value: "user" },
  { label: "Admin", value: "admin" },
  { label: "Internal", value: "internal" },
  { label: "External", value: "external" },
  { label: "Finance", value: "fin" },
  { label: "Credit", value: "credit" },
  { label: "Loyalty", value: "loyalty" },
  { label: "Individual", value: "individual" },
];

export default function CreateEditUser({ user, onLogout }) {
  const navigate = useNavigate();

  // Guard: non-admins cannot access this module
  useEffect(() => {
    if (user && !isAdmin(user)) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Active view mode: "add" or "edit"
  const [activeMode, setActiveMode] = useState("add");

  // Registration Form State (Add User - matching screenshot exactly)
  const [formData, setFormData] = useState({
    title: "Mrs",
    nameWithInitials: "",
    epfNo: "",
    desiredLoginName: "",
    password: "",
    rePassword: "",
    email: "",
    contactNo: "",
    userType: "user",
  });

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Edit User State
  const [userList, setUserList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    no: null,
    title: "Mr",
    nameWithInitials: "",
    epfNo: "",
    user_id: "",
    password: "",
    rePassword: "",
    email: "",
    contactNo: "",
    userType: "user",
    status: "Active",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Handle Add User Form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Submit Add User Registration
  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: "", message: "" });

    // Client-side validations
    if (!formData.nameWithInitials.trim()) {
      setFeedback({ type: "error", message: "Name with Initials is mandatory (*)" });
      return;
    }
    if (!formData.epfNo.toString().trim()) {
      setFeedback({ type: "error", message: "EPF No is mandatory (*)" });
      return;
    }
    if (!formData.desiredLoginName.trim()) {
      setFeedback({ type: "error", message: "Desired Login Name is mandatory (*)" });
      return;
    }
    if (!formData.password) {
      setFeedback({ type: "error", message: "Choose a Password is mandatory (*)" });
      return;
    }
    if (formData.password !== formData.rePassword) {
      setFeedback({ type: "error", message: "Passwords do not match. Please re-enter identical passwords." });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("http://localhost:4000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          nameWithInitials: formData.nameWithInitials,
          epfNo: formData.epfNo,
          desiredLoginName: formData.desiredLoginName,
          password: formData.password,
          rePassword: formData.rePassword,
          email: formData.email,
          contactNo: formData.contactNo,
          userType: formData.userType,
          createdBy: user?.name || user?.user_id || "admin",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setFeedback({
          type: "error",
          message: data.error || "Failed to register user. Please try again.",
        });
      } else {
        setFeedback({
          type: "success",
          message: `User '${data.user.user_id}' has been registered successfully!`,
        });
        // Reset form
        setFormData({
          title: "Mrs",
          nameWithInitials: "",
          epfNo: "",
          desiredLoginName: "",
          password: "",
          rePassword: "",
          email: "",
          contactNo: "",
          userType: "user",
        });
      }
    } catch (err) {
      console.error("User registration error:", err);
      setFeedback({
        type: "error",
        message: "Network error connecting to backend service. Please check your connection.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch Users for Edit Mode
  const fetchUsers = useCallback(async (search = "") => {
    setLoadingUsers(true);
    try {
      const url = new URL("http://localhost:4000/api/users");
      url.searchParams.set("limit", "50");
      if (search.trim()) {
        url.searchParams.set("search", search.trim());
      }

      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.users)) {
          setUserList(data.users);
        }
      }
    } catch (err) {
      console.error("Failed to fetch user list:", err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Trigger user fetch when switching to Edit mode
  useEffect(() => {
    if (activeMode === "edit") {
      fetchUsers(searchQuery);
    }
  }, [activeMode, fetchUsers, searchQuery]);

  // Open Edit Modal for a selected user
  const handleOpenEditUser = (usr) => {
    // Extract title if present in id_name (e.g., "Mr. John Doe")
    let detectedTitle = "Mr";
    let cleanedName = usr.id_name || "";
    for (const t of TITLE_OPTIONS) {
      if (cleanedName.toLowerCase().startsWith(t.toLowerCase())) {
        detectedTitle = t;
        cleanedName = cleanedName.replace(new RegExp(`^${t}\\.?\\s*`, "i"), "");
        break;
      }
    }

    setEditFormData({
      no: usr.no,
      title: detectedTitle,
      nameWithInitials: cleanedName,
      epfNo: usr.epf_no || "",
      user_id: usr.user_id || "",
      password: "",
      rePassword: "",
      email: usr.email || "",
      contactNo: usr.tele || "",
      userType: (usr.user_type || "user").toLowerCase(),
      status: usr.Status || "Active",
    });
    setIsEditModalOpen(true);
  };

  // Save Edit User Changes
  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!editFormData.nameWithInitials.trim()) {
      alert("Name with Initials is mandatory.");
      return;
    }
    if (editFormData.password && editFormData.password !== editFormData.rePassword) {
      alert("Passwords do not match.");
      return;
    }

    setSavingEdit(true);
    try {
      const response = await fetch(`http://localhost:4000/api/users/${editFormData.no}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editFormData.title,
          nameWithInitials: editFormData.nameWithInitials,
          epfNo: editFormData.epfNo,
          password: editFormData.password,
          rePassword: editFormData.rePassword,
          email: editFormData.email,
          contactNo: editFormData.contactNo,
          userType: editFormData.userType,
          status: editFormData.status,
          updatedBy: user?.name || user?.user_id || "admin",
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        alert(data.error || "Failed to update user.");
      } else {
        alert(`User '${editFormData.user_id}' updated successfully!`);
        setIsEditModalOpen(false);
        fetchUsers(searchQuery);
      }
    } catch (err) {
      console.error("Error updating user:", err);
      alert("Network error updating user.");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="sr-app">
      <Sidebar
        active="create-edit-user"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
      />

      <div className="sr-main">
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onLogout={onLogout}
          user={user}
        />

        <main className="sr-content">
          <div className="sr-user-page">
            {/* Top Bar with Title, Breadcrumbs, and Add User / Edit User Action Buttons */}
            <div className="sr-user-header-bar">
              <div className="sr-user-header-left">
                <button
                  className="sr-back-btn"
                  onClick={() => navigate(-1)}
                  type="button"
                  title="Go back"
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
                  <span>&lt; BACK</span>
                </button>

                <div className="sr-user-title-wrap">
                  <h2>User Administration</h2>
                  <p>Register new airport staff and manage existing user accounts</p>
                </div>
              </div>

              {/* Two Buttons: Add User & Edit User */}
              <div className="sr-user-mode-switcher">
                <button
                  type="button"
                  className={`sr-user-mode-btn ${activeMode === "add" ? "active" : ""}`}
                  onClick={() => {
                    setActiveMode("add");
                    setFeedback({ type: "", message: "" });
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                  <span>Add User</span>
                </button>

                <button
                  type="button"
                  className={`sr-user-mode-btn ${activeMode === "edit" ? "active" : ""}`}
                  onClick={() => {
                    setActiveMode("edit");
                    fetchUsers(searchQuery);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  <span>Edit User</span>
                </button>
              </div>
            </div>

            {/* ==========================================================
                MODE 1: ADD USER (Exact match to official user screenshot)
               ========================================================== */}
            {activeMode === "add" && (
              <div className="sr-registration-card-wrap">
                <div className="sr-registration-card">
                  {/* Top Bar: "User Registration" */}
                  <div className="sr-registration-header">
                    <h3>User Registration</h3>
                  </div>

                  {/* Body with soft sky blue gradient background */}
                  <div className="sr-registration-body">
                    {/* Feedback Messages */}
                    {feedback.message && (
                      <div className={`sr-alert-banner ${feedback.type === "success" ? "sr-alert-success" : "sr-alert-error"}`}>
                        <span>{feedback.message}</span>
                        <button
                          type="button"
                          className="sr-alert-close"
                          onClick={() => setFeedback({ type: "", message: "" })}
                        >
                          &times;
                        </button>
                      </div>
                    )}

                    {/* Blue Mandatory Notice with red asterisk */}
                    <div className="sr-registration-notice">
                      All fields marked as <span className="asterisk">*</span> are mandatory
                    </div>

                    {/* Registration Form matching screenshot 100% */}
                    <form className="sr-registration-form" onSubmit={handleAddUserSubmit}>
                      {/* Row 1: Title */}
                      <div className="sr-form-row">
                        <label className="sr-form-label" htmlFor="sr-user-title">
                          Title
                        </label>
                        <div className="sr-form-control-wrap">
                          <select
                            id="sr-user-title"
                            name="title"
                            className="sr-input-base sr-input-title"
                            value={formData.title}
                            onChange={handleInputChange}
                          >
                            {TITLE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Row 2: Name with Initials * */}
                      <div className="sr-form-row">
                        <label className="sr-form-label" htmlFor="sr-user-name">
                          Name with Initials <span className="asterisk">*</span>
                        </label>
                        <div className="sr-form-control-wrap">
                          <input
                            id="sr-user-name"
                            type="text"
                            name="nameWithInitials"
                            className="sr-input-base sr-input-name"
                            value={formData.nameWithInitials}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>

                      {/* Row 3: EPF No * */}
                      <div className="sr-form-row">
                        <label className="sr-form-label" htmlFor="sr-user-epf">
                          EPF No <span className="asterisk">*</span>
                        </label>
                        <div className="sr-form-control-wrap">
                          <input
                            id="sr-user-epf"
                            type="text"
                            name="epfNo"
                            className="sr-input-base sr-input-epf"
                            value={formData.epfNo}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>

                      {/* Row 4: Desired Login Name * */}
                      <div className="sr-form-row">
                        <label className="sr-form-label" htmlFor="sr-user-login">
                          Desired Login Name <span className="asterisk">*</span>
                        </label>
                        <div className="sr-form-control-wrap">
                          <input
                            id="sr-user-login"
                            type="text"
                            name="desiredLoginName"
                            className="sr-input-base sr-input-login"
                            placeholder="admin"
                            value={formData.desiredLoginName}
                            onChange={handleInputChange}
                            autoComplete="off"
                            required
                          />
                        </div>
                      </div>

                      {/* Row 5: Choose a Password * */}
                      <div className="sr-form-row">
                        <label className="sr-form-label" htmlFor="sr-user-password">
                          Choose a Password <span className="asterisk">*</span>
                        </label>
                        <div className="sr-form-control-wrap">
                          <input
                            id="sr-user-password"
                            type="password"
                            name="password"
                            className="sr-input-base sr-input-password"
                            value={formData.password}
                            onChange={handleInputChange}
                            autoComplete="new-password"
                            required
                          />
                        </div>
                      </div>

                      {/* Row 6: Re-enter password * */}
                      <div className="sr-form-row">
                        <label className="sr-form-label" htmlFor="sr-user-repassword">
                          Re-enter password <span className="asterisk">*</span>
                        </label>
                        <div className="sr-form-control-wrap">
                          <input
                            id="sr-user-repassword"
                            type="password"
                            name="rePassword"
                            className="sr-input-base sr-input-password"
                            value={formData.rePassword}
                            onChange={handleInputChange}
                            autoComplete="new-password"
                            required
                          />
                        </div>
                      </div>

                      {/* Row 7: Email address */}
                      <div className="sr-form-row">
                        <label className="sr-form-label" htmlFor="sr-user-email">
                          Email address
                        </label>
                        <div className="sr-form-control-wrap">
                          <input
                            id="sr-user-email"
                            type="email"
                            name="email"
                            className="sr-input-base sr-input-email"
                            value={formData.email}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>

                      {/* Row 8: Contanct No. (preserved exact spelling from screenshot) */}
                      <div className="sr-form-row">
                        <label className="sr-form-label" htmlFor="sr-user-contact">
                          Contanct No.
                        </label>
                        <div className="sr-form-control-wrap">
                          <input
                            id="sr-user-contact"
                            type="text"
                            name="contactNo"
                            className="sr-input-base sr-input-contact"
                            value={formData.contactNo}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>

                      {/* Row 9: User Type */}
                      <div className="sr-form-row">
                        <label className="sr-form-label" htmlFor="sr-user-type">
                          User Type
                        </label>
                        <div className="sr-form-control-wrap">
                          <select
                            id="sr-user-type"
                            name="userType"
                            className="sr-input-base sr-input-usertype"
                            value={formData.userType}
                            onChange={handleInputChange}
                          >
                            {USER_TYPE_OPTIONS.map((ut) => (
                              <option key={ut.value} value={ut.value}>
                                {ut.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Centered Submit Button */}
                      <div className="sr-form-submit-row">
                        <button
                          type="submit"
                          className="sr-submit-btn-legacy"
                          disabled={submitting}
                        >
                          {submitting ? "Submitting..." : "Submit"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* ==========================================================
                MODE 2: EDIT USER (User Directory Table & Update Form)
               ========================================================== */}
            {activeMode === "edit" && (
              <div className="sr-edit-user-container">
                <div className="sr-edit-search-bar">
                  <div className="sr-search-input-wrap">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search by Login Name, Name, EPF No, or Email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    className="sr-btn-save"
                    onClick={() => fetchUsers(searchQuery)}
                    style={{ padding: "8px 16px" }}
                  >
                    Refresh List
                  </button>
                </div>

                {loadingUsers ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                    Loading users from airport database...
                  </div>
                ) : userList.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                    No users matching your search query.
                  </div>
                ) : (
                  <div className="sr-user-table-wrap">
                    <table className="sr-user-table">
                      <thead>
                        <tr>
                          <th>EPF No</th>
                          <th>Login Name</th>
                          <th>Name with Initials</th>
                          <th>User Type</th>
                          <th>Email</th>
                          <th>Contact No</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userList.map((usr) => (
                          <tr key={usr.no}>
                            <td><strong>{usr.epf_no || "-"}</strong></td>
                            <td style={{ color: "#0c457a", fontWeight: "600" }}>{usr.user_id}</td>
                            <td>{usr.id_name || "-"}</td>
                            <td>
                              <span className={`sr-badge-role ${(usr.user_type || "").toLowerCase()}`}>
                                {usr.user_type || "user"}
                              </span>
                            </td>
                            <td>{usr.email || "-"}</td>
                            <td>{usr.tele || "-"}</td>
                            <td>
                              <span className={`sr-badge-status ${(usr.Status || "").toLowerCase() === "inactive" ? "inactive" : ""}`}>
                                {usr.Status || "Active"}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="sr-table-edit-btn"
                                onClick={() => handleOpenEditUser(usr)}
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Modal for Editing User */}
            {isEditModalOpen && (
              <div className="sr-edit-modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
                <div className="sr-edit-modal-card" onClick={(e) => e.stopPropagation()}>
                  <div className="sr-edit-modal-header">
                    <h3>Edit User: {editFormData.user_id}</h3>
                    <button
                      type="button"
                      className="sr-edit-modal-close"
                      onClick={() => setIsEditModalOpen(false)}
                    >
                      &times;
                    </button>
                  </div>

                  <form onSubmit={handleSaveEditUser}>
                    <div className="sr-edit-modal-body">
                      {/* Title */}
                      <div className="sr-form-row">
                        <label className="sr-form-label">Title</label>
                        <div className="sr-form-control-wrap">
                          <select
                            className="sr-input-base sr-input-title"
                            value={editFormData.title}
                            onChange={(e) =>
                              setEditFormData((p) => ({ ...p, title: e.target.value }))
                            }
                          >
                            {TITLE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Name with Initials */}
                      <div className="sr-form-row">
                        <label className="sr-form-label">
                          Name with Initials <span className="asterisk">*</span>
                        </label>
                        <div className="sr-form-control-wrap">
                          <input
                            type="text"
                            className="sr-input-base sr-input-name"
                            value={editFormData.nameWithInitials}
                            onChange={(e) =>
                              setEditFormData((p) => ({
                                ...p,
                                nameWithInitials: e.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                      </div>

                      {/* EPF No */}
                      <div className="sr-form-row">
                        <label className="sr-form-label">EPF No</label>
                        <div className="sr-form-control-wrap">
                          <input
                            type="text"
                            className="sr-input-base sr-input-epf"
                            value={editFormData.epfNo}
                            onChange={(e) =>
                              setEditFormData((p) => ({ ...p, epfNo: e.target.value }))
                            }
                          />
                        </div>
                      </div>

                      {/* Login Name (Read-only) */}
                      <div className="sr-form-row">
                        <label className="sr-form-label">Desired Login Name</label>
                        <div className="sr-form-control-wrap">
                          <input
                            type="text"
                            className="sr-input-base sr-input-login"
                            value={editFormData.user_id}
                            disabled
                          />
                        </div>
                      </div>

                      {/* Password Change Option */}
                      <div className="sr-form-row">
                        <label className="sr-form-label">New Password</label>
                        <div className="sr-form-control-wrap">
                          <input
                            type="password"
                            className="sr-input-base sr-input-password"
                            placeholder="Leave blank to keep current"
                            value={editFormData.password}
                            onChange={(e) =>
                              setEditFormData((p) => ({ ...p, password: e.target.value }))
                            }
                          />
                        </div>
                      </div>

                      {editFormData.password && (
                        <div className="sr-form-row">
                          <label className="sr-form-label">Confirm Password</label>
                          <div className="sr-form-control-wrap">
                            <input
                              type="password"
                              className="sr-input-base sr-input-password"
                              value={editFormData.rePassword}
                              onChange={(e) =>
                                setEditFormData((p) => ({
                                  ...p,
                                  rePassword: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                      )}

                      {/* Email */}
                      <div className="sr-form-row">
                        <label className="sr-form-label">Email address</label>
                        <div className="sr-form-control-wrap">
                          <input
                            type="email"
                            className="sr-input-base sr-input-email"
                            value={editFormData.email}
                            onChange={(e) =>
                              setEditFormData((p) => ({ ...p, email: e.target.value }))
                            }
                          />
                        </div>
                      </div>

                      {/* Contact No */}
                      <div className="sr-form-row">
                        <label className="sr-form-label">Contanct No.</label>
                        <div className="sr-form-control-wrap">
                          <input
                            type="text"
                            className="sr-input-base sr-input-contact"
                            value={editFormData.contactNo}
                            onChange={(e) =>
                              setEditFormData((p) => ({
                                ...p,
                                contactNo: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>

                      {/* User Type */}
                      <div className="sr-form-row">
                        <label className="sr-form-label">User Type</label>
                        <div className="sr-form-control-wrap">
                          <select
                            className="sr-input-base sr-input-usertype"
                            value={editFormData.userType}
                            onChange={(e) =>
                              setEditFormData((p) => ({
                                ...p,
                                userType: e.target.value,
                              }))
                            }
                          >
                            {USER_TYPE_OPTIONS.map((ut) => (
                              <option key={ut.value} value={ut.value}>
                                {ut.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="sr-form-row">
                        <label className="sr-form-label">Status</label>
                        <div className="sr-form-control-wrap">
                          <select
                            className="sr-input-base sr-input-usertype"
                            value={editFormData.status}
                            onChange={(e) =>
                              setEditFormData((p) => ({
                                ...p,
                                status: e.target.value,
                              }))
                            }
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="sr-edit-modal-actions">
                      <button
                        type="button"
                        className="sr-btn-cancel"
                        onClick={() => setIsEditModalOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="sr-btn-save"
                        disabled={savingEdit}
                      >
                        {savingEdit ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
