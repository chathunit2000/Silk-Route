import React, { useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import BookingPackages from "./components/BookingPackages";
import PackageReservation from "./components/PackageReservation";
import PendingPayments from "./components/PendingPayments";
import Login from "./components/Login";
import ModulePlaceholder from "./components/ModulePlaceholder";
import { NAV_ROUTES } from "./routes/navRoutes";

function ProtectedRoute({ user, children }) {
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
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

      {/* Main Dashboard Route */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute user={user}>
            <Dashboard user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      {/* Packages Overview Route */}
      <Route
        path="/packages"
        element={
          <ProtectedRoute user={user}>
            <BookingPackages user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      {/* Add New Reservation Path Alias */}
      <Route
        path="/add-new-reservation"
        element={<Navigate to="/packages" replace />}
      />

      {/* Package Reservation Routes (with optional :packageId param) */}
      <Route
        path="/package-reservation"
        element={
          <ProtectedRoute user={user}>
            <PackageReservation user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/package-reservation/:packageId"
        element={
          <ProtectedRoute user={user}>
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
          <ProtectedRoute user={user}>
            <PackageReservation user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/confirm-reservation"
        element={<Navigate to="/confirmation" replace />}
      />

      {/* Pending Payments Route */}
      <Route
        path="/pending-payments"
        element={
          <ProtectedRoute user={user}>
            <PendingPayments user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      {/* Sidebar Operational Module Routes with Full History Navigation */}
      {NAV_ROUTES.filter(
        (item) => item.path !== "/dashboard" && item.path !== "/packages" && item.path !== "/pending-payments"
      ).map((item) => (
        <Route
          key={item.key}
          path={item.path}
          element={
            <ProtectedRoute user={user}>
              <ModulePlaceholder
                user={user}
                onLogout={handleLogout}
                title={item.label}
                navKey={item.key}
              />
            </ProtectedRoute>
          }
        />
      ))}

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
