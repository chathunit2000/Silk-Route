import React, { useState } from "react";
import Dashboard from "./components/Dashboard";
import BookingPackages from "./components/BookingPackages";
import Login from "./components/Login";

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("silkroute_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentView, setCurrentView] = useState("dashboard");

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
    setCurrentView("dashboard");
    try {
      localStorage.removeItem("silkroute_user");
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (currentView === "add-new-reservation" || currentView === "packages") {
    return (
      <BookingPackages
        user={user}
        onLogout={handleLogout}
        onNavigate={setCurrentView}
      />
    );
  }

  return (
    <Dashboard
      user={user}
      onLogout={handleLogout}
      onNavigate={setCurrentView}
    />
  );
}
