export const NAV_ROUTES = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard", icon: "grid" },
  { key: "add-new-reservation", label: "Add New Reservation", path: "/packages", icon: "plus-square" },
  { key: "pending-payments", label: "Pending Payments", path: "/pending-payments", icon: "credit-card-clock" },
  { key: "reservation-confirmed", label: "Reservation Confirmed", path: "/reservation-confirmed", icon: "calendar-check" },
  { key: "shrangila-reservation", label: "Shrangila Reservations", path: "/shrangila-reservations", icon: "hotel" },
  { key: "create-edit-user", label: "Create/Edit User", path: "/create-edit-user", icon: "user-cog" },
  { key: "on-credit-reservation", label: "On Credit Reservations", path: "/on-credit-reservations", icon: "credit-card" },
  { key: "edit-confirm-reservations", label: "Edit Confirm Reservations", path: "/edit-confirm-reservations", icon: "calendar-edit" },
  { key: "edit-pending-reservations", label: "Edit Pending Reservations", path: "/edit-pending-reservations", icon: "calendar-clock" },
  { key: "visitors' details", label: "Visitors' Details", path: "/visitors-details", icon: "users" },
  { key: "Immigration Emigration Report", label: "Immigration Emigration Report", path: "/immigration-emigration-report", icon: "globe" },
  { key: "search", label: "Search", path: "/search", icon: "search" },
  { key: "delete confirm reservation", label: "Delete Confirm Reservation", path: "/delete-confirm-reservation", icon: "calendar-x" },
  { key: "delete pending payments", label: "Delete Pending Payments", path: "/delete-pending-payments", icon: "credit-card-x" },
  { key: "daily arrival report", label: "Daily Arrival Report", path: "/daily-arrival-report", icon: "plane-landing" },
  { key: "daily departure report", label: "Daily Departure Report", path: "/daily-departure-report", icon: "plane-takeoff" },
];

export function getNavItemByPath(pathname) {
  if (pathname === "/packages" || pathname === "/add-new-reservation" || pathname.startsWith("/package-reservation")) {
    return NAV_ROUTES.find((r) => r.key === "add-new-reservation");
  }
  return NAV_ROUTES.find((r) => r.path === pathname) || null;
}
