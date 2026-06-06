import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  PackagePlus,
  Briefcase,
  History,
  Wallet,
  Clock3,
  Bell,
  Settings,
  LogOut,
  BarChart3,
  X,
} from "lucide-react";
import { useAuth } from "../store/AuthContext";
import { useTranslation } from "../i18n/useTranslation";
import "./sidebar.scss";

const menuItems = [
  {
    title: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    superAdminOnly: true,
  },
  {
    title: "Analitika",
    path: "/analytics",
    icon: BarChart3,
    superAdminOnly: true,
  },
  {
    title: "Yangi baggage",
    path: "/new-baggage",
    icon: PackagePlus,
  },
  {
    title: "Aktiv baggage",
    path: "/active-baggage",
    icon: Briefcase,
  },
  {
    title: "Savdo tarixi",
    path: "/sales-history",
    icon: History,
  },
  {
    title: "Harajatlar",
    path: "/expenses",
    icon: Wallet,
  },
  {
    title: "Kassa / Shift",
    path: "/shifts",
    icon: Clock3,
  },
  {
    title: "Notifications",
    path: "/notifications",
    icon: Bell,
  },
  {
    title: "Settings",
    path: "/settings",
    icon: Settings,
    superAdminOnly: true,
  },
];

export default function Sidebar({ open = false, onClose }) {
  const { user, logout, isSuperAdmin } = useAuth();
  const { t } = useTranslation();

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-brand">
        <div className="sidebar-logo">BR</div>
        <div>
          <h2 className="baggage">Baggage Room</h2>
          <p>{t("Admin panel")}</p>
        </div>

        <button
          type="button"
          className="sidebar-close"
          onClick={onClose}
          aria-label={t("Menyuni yopish")}
        >
          <X size={18} />
        </button>
      </div>

      <nav className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isLocked = item.superAdminOnly && !isSuperAdmin;

          if (isLocked) return null;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                isActive ? "sidebar-link active" : "sidebar-link"
              }
            >
              <Icon size={19} />
              <span>{t(item.title)}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user?.fullName?.slice(0, 1) || "A"}
          </div>
          <div>
            <h4>{t(user?.fullName)}</h4>
            <p>
              {user?.role === "SUPER_ADMIN" ? t("Rahbariyat") : t(user?.branchName)}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            onClose?.();
            logout();
          }}
          className="sidebar-logout"
        >
          <LogOut size={18} />
          {t("Chiqish")}
        </button>
      </div>
    </aside>
  );
}
