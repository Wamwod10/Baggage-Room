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
  Archive,
  AlertTriangle,
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
import { animateButtonIcon } from "../../utils/animateButtonIcon";
import { formatMoneyByCurrency } from "../../utils/currency";

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
    debt: 0,
    activeLockers: 0,
    freeLockers: 0,
    delayedLockers: 0,
    inkassa: 0,
    cashMovementIn: 0,
    cashMovementOut: 0,
  },
  orders: [],
  expenses: [],
  notifications: [],
  currentShift: null,
  currentShifts: [],
  activityLogs: [],
  smartAlerts: [],
  branchSummary: [],
};
const asArray = (value) => (Array.isArray(value) ? value : []);
const toNumber = (value) => Number(value ?? 0) || 0;

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
    return Promise.all([
      dashboardService.getData(effectiveBranch),
      notificationService.getSmartAlerts(effectiveBranch),
    ]).then(([dashboardData, smartAlerts]) => ({
      ...dashboardData,
      smartAlerts,
    }));
  }, [effectiveBranch, refreshKey], emptyDashboardData);

  const safeData = data && typeof data === "object" ? data : emptyDashboardData;
  const safeStats = { ...emptyDashboardData.stats, ...(safeData.stats || {}) };
  const orders = asArray(safeData.orders);
  const lockers = asArray(safeData.lockers);
  const currentShifts = asArray(safeData.currentShifts);
  const activityLogs = asArray(safeData.activityLogs);
  const smartAlerts = asArray(safeData.smartAlerts);

  const summaryBranches = asArray(safeData.branchSummary);
  const branches = summaryBranches.length
    ? summaryBranches.map((branch) => ({
        name: branch.name || "-",
        revenue: toNumber(branch.revenue),
        active: toNumber(branch.active ?? branch.activeOrders),
        delayed: toNumber(branch.delayed ?? branch.delayedOrders),
        freeLockers: toNumber(branch.freeLockers ?? branch.emptyLockers),
      }))
    : (effectiveBranch ? [effectiveBranch] : getBranchNames()).map((branch) => {
      const branchOrders = orders.filter((order) => order.branch === branch);
      const revenue = branchOrders.reduce(
        (sum, order) =>
          sum +
          (order.realPaidAmount !== undefined && order.realPaidAmount !== null
            ? Number(order.realPaidAmount || 0)
            : Number(order.finalPrice || 0) + Number(order.overtimeAmount || 0)),
        0,
      );
      const active = branchOrders.filter((order) => order.status === "Aktiv").length;
      const delayed = branchOrders.filter((order) => order.status === "Kechikdi").length;
      const freeLockers = lockers.filter(
        (locker) => locker.branch === branch && locker.status === "Bosh",
      ).length;

      return {
        name: branch,
        revenue,
        active,
        delayed,
        freeLockers,
      };
    });

  const activities = activityLogs
    .slice(0, 5)
    .map((log) => `${log.description}`);

  const statCards = [
    {
      title: t("Bugungi savdo"),
      value: formatMoney(safeStats.revenue),
      icon: TrendingUp,
      action: () => navigate("/sales-history"),
    },
    {
      title: t("Aktiv baggage"),
      value: `${safeStats.active} ${t("ta")}`,
      icon: Briefcase,
      action: () => navigate("/active-baggage"),
    },
    {
      title: t("Bugungi klientlar"),
      value: `${safeStats.ordersCount} ${t("ta")}`,
      icon: Users,
      action: () => navigate("/sales-history"),
    },
    {
      title: t("Sof foyda"),
      value: formatMoney(safeStats.netProfit),
      icon: Wallet,
      action: () => navigate("/expenses"),
    },
    {
      title: t("Qarz"),
      value: formatMoney(safeStats.debt),
      icon: AlertTriangle,
      action: () => navigate("/active-baggage"),
    },
    {
      title: t("Bosh yacheyka"),
      value: `${safeStats.freeLockers} ${t("ta")}`,
      icon: Archive,
      action: () => navigate("/new-baggage"),
    },
    {
      title: t("Kechikkan"),
      value: `${safeStats.delayedLockers} ${t("ta")}`,
      icon: Clock3,
      action: () => navigate("/active-baggage"),
    },
    {
      title: t("Inkassa"),
      value: formatMoney(safeStats.inkassa),
      icon: CreditCard,
      action: () => navigate("/shifts"),
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
          onClick={(event) => {
            animateButtonIcon(event);
            setRefreshKey((prev) => prev + 1);
          }}
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
                  ? safeData.currentShift
                    ? t("Kassa ochiq")
                    : t("Kassa yopiq")
                  : `${currentShifts.length} ${t("ta kassa ochiq")}`}
              </h2>
              <p>
                {effectiveBranch && safeData.currentShift
                  ? `${t(safeData.currentShift.branch || "Ma'lumot yo'q")} - ${safeData.currentShift.admin || "-"}`
                  : effectiveBranch
                    ? t("Hozir ochiq shift mavjud emas")
                    : t("Barcha filiallar bo'yicha umumiy holat")}
              </p>
            </div>

            <b className={currentShifts.length ? "open" : "closed"}>
              {currentShifts.length ? t("Opened") : t("Closed")}
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
                        {branch.active} {t("Aktiv")} / {branch.freeLockers} {t("Bosh")}
                      </span>
                      <b>{branch.delayed > 0 ? `${branch.delayed} ${t("Kechikdi")}` : t("Active")}</b>
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
                  <b>{formatMoney(safeStats.cash)}</b>
                </div>
                <div>
                  <span>{t("Karta")}</span>
                  <b>{formatMoney(safeStats.card)}</b>
                </div>
                <div>
                  <span>Click/Payme</span>
                  <b>{formatMoney(safeStats.clickPayme)}</b>
                </div>
                <div>
                  <span>{t("Qarz")}</span>
                  <b>{formatMoney(safeStats.debt)}</b>
                </div>
                <div>
                  <span>{t("Inkassa")}</span>
                  <b>{formatMoney(safeStats.inkassa)}</b>
                </div>
                <div>
                  <span>{t("Cash in")}</span>
                  <b>{formatMoney(safeStats.cashMovementIn)}</b>
                </div>
                <div>
                  <span>{t("Cash out")}</span>
                  <b>{formatMoney(safeStats.cashMovementOut)}</b>
                </div>
                {Object.entries(safeStats.currencyTotals || {}).map(([currency, amount]) => (
                  <div key={currency}>
                    <span>{currency}</span>
                    <b>{formatMoneyByCurrency(amount, currency)}</b>
                  </div>
                ))}
                <div>
                  <span>{t("O'tkazma")}</span>
                  <b>{formatMoney(safeStats.transfer)}</b>
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
                {smartAlerts.slice(0, 4).map((item) => (
                  <div className={`alert ${item.type}`} key={item.id}>
                    {item.title}: {item.message}
                  </div>
                ))}

                {smartAlerts.length === 0 && (
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

