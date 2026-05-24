import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  CreditCard,
  RefreshCcw,
  TrendingUp,
  Users,
  Clock3,
  Wallet,
} from "lucide-react";
import dashboardService from "../../services/dashboardService";
import notificationService from "../../services/notificationService";
import { useAuth } from "../../store/AuthContext";
import "./dashboard.scss";
import { getBranchNames } from "../../utils/branches";
import StateBlock from "../../components/StateBlock/StateBlock";
import { StatSkeleton } from "../../components/Skeleton/Skeleton";
import usePageResource from "../../hooks/usePageResource";
import { useTranslation } from "../../i18n/useTranslation";

const emptyDashboardData = {
  stats: {
    revenue: 0,
    active: 0,
    ordersCount: 0,
    netProfit: 0,
    cash: 0,
    card: 0,
    clickPayme: 0,
    transfer: 0,
  },
  orders: [],
  expenses: [],
  notifications: [],
  currentShift: null,
  currentShifts: [],
  activityLogs: [],
  smartAlerts: [],
};

export default function Dashboard() {
  const { t, formatMoney } = useTranslation();
  const navigate = useNavigate();
  const { effectiveBranch } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const {
    data = emptyDashboardData,
    isLoading,
    error,
    retry,
  } = usePageResource(() => {
    dashboardService.sync();
    const dashboardData = dashboardService.getData(effectiveBranch);

    return {
      ...dashboardData,
      smartAlerts: notificationService.getSmartAlerts(effectiveBranch),
    };
  }, [effectiveBranch, refreshKey], emptyDashboardData);

  const branches = (effectiveBranch ? [effectiveBranch] : getBranchNames()).map(
    (branch) => {
      const branchOrders = data.orders.filter((order) => order.branch === branch);
      const revenue = branchOrders.reduce(
        (sum, order) =>
          sum + Number(order.finalPrice || 0) + Number(order.overtimeAmount || 0),
        0,
      );
      const active = branchOrders.filter((order) => order.status === "Aktiv").length;

      return {
        name: branch,
        revenue,
        active,
      };
    },
  );

  const activities = data.activityLogs
    .slice(0, 5)
    .map((log) => `${log.description}`);

  const statCards = [
    {
      title: t("Bugungi savdo"),
      value: formatMoney(data.stats.revenue),
      icon: TrendingUp,
      action: () => navigate("/sales-history"),
    },
    {
      title: t("Aktiv baggage"),
      value: `${data.stats.active} ${t("ta")}`,
      icon: Briefcase,
      action: () => navigate("/active-baggage"),
    },
    {
      title: t("Bugungi klientlar"),
      value: `${data.stats.ordersCount} ${t("ta")}`,
      icon: Users,
      action: () => navigate("/sales-history"),
    },
    {
      title: t("Sof foyda"),
      value: formatMoney(data.stats.netProfit),
      icon: Wallet,
      action: () => navigate("/expenses"),
    },
  ];

  return (
    <section className="page dashboard-page">
      <div className="page-header compact-header">
        <div>
          <h1>{t("Dashboard")}</h1>
          <p>{t("Filiallar, savdo va bagaj holati bo'yicha umumiy ko'rsatkichlar")}</p>
        </div>

        <button
          className="dashboard-filter"
          onClick={() => setRefreshKey((prev) => prev + 1)}
        >
          <RefreshCcw size={16} />
          {t("Refresh")}
        </button>
      </div>

      {error ? (
        <StateBlock
          type="error"
          title={t("Dashboard ma'lumotlari yuklanmadi")}
          description={t(
            "Local ma'lumotlarni o'qishda xatolik yuz berdi. Qayta urinib ko'ring.",
          )}
          actionLabel={t("Qayta urinish")}
          onAction={retry}
        />
      ) : isLoading ? (
        <StatSkeleton count={4} />
      ) : (
        <>
          <div className="dashboard-stats">
            {statCards.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  className="dashboard-stat card clickable"
                  key={item.title}
                  onClick={item.action}
                >
                  <div className="dashboard-stat-icon">
                    <Icon size={20} />
                  </div>

                  <div>
                    <p>{item.title}</p>
                    <h3>{item.value}</h3>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="dashboard-shift-card card">
            <div>
              <span>{t("Kassa holati")}</span>
              <h2>
                {effectiveBranch
                  ? data.currentShift
                    ? t("Kassa ochiq")
                    : t("Kassa yopiq")
                  : `${data.currentShifts.length} ${t("ta kassa ochiq")}`}
              </h2>
              <p>
                {effectiveBranch && data.currentShift
                  ? `${t(data.currentShift.branch)} · ${data.currentShift.admin}`
                  : effectiveBranch
                    ? t("Hozir ochiq shift mavjud emas")
                    : t("Barcha filiallar bo'yicha umumiy holat")}
              </p>
            </div>

            <b className={data.currentShifts.length ? "open" : "closed"}>
              {data.currentShifts.length ? t("Opened") : t("Closed")}
            </b>
          </div>

          <div className="dashboard-grid">
            <div className="dashboard-panel card">
              <div className="panel-header">
                <div>
                  <h2>{t("Filiallar kesimida savdo")}</h2>
                  <p>{t("Savdo va aktiv bagaj")}</p>
                </div>
              </div>

              <div className="branch-list">
                {branches.map((branch) => (
                  <div className="branch-row" key={branch.name}>
                    <div>
                      <h4>{t(branch.name)}</h4>
                      <p>{formatMoney(branch.revenue)}</p>
                    </div>

                    <div className="branch-meta">
                      <span>
                        {branch.active} {t("Aktiv")}
                      </span>
                      <b>{branch.revenue > 0 ? t("Active") : t("No data")}</b>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-panel card">
              <div className="panel-header">
                <div>
                  <h2>{t("Payment analytics")}</h2>
                  <p>{t("To'lov turlari bo'yicha holat")}</p>
                </div>
                <CreditCard size={20} />
              </div>

              <div className="payment-list">
                <div>
                  <span>{t("Naqd")}</span>
                  <b>{formatMoney(data.stats.cash)}</b>
                </div>
                <div>
                  <span>{t("Karta")}</span>
                  <b>{formatMoney(data.stats.card)}</b>
                </div>
                <div>
                  <span>Click/Payme</span>
                  <b>{formatMoney(data.stats.clickPayme)}</b>
                </div>
                <div>
                  <span>{t("O'tkazma")}</span>
                  <b>{formatMoney(data.stats.transfer)}</b>
                </div>
              </div>
            </div>

            <div className="dashboard-panel card">
              <div className="panel-header">
                <div>
                  <h2>{t("Live activity")}</h2>
                  <p>{t("So'nggi mahalliy harakatlar")}</p>
                </div>
                <Clock3 size={20} />
              </div>

              <div className="activity-list">
                {activities.length === 0 && (
                  <StateBlock
                    type="empty"
                    compact
                    title={t("Activity yo'q")}
                    description={t("Hali local harakatlar yozilmagan.")}
                  />
                )}

                {activities.map((activity, index) => (
                  <div className="activity-item" key={index}>
                    <span />
                    <p>{activity}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-panel card">
              <div className="panel-header">
                <div>
                  <h2>{t("Smart alerts")}</h2>
                  <p>{t("Muhim ogohlantirishlar")}</p>
                </div>
              </div>

              <div className="alert-list">
                {data.smartAlerts.slice(0, 4).map((item) => (
                  <div className={`alert ${item.type}`} key={item.id}>
                    {item.title}: {item.message}
                  </div>
                ))}

                {data.smartAlerts.length === 0 && (
                  <StateBlock
                    type="bell"
                    compact
                    title={t("Ogohlantirish yo'q")}
                    description={t("Hozircha muhim alertlar mavjud emas.")}
                  />
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
