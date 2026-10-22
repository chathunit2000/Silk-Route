import React, { useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import BookingPackages from "./components/BookingPackages";
import PackageReservation from "./components/PackageReservation";
import PendingPayments from "./components/PendingPayments";
import ReservationConfirmed from "./components/ReservationConfirmed";
import CreateEditUser from "./components/CreateEditUser";
import OnCreditReservation from "./components/onCreditReservation";
import OnCreditSelectPage from "./components/on-credit select page";
import OnCreditAddDetails from "./components/oncredit-add details";
import UserExpiredOnCredit from "./components/user-expired on credit";
import CreateCreditCompany from "./components/CreateCreditCompany";
import FlightReport from "./components/FlightReport";
import ImmigrationEmigrationReport from "./components/ImmigrationEmigrationReport";
import VisitorDetails from "./components/VisitorDetails";
import SearchPage from "./components/SearchPage";
import SalesEnd from "./components/SalesEnd";
import Login from "./components/Login";
import ModulePlaceholder from "./components/ModulePlaceholder";
import EditPendingReservations from "./components/EditPendingReservations";
import EditConfirmed from "./components/EditConfirmed";
import DeletePendingReservations from "./components/Delete Pending Reservations ";
import DeleteConfirmReservation from "./components/Delete Confirm Reservation";
import { NAV_ROUTES } from "./routes/navRoutes";
import { getUserRole } from "./utils/userRoles";

function ProtectedRoute({ user, allowedRoles, children }) {
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  const role = getUserRole(user);
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("silkroute_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (userData) => {
    setUser(userData);
    try {
      localStorage.setItem("silkroute_user", JSON.stringify(userData));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem("silkroute_user");
    } catch (e) {
      console.error(e);
    }
    navigate("/login", { replace: true });
  };

  return (
    <Routes>
      {/* Login Route */}
      <Route
        path="/login"
        element={
          user ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />
        }
      />

      {/* Main Dashboard Route: All users (including finance) see the normal dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute user={user}>
            <Dashboard user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      {/* Packages Overview Route (Admin and Normal user only) */}
      <Route
        path="/packages"
        element={
          <ProtectedRoute user={user} allowedRoles={["admin", "user"]}>
            <BookingPackages user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      {/* Add New Reservation Path Alias */}
      <Route
        path="/add-new-reservation"
        element={<Navigate to="/packages" replace />}
      />

      {/* Package Reservation Routes (Admin and Normal user only) */}
      <Route
        path="/package-reservation"
        element={
          <ProtectedRoute user={user} allowedRoles={["admin", "user"]}>
            <PackageReservation user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/package-reservation/:packageId"
        element={
          <ProtectedRoute user={user} allowedRoles={["admin", "user"]}>
            <PackageReservation user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      {/* Reservation aliases */}
      <Route
        path="/reservation"
        element={<Navigate to="/package-reservation" replace />}
      />
      <Route
        path="/reservation/:packageId"
        element={<Navigate to="/package-reservation/:packageId" replace />}
      />

      {/* Confirmation page routes */}
      <Route
        path="/confirmation"
        element={
          <ProtectedRoute user={user} allowedRoles={["admin", "user"]}>
            <PackageReservation user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/confirm-reservation"
        element={<Navigate to="/confirmation" replace />}
      />

      {/* Pending Reservations / Payments Route (Accessible by Admin, Finance, and Normal user) */}
      <Route
        path="/pending-payments"
        element={
          <ProtectedRoute user={user} allowedRoles={["admin", "finance", "user"]}>
            <PendingPayments user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pending-reservations"
        element={
          <ProtectedRoute user={user} allowedRoles={["admin", "finance", "user"]}>
            <PendingPayments user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-payment"
        element={
          <ProtectedRoute user={user} allowedRoles={["admin", "finance", "user"]}>
            <PendingPayments user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-credit-company"
        element={
          <ProtectedRoute user={user} allowedRoles={["admin", "finance", "user"]}>
            <CreateCreditCompany user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-credit-reservation"
        element={
          <ProtectedRoute user={user} allowedRoles={["admin", "finance", "user"]}>
            <CreateCreditCompany user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      {/* Reservation Confirmed Route (Admin and Normal user only) */}
      <Route
        path="/reservation-confirmed"
        element={
          <ProtectedRoute user={user} allowedRoles={["admin", "user"]}>
            <ReservationConfirmed user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      {/* On-credit reservation flow */}
      <Route
        path="/on-credit-reservations"
        element={
          <ProtectedRoute user={user} allowedRoles={["admin", "user"]}>
            <OnCreditReservation user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/on-credit-select-page"
        element={
          <ProtectedRoute user={user} allowedRoles={["admin", "user"]}>
            <OnCreditSelectPage user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/oncredit-add-details"
        element={
          <ProtectedRoute user={user} allowedRoles={["admin", "user"]}>
            <OnCreditAddDetails user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user-expired-on-credit"
        element={
          <ProtectedRoute user={user} allowedRoles={["admin", "user"]}>
            <UserExpiredOnCredit user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      {/* Create / Edit User Route - RESTRICTED TO ADMIN ONLY */}
      <Route
        path="/create-edit-user"
        element={
          <ProtectedRoute user={user} allowedRoles={["admin"]}>
            <CreateEditUser user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      {/* Sidebar Operational Module Routes with Full History Navigation & Strict Role Access */}
      {NAV_ROUTES.filter(
        (item) =>
          item.path !== "/dashboard" &&
          item.path !== "/packages" &&
          item.path !== "/pending-payments" &&
          item.path !== "/pending-reservations" &&
          item.path !== "/reservation-confirmed" &&
          item.path !== "/create-edit-user" &&
          item.path !== "/on-credit-reservations" &&
          item.path !== "/on-credit-select-page" &&
          item.path !== "/oncredit-add-details" &&
          item.path !== "/user-expired-on-credit"
      ).map((item) => {
        // Reservation deletion is restricted to administrators.
        const allowedRoles =
          item.allowedRoles ||
          (item.path === "/delete-confirm-reservation" ||
          item.path === "/delete-pending-payments"
            ? ["admin"]
            : item.path === "/search"
            ? ["admin", "finance", "user"]
            : ["admin", "user"]);

        return (
          <Route
            key={item.key}
            path={item.path}
            element={
              <ProtectedRoute user={user} allowedRoles={allowedRoles}>
                {item.key === "daily arrival report" ? (
                  <FlightReport
                    direction="arrival"
                    user={user}
                    onLogout={handleLogout}
                  />
                ) : item.key === "daily departure report" ? (
                  <FlightReport
                    direction="departure"
                    user={user}
                    onLogout={handleLogout}
                  />
                ) : item.key === "Immigration Emigration Report" ? (
                  <ImmigrationEmigrationReport
                    user={user}
                    onLogout={handleLogout}
                  />
                ) : item.key === "visitors' details" ? (
                  <VisitorDetails
                    user={user}
                    onLogout={handleLogout}
                  />
                ) : item.key === "search" ? (
                  <SearchPage
                    user={user}
                    onLogout={handleLogout}
                  />
                ) : item.key === "sales-end" ? (
                  <SalesEnd
                    user={user}
                    onLogout={handleLogout}
                  />
                ) : item.key === "edit-pending-reservations" ? (
                  <EditPendingReservations
                    user={user}
                    onLogout={handleLogout}
                  />
                ) : item.key === "edit-confirm-reservations" ? (
                  <EditConfirmed
                    user={user}
                    onLogout={handleLogout}
                  />
                ) : item.key === "delete pending payments" ? (
                  <DeletePendingReservations
                    user={user}
                    onLogout={handleLogout}
                  />
                ) : item.key === "delete confirm reservation" ? (
                  <DeleteConfirmReservation
                    user={user}
                    onLogout={handleLogout}
                  />
                ) : (
                  <ModulePlaceholder
                    user={user}
                    onLogout={handleLogout}
                    title={item.label}
                    navKey={item.key}
                  />
                )}
              </ProtectedRoute>
            }
          />
        );
      })}

      {/* Root redirect */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Catch-all 404 fallback */}
      <Route
        path="*"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}
