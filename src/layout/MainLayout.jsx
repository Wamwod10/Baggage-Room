import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ShortcutHelp from "../components/ShortcutHelp/ShortcutHelp";
import "./mainLayout.scss";

const isTypingTarget = (target) => {
  const tag = target?.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable;
};

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!sidebarOpen) return;
    const handleEscape = (event) => event.key === "Escape" && setSidebarOpen(false);
    document.body.classList.add("mobile-nav-open");
    document.addEventListener("keydown", handleEscape);
    return () => { document.body.classList.remove("mobile-nav-open"); document.removeEventListener("keydown", handleEscape); };
  }, [sidebarOpen]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.shiftKey && event.key === "?") { event.preventDefault(); setShortcutsOpen(true); return; }
      if (event.key === "Escape") return;
      if (isTypingTarget(event.target)) {
        if (event.ctrlKey && event.key === "Enter") {
          const primary = document.querySelector('[data-shortcut-primary="true"]:not(:disabled)');
          if (primary && primary.offsetParent !== null) { event.preventDefault(); primary.click(); }
        }
        return;
      }
      if (location.pathname === "/mini-games") return;
      if (event.key === "/") { event.preventDefault(); document.getElementById("global-order-search")?.focus(); return; }
      if (event.ctrlKey && event.key === "Enter") {
        const primary = document.querySelector('[data-shortcut-primary="true"]:not(:disabled)');
        if (primary && primary.offsetParent !== null) { event.preventDefault(); primary.click(); }
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "n") { event.preventDefault(); navigate("/new-baggage"); }
      else if (key === "a") { event.preventDefault(); navigate("/active-baggage"); }
      else if (key === "p") {
        event.preventDefault();
        if (location.pathname === "/active-baggage") window.dispatchEvent(new CustomEvent("br:shortcut-pickup"));
        else navigate("/active-baggage");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navigate, location.pathname]);

  return (
    <div className="main-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <button type="button" className={`sidebar-backdrop ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} aria-label="Sidebar yopish" />
      <div className="main-content">
        <Header onMenuClick={() => setSidebarOpen(true)} onShortcutsOpen={() => setShortcutsOpen(true)} />
        <main className="main-page"><Outlet /></main>
      </div>
      <ShortcutHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
