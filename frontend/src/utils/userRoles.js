/**
 * Utility functions for user roles and permission checks.
 *
 * The system supports three types of users:
 * 1. Admin:
 *    - Full access to all modules
 *    - Can access Create/Edit User
 *    - Can access Delete Confirm Reservation
 * 2. Finance User:
 *    - user_type is 'fin' or 'finance'
 *    - Dedicated finance dashboard matching the specific layout (Add Payment, Search, Logout)
 *    - Only sees Add Payment and Search, nothing else
 * 3. Normal User:
 *    - Standard operational access
 *    - CANNOT access Create/Edit User
 *    - CANNOT access Delete Confirm Reservation sections
 */

export function getUserRole(user) {
  if (!user) return "guest";

  const rawRole = String(user.role || "").toLowerCase().trim();
  if (rawRole === "admin" || rawRole === "finance" || rawRole === "user") {
    return rawRole;
  }

  const rawType = String(user.user_type || "").toLowerCase().trim();
  const rawId = String(user.user_id || user.username || "").toLowerCase().trim();

  if (rawType === "admin" || rawId === "admin") {
    return "admin";
  }

  if (rawType === "fin" || rawType === "finance") {
    return "finance";
  }

  return "user"; // Normal user
}

export function isAdmin(user) {
  return getUserRole(user) === "admin";
}

export function isFinance(user) {
  return getUserRole(user) === "finance";
}

export function isNormalUser(user) {
  return getUserRole(user) === "user";
}

export function getRoleDisplayName(user) {
  const role = getUserRole(user);
  if (role === "admin") return "Administrator";
  if (role === "finance") return "Finance User";
  return "Standard User";
}
