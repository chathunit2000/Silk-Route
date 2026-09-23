const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4000/api";

export async function fetchDashboardData() {
  const res = await fetch(`${API_BASE}/dashboard`);
  if (!res.ok) {
    throw new Error(`Dashboard API responded with ${res.status}`);
  }
  return res.json();
}
