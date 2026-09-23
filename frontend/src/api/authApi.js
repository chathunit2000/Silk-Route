const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4000/api";

/**
 * Authenticates against airport_database.users via the backend API.
 * @param {string} userId - user_id from airport_database.users
 * @param {string} password - raw password string
 * @returns {Promise<Object>} response data containing user info on success
 */
export async function loginUser(userId, password) {
  let response;
  try {
    response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        password: password,
      }),
    });
  } catch (netErr) {
    throw new Error(
      "Unable to connect to the backend server (http://localhost:4000). Please check your server connection."
    );
  }

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || "Invalid User ID or password.");
  }

  return data;
}
