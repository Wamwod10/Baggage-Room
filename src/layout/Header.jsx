import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarClock,
  ChevronDown,
  Menu,
  Search,
  SunMoon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import baggageService from "../services/baggageService";
import notificationService from "../services/notificationService";
import settingsService from "../services/settingsService";
import { ALL_BRANCHES_LABEL, getBranchNames } from "../utils/branches";
import { useTranslation } from "../i18n/useTranslation";
import "./header.scss";

export default function Header({ onMenuClick }) {
  const { t } = useTranslation();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const navigate = useNavigate();
  const { user, activeBranch, effectiveBranch, isSuperAdmin, setActiveBranch } =
    useAuth();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [alertRefreshKey, setAlertRefreshKey] = useState(0);
  const [headerAlerts, setHeaderAlerts] = useState([]);
  const [currentDate, setCurrentDate] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setAlertRefreshKey((value) => value + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    notificationService
      .getSmartAlerts(effectiveBranch)
      .then((alerts) => {
        if (active) setHeaderAlerts(alerts);
      })
      .catch(() => {
        if (active) setHeaderAlerts([]);
      });
    return () => {
      active = false;
    };
  }, [effectiveBranch, alertRefreshKey]);

  const alertCount = headerAlerts.length;
  const liveDate = useMemo(() => {
    const pad = (value) => String(value).padStart(2, "0");

    return {
      date: `${pad(currentDate.getDate())}.${pad(
        currentDate.getMonth() + 1,
      )}.${currentDate.getFullYear()}`,
      time: `${pad(currentDate.getHours())}:${pad(currentDate.getMinutes())}`,
    };
  }, [currentDate]);

  useEffect(() => {
    let active = true;
    const query = search.trim().toLowerCase();
    if (!query) {
      setResults([]);
      return undefined;
    }

    baggageService
      .getAll(effectiveBranch)
      .then((orders) => {
        if (!active) return;
        setResults(
          orders
            .filter((order) => {
              const searchableFields = [
                order.id,
                order.orderNumber,
                order.client,
                order.phone,
                order.passport,
                order.branch,
                order.size,
                order.payment,
                order.status,
                order.admin,
              ];

              return searchableFields.some((field) =>
                String(field || "").toLowerCase().includes(query),
              );
            })
            .slice(0, 8),
        );
      })
      .catch(() => {
        if (active) setResults([]);
      });

    return () => {
      active = false;
    };
  }, [effectiveBranch, search]);

  const toggleTheme = () => {
    const settings = settingsService.get();

    const nextTheme = settings.theme === "dark" ? "light" : "dark";

    settingsService.save({
      ...settings,
      theme: nextTheme,
    });

    document.body.classList.toggle("dark", nextTheme === "dark");
  };

  const openResult = (orderId) => {
    setSearch("");
    navigate(`/sales-history?order=${orderId}`);
  };

  return (
    <header className="header">
      <button
        type="button"
        className="header-menu-btn"
        onClick={onMenuClick}
        aria-label={t("Menyuni ochish")}
      >
        <Menu size={20} />
      </button>

      <div className="header-search-wrap">
        <div className="header-search">
          <Search size={18} />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Order, telefon, passport, filial, payment...")}
          />
        </div>

        {results.length > 0 && (
          <div className="header-search-results">
            {results.map((order) => (
              <button key={order.id} onClick={() => openResult(order.id)}>
                <div>
                  <b>{order.id}</b>
                  <span>
                    {order.client} · {order.phone}
                  </span>
                </div>

                <small>
                  {t(order.branch)} · {t(order.payment)}
                </small>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="header-actions">
        {isSuperAdmin && (
          <div className="header-branch-select">
            <span>{t("Filial")}</span>
            <button
              type="button"
              onClick={() => setBranchMenuOpen((value) => !value)}
            >
              <b>{t(activeBranch)}</b>
              <ChevronDown size={15} />
            </button>

            {branchMenuOpen && (
              <div className="header-branch-menu">
                {[ALL_BRANCHES_LABEL, ...getBranchNames()].map((branch) => (
                  <button
                    type="button"
                    key={branch}
                    className={branch === activeBranch ? "active" : ""}
                    onClick={() => {
                      setActiveBranch(branch);
                      setBranchMenuOpen(false);
                    }}
                  >
                    {t(branch)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="header-datetime" aria-label={t("Joriy sana va vaqt")}>
          <CalendarClock size={17} />
          <div>
            <b>{liveDate.time}</b>
            <span>{liveDate.date}</span>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="header-icon-btn header-theme-btn"
        >
          <SunMoon size={18} />
        </button>

        <div className="header-notification-wrap">
          <button
            className="header-icon-btn notification"
            onClick={() => setNotificationOpen((value) => !value)}
          >
            <Bell size={18} />

            {alertCount > 0 && (
              <span className="notification-badge">{alertCount}</span>
            )}
          </button>

          {notificationOpen && (
            <div className="header-notification-dropdown">
              <div className="notification-dropdown-head">
                <div>
                  <h3>{t("Notifications")}</h3>
                  <p>
                    {alertCount} {t("ta aktiv alert")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNotificationOpen(false);
                    navigate("/notifications");
                  }}
                >
                  {t("View all")}
                </button>
              </div>

              <div className="notification-dropdown-list">
                {headerAlerts.length === 0 ? (
                  <div className="notification-dropdown-empty">
                    {t("Hozircha alert yo'q")}
                  </div>
                ) : (
                  headerAlerts.slice(0, 4).map((alert) => (
                    <button
                      key={alert.id}
                      className={`notification-dropdown-item ${alert.type}`}
                      type="button"
                      onClick={() => {
                        setNotificationOpen(false);
                        navigate("/notifications");
                      }}
                    >
                      <b>{alert.title}</b>
                      <span>{alert.message}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="header-user">
          <div>
            <h4>{t(user?.fullName)}</h4>

            <p>{isSuperAdmin ? t(activeBranch) : t(user?.branchName)}</p>
          </div>

          <div className="header-avatar">
            {user?.fullName?.slice(0, 1) || "A"}
          </div>
        </div>
      </div>
    </header>
  );
}
