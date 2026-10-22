export const NAV_ROUTES = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard", icon: "grid" },
  { key: "add-new-reservation", label: "Add New Reservation", path: "/packages", icon: "plus-square" },
  { key: "pending-payments", label: "Pending Reservations", path: "/pending-payments", icon: "credit-card-clock" },
  { key: "reservation-confirmed", label: "Reservation Confirmed", path: "/reservation-confirmed", icon: "calendar-check" },
  { key: "create-edit-user", label: "Create/Edit User", path: "/create-edit-user", icon: "user-cog" },
  { key: "on-credit-reservation", label: "On Credit Reservations", path: "/on-credit-reservations", icon: "credit-card" },
  { key: "edit-confirm-reservations", label: "Edit Confirm Reservations", path: "/edit-confirm-reservations", icon: "calendar-edit", section: "Manage Reservations" },
  { key: "edit-pending-reservations", label: "Edit Pending Reservations", path: "/edit-pending-reservations", icon: "calendar-clock", section: "Manage Reservations" },
  { key: "visitors' details", label: "Visitors' Details", path: "/visitors-details", icon: "users" },
  { key: "Immigration Emigration Report", label: "Immigration Emigration Report", path: "/immigration-emigration-report", icon: "globe", section: "Reports" },
  { key: "search", label: "Search", path: "/search", icon: "search" },
  { key: "sales-end", label: "Sales End", path: "/sales-end", icon: "file", allowedRoles: ["user"] },
  { key: "delete confirm reservation", label: "Delete Confirm Reservation", path: "/delete-confirm-reservation", icon: "calendar-x", section: "Manage Reservations" },
  { key: "delete pending payments", label: "Delete Pending Reservations", path: "/delete-pending-payments", icon: "credit-card-x", section: "Manage Reservations" },
  { key: "daily arrival report", label: "Daily Arrival Report", path: "/daily-arrival-report", icon: "plane-landing", section: "Reports" },
  { key: "daily departure report", label: "Daily Departure Report", path: "/daily-departure-report", icon: "plane-takeoff", section: "Reports" },
];

export function getNavItemByPath(pathname) {
  if (pathname === "/packages" || pathname === "/add-new-reservation" || pathname.startsWith("/package-reservation")) {
    return NAV_ROUTES.find((r) => r.key === "add-new-reservation");
  }
  if (pathname === "/add-payment" || pathname === "/pending-payments" || pathname === "/pending-reservations") {
    return NAV_ROUTES.find((r) => r.key === "pending-payments");
  }
  return NAV_ROUTES.find((r) => r.path === pathname) || null;
}
