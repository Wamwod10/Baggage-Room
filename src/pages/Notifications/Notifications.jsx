import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock3,
  ListChecks,
  RefreshCcw,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import notificationService from "../../services/notificationService";
import { useAuth } from "../../store/AuthContext";
import StateBlock from "../../components/StateBlock/StateBlock";
import { StatSkeleton } from "../../components/Skeleton/Skeleton";
import usePageResource from "../../hooks/usePageResource";
import { useTranslation } from "../../i18n/useTranslation";
import { animateButtonIcon } from "../../utils/animateButtonIcon";
import "./notifications.scss";

const emptyPageData = {
  alerts: [],
  systemNotifications: [],
  activityLogs: [],
};

export default function Notifications() {
  const { t, formatDateTime } = useTranslation();
  const { effectiveBranch } = useAuth();
  const [activeTab, setActiveTab] = useState("alerts");
  const [refreshKey, setRefreshKey] = useState(0);

  const {
    data: pageData = emptyPageData,
    isLoading,
    error,
    retry,
  } = usePageResource(
    () => notificationService.getPageData(effectiveBranch),
    [effectiveBranch, refreshKey],
    emptyPageData,
  );

  const notifications = [...pageData.alerts, ...pageData.systemNotifications];

  const activityLogs = pageData.activityLogs;

  const dangerCount = notifications.filter(
    (item) => item.type === "danger",
  ).length;
  const warningCount = notifications.filter(
    (item) => item.type === "warning",
  ).length;
  const infoCount = notifications.filter((item) => item.type === "info").length;

  const getIcon = (type) => {
    if (type === "danger") return <ShieldAlert size={18} />;
    if (type === "warning") return <AlertTriangle size={18} />;
    if (type === "info") return <Clock3 size={18} />;
    return <CheckCircle size={18} />;
  };

  const getPriorityLabel = (type) => {
    if (type === "danger") return t("Critical");
    if (type === "warning") return t("Warning");
    if (type === "info") return t("Info");
    return t("Success");
  };

  return (
    <section className="page notifications-page">
      <div className="page-header compact-header">
        <div>
          <h1>{t("Notifications")}</h1>
          <p>{t("Kechikkan baggage, pickup reminder va activity loglar")}</p>
        </div>

        <button
          className="notification-refresh"
          onClick={(event) => {
            animateButtonIcon(event);
            setRefreshKey((value) => value + 1);
          }}
        >
          <RefreshCcw size={16} />
          {t("Refresh")}
        </button>
      </div>

      {error ? (
        <StateBlock
          type="error"
          title={t("Notifications yuklanmadi")}
          description={t("Alert va activity ma'lumotlarini o'qishda xatolik yuz berdi.")}
          actionLabel={t("Qayta urinish")}
          onAction={retry}
        />
      ) : isLoading ? (
        <StatSkeleton count={4} />
      ) : (
        <>
      <div className="notification-stats-grid">
        <div className="notification-stat-card card danger">
          <span>{t("Critical")}</span>
          <b>{dangerCount}</b>
          <small>{t("Kechikkan yoki muhim alertlar")}</small>
        </div>

        <div className="notification-stat-card card warning">
          <span>{t("Warning")}</span>
          <b>{warningCount}</b>
          <small>{t("Diqqat talab qiladigan holatlar")}</small>
        </div>

        <div className="notification-stat-card card info">
          <span>{t("Info")}</span>
          <b>{infoCount}</b>
          <small>{t("Pickup va system reminderlar")}</small>
        </div>

        <div className="notification-stat-card card">
          <span>{t("Activity")}</span>
          <b>{activityLogs.length}</b>
          <small>{t("Oxirgi system amallari")}</small>
        </div>
      </div>

      <div className="notification-tabs card">
        <button
          className={activeTab === "alerts" ? "active" : ""}
          onClick={() => setActiveTab("alerts")}
        >
          <Bell size={16} />
          {t("Alerts")}
        </button>

        <button
          className={activeTab === "activity" ? "active" : ""}
          onClick={() => setActiveTab("activity")}
        >
          <ListChecks size={16} />
          {t("Activity logs")}
        </button>
      </div>

      {activeTab === "alerts" && (
        <div className="notifications-card card">
          <div className="notifications-head">
            <div>
              <Bell size={18} />
              <h2>{t("Alert center")}</h2>
            </div>
            <span>{notifications.length} ta</span>
          </div>

          <div className="notifications-list">
            {notifications.length === 0 && (
              <StateBlock
                type="bell"
                title={t("Hammasi joyida")}
                description={t("Hozircha muhim alert yo'q.")}
              />
            )}

            {notifications.map((item) => (
              <div className={`notification-item ${item.type}`} key={item.id}>
                <div className="notification-icon">{getIcon(item.type)}</div>

                <div className="notification-content">
                  <div>
                    <h3>{item.title}</h3>
                    <span className={`priority ${item.type}`}>
                      {getPriorityLabel(item.type)}
                    </span>
                  </div>
                  <p>{item.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "activity" && (
        <div className="notifications-card card">
          <div className="notifications-head">
            <div>
              <ListChecks size={18} />
              <h2>{t("Activity logs")}</h2>
            </div>
            <span>{activityLogs.length} ta</span>
          </div>

          <div className="activity-log-list">
            {activityLogs.length === 0 && (
              <StateBlock
                type="empty"
                title={t("Activity yo'q")}
                description={t("Hali system amallari yozilmagan.")}
              />
            )}

            {activityLogs.map((log) => (
              <div className="activity-log-item" key={log.id}>
                <div>
                  <b>{log.action}</b>
                  <p>{log.description}</p>
                </div>

                <div>
                  <span>{log.branch}</span>
                  <small>
                    {formatDateTime(log.createdAt)}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
        </>
      )}
    </section>
  );
}
