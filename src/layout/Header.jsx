import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarClock,
  ChevronDown,
  Languages,
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
import { getPaymentLabel } from "../utils/paymentLabels";
import { useTranslation } from "../i18n/useTranslation";
import { LANGUAGE_OPTIONS } from "../i18n/translations";
import { getTashkentClock } from "../utils/formatDate";
import "./header.scss";

const asArray = (value) => (Array.isArray(value) ? value : []);
const languageLabels = {
  uzLatn: "O'zbekcha",
  uzCyrl: "Ўзбекча",
  ru: "Русский",
};

export default function Header({ onMenuClick }) {
  const { t, language, setLanguage } = useTranslation();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const navigate = useNavigate();
  const { user, activeBranch, effectiveBranch, isSuperAdmin, setActiveBranch } =
    useAuth();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
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
        if (active) setHeaderAlerts(asArray(alerts));
      })
      .catch(() => {
        if (active) setHeaderAlerts([]);
      });
    return () => {
      active = false;
    };
  }, [effectiveBranch, alertRefreshKey]);

  const safeHeaderAlerts = asArray(headerAlerts);
  const safeResults = asArray(results);
  const alertCount = safeHeaderAlerts.length;
  const liveDate = useMemo(() => {
    return getTashkentClock(currentDate);
  }, [currentDate]);

  useEffect(() => {
    let active = true;
    const query = search.trim().toLowerCase();
    if (!query) return undefined;

    baggageService
      .getAll(effectiveBranch)
      .then((orders) => {
        if (!active) return;
        setResults(
          asArray(orders)
            .filter((order) => {
              const searchableFields = [
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

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearch(value);
    if (!value.trim()) {
      setResults([]);
    }
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
            onChange={handleSearchChange}
            placeholder={t("Order, telefon, passport, filial, payment...")}
          />
        </div>

        {safeResults.length > 0 && (
          <div className="header-search-results">
            {safeResults.map((order) => {
              const label = order.orderNumber || "-";
              const target = order.orderNumber || "";
              return (
                <button key={label} onClick={() => openResult(target)}>
                  <div>
                    <b>{label}</b>
                    <span>
                      {order.client || "-"} - {order.phone || "-"}
                    </span>
                  </div>

                  <small>
                    {t(order.branch || "Ma'lumot yo'q")} - {t(getPaymentLabel(order.payment))}
                  </small>
                </button>
              );
            })}
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
          aria-label={t("Theme")}
        >
          <SunMoon size={18} />
        </button>

        <div className="header-language-wrap">
          <button
            type="button"
            className="header-icon-btn header-language-btn"
            onClick={() => setLanguageMenuOpen((value) => !value)}
            aria-label={t("Language")}
          >
            <Languages size={18} />
          </button>

          {languageMenuOpen && (
            <div className="header-language-menu">
              {LANGUAGE_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={option.value === language ? "active" : ""}
                  onClick={() => {
                    setLanguage(option.value);
                    setLanguageMenuOpen(false);
                  }}
                >
                  {languageLabels[option.value] || option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="header-notification-wrap">
          <button
            className="header-icon-btn notification"
            onClick={() => setNotificationOpen((value) => !value)}
            aria-label={t("Notifications")}
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
                {safeHeaderAlerts.length === 0 ? (
                  <div className="notification-dropdown-empty">
                    {t("Hozircha alert yo'q")}
                  </div>
                ) : (
                  safeHeaderAlerts.slice(0, 4).map((alert) => (
                    <button
                      key={alert.id}
                      className={`notification-dropdown-item ${alert.type}`}
                      type="button"
                      onClick={() => {
                        setNotificationOpen(false);
                        navigate("/notifications");
                      }}
                    >
                      <b>{t(alert.title || "-")}</b>
                      <span>{t(alert.message || "-")}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="header-user">
          <div>
            <h4>{t(user?.fullName || "-")}</h4>

            <p>{isSuperAdmin ? t(activeBranch || ALL_BRANCHES_LABEL) : t(user?.branchName || "-")}</p>
          </div>

          <div className="header-avatar">
            {user?.fullName?.slice(0, 1) || "A"}
          </div>
        </div>
      </div>
    </header>
  );
}

