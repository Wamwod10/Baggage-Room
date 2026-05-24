import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import notificationService from "../services/notificationService";
import { useAuth } from "../store/AuthContext";
import "./mainLayout.scss";

export default function MainLayout() {
  const { effectiveBranch } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    notificationService.checkDelayedTelegramAlerts(effectiveBranch);

    const interval = setInterval(() => {
      notificationService.checkDelayedTelegramAlerts(effectiveBranch);
    }, 60000);

    return () => clearInterval(interval);
  }, [effectiveBranch]);

  useEffect(() => {
    if (!sidebarOpen) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    document.body.classList.add("mobile-nav-open");
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.classList.remove("mobile-nav-open");
      document.removeEventListener("keydown", handleEscape);
    };
  }, [sidebarOpen]);

  return (
    <div className="main-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <button
        type="button"
        className={`sidebar-backdrop ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-label="Sidebar yopish"
      />

      <div className="main-content">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="main-page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
