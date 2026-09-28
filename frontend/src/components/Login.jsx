import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/Login.css";
import logoImage from "../assets/login.png";
import { loginUser } from "../api/authApi";

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!userId.trim() || !password.trim()) {
      setError("Please enter both User ID and password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await loginUser(userId.trim(), password);
      if (response && response.user) {
        if (onLogin) {
          onLogin(response.user);
        }
        const destination = location.state?.from?.pathname || "/dashboard";
        navigate(destination, { replace: true });
      }
    } catch (err) {
      setError(err.message || "Invalid User ID or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="page-title">
        <div className="brand-mark" aria-hidden="true">
          <img src={logoImage} alt="Silk Route logo" className="brand-logo" />
        </div>
        <h1 id="page-title">Silk Route Manual Booking</h1>
        <p className="subtitle">Sign in.</p>

        {error && (
          <div className="login-error" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="user_id">User ID</label>
          <input
            id="user_id"
            name="user_id"
            type="text"
            autoComplete="username"
            placeholder="Enter your User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
            disabled={loading}
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />

          <button type="submit" className="sign-in-button" disabled={loading}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M13 5h6v14h-6M10 12h9M10 12l3-3M10 12l3 3" />
            </svg>
            <span>{loading ? "Signing in…" : "Sign in"}</span>
          </button>
        </form>
      </section>
    </main>
  );
}
