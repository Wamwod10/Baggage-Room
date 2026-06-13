import { useEffect, useState } from "react";
import {
  BarChart3,
  Briefcase,
  Clock3,
  DollarSign,
  Wallet,
  XCircle,
  CreditCard,
  Building2,
  Sparkles,
  Package,
  UserCheck,
  Timer,
  AlertTriangle,
  PieChart as PieChartIcon,
  Trophy,
  CalendarClock,
  RefreshCcw,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import analyticsService from "../../services/analyticsService";
import { useAuth } from "../../store/AuthContext";
import { ALL_BRANCHES_LABEL, getBranchNames } from "../../utils/branches";
import StateBlock from "../../components/StateBlock/StateBlock";
import { ChartSkeleton, StatSkeleton } from "../../components/Skeleton/Skeleton";
import GlassSelect from "../../components/GlassSelect/GlassSelect";
import usePageResource from "../../hooks/usePageResource";
import { useTranslation } from "../../i18n/useTranslation";
import { animateButtonIcon } from "../../utils/animateButtonIcon";
import { formatMoneyByCurrency } from "../../utils/currency";
import "./analytics.scss";

const emptyAnalyticsData = {
  overview: {
    revenue: 0,
    netProfit: 0,
    totalOrders: 0,
    activeOrders: 0,
    delayedOrders: 0,
    cancelledOrders: 0,
    healthScore: 0,
  },
  branchComparison: [],
  paymentAnalytics: [],
  baggageSizeAnalytics: [],
  insights: [],
  adminPerformance: [],
  dailyRevenue: [],
  expenseCategories: [],
  peakHours: [],
  problemAnalytics: [],
  financeAnalytics: {},
  currencyAnalytics: [],
  lockerUsage: [],
  customerAnalytics: {},
  debtAnalytics: {},
  cashMovementAnalytics: {},
  branchRanking: [],
  shiftAnalytics: {},
};

const chartColors = {
  primary: "#2563eb",
  success: "#16a34a",
  warning: "#f59e0b",
  danger: "#dc2626",
  muted: "#94a3b8",
  purple: "#7c3aed",
  cyan: "#0891b2",
};

const shortMoneyFormatter = (value) => {
  const amount = Number(value || 0);

  if (Math.abs(amount) >= 1000000) {
    return `${Math.round(amount / 1000000)}M`;
  }

  if (Math.abs(amount) >= 1000) {
    return `${Math.round(amount / 1000)}K`;
  }

  return `${amount}`;
};

const hasMetricData = (items, keys) =>
  (Array.isArray(items) ? items : []).some((item) =>
    keys.some((key) => Number(item?.[key] || 0) > 0),
  );

const truncateLabel = (value = "", limit = 14) =>
  String(value).length > limit ? `${String(value).slice(0, limit - 1)}...` : value;

function ChartTooltip({ active, payload, label, formatValue, ordersLabel }) {
  const safePayload = Array.isArray(payload) ? payload : [];
  if (!active || !safePayload.length) return null;

  return (
    <div className="chart-tooltip">
      <b>{label}</b>
      {safePayload.map((item) => (
        <span key={`${item.name}-${item.dataKey}`} style={{ "--tip-color": item.color }}>
          {item.name}:{" "}
          {String(item.dataKey).toLowerCase().includes("orders") ||
          String(item.dataKey).toLowerCase().includes("count") ||
          item.name === ordersLabel
            ? Number(item.value || 0).toLocaleString("uz-UZ")
            : formatValue(item.value)}
        </span>
      ))}
    </div>
  );
}

function ChartCard({ title, subtitle, insight, total, children }) {
  return (
    <div className="analytics-chart-card card">
      <div className="chart-card-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>

        {total && <strong>{total}</strong>}
      </div>

      <div className="chart-card-body">{children}</div>

      {insight && <div className="chart-insight">{insight}</div>}
    </div>
  );
}

export default function Analytics() {
  const { t, formatMoney } = useTranslation();
  const { activeBranch, effectiveBranch, isSuperAdmin, setActiveBranch } =
    useAuth();
  const branchNames = getBranchNames();

  const [period, setPeriod] = useState("all");
  const [viewMode, setViewMode] = useState("charts");

  const [refreshKey, setRefreshKey] = useState(0);

  const {
    data = emptyAnalyticsData,
    isLoading,
    error,
    retry,
  } = usePageResource(
    () => analyticsService.getData(period, effectiveBranch),
    [period, effectiveBranch, refreshKey],
    emptyAnalyticsData,
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const safeData = data && typeof data === "object" ? data : emptyAnalyticsData;
  const overview = { ...emptyAnalyticsData.overview, ...(safeData.overview || {}) };
  const dailyRevenue = Array.isArray(safeData.dailyRevenue) ? safeData.dailyRevenue : [];
  const paymentAnalytics = Array.isArray(safeData.paymentAnalytics) ? safeData.paymentAnalytics : [];
  const branchComparison = Array.isArray(safeData.branchComparison) ? safeData.branchComparison : [];
  const expenseCategories = Array.isArray(safeData.expenseCategories) ? safeData.expenseCategories : [];
  const peakHours = Array.isArray(safeData.peakHours) ? safeData.peakHours : [];
  const baggageSizeAnalytics = Array.isArray(safeData.baggageSizeAnalytics) ? safeData.baggageSizeAnalytics : [];
  const adminPerformance = Array.isArray(safeData.adminPerformance) ? safeData.adminPerformance : [];
  const problemAnalytics = Array.isArray(safeData.problemAnalytics) ? safeData.problemAnalytics : [];
  const currencyAnalytics = Array.isArray(safeData.currencyAnalytics) ? safeData.currencyAnalytics : [];
  const lockerUsage = Array.isArray(safeData.lockerUsage) ? safeData.lockerUsage : [];
  const branchRanking = Array.isArray(safeData.branchRanking) ? safeData.branchRanking : [];
  const insights = Array.isArray(safeData.insights) ? safeData.insights : [];
  const financeAnalytics = safeData.financeAnalytics || {};
  const debtAnalytics = safeData.debtAnalytics || {};
  const cashMovementAnalytics = safeData.cashMovementAnalytics || {};
  const customerAnalytics = safeData.customerAnalytics || {};
  const shiftAnalytics = safeData.shiftAnalytics || {};
  const healthScore = overview.healthScore ?? safeData.healthScore ?? 0;
  const hasAnalyticsData =
    overview.totalOrders > 0 ||
    overview.revenue > 0 ||
    (shiftAnalytics.total || 0) > 0;
  const hasPeriodFilter = period !== "all";
  const revenueChartData = dailyRevenue;
  const paymentChartData = paymentAnalytics.filter(
    (item) => item.amount > 0,
  );
  const branchChartData = branchComparison;
  const expenseChartData =
    hasMetricData(dailyRevenue, ["expenses", "revenue"]) ||
    !expenseCategories.length
      ? dailyRevenue
      : expenseCategories;
  const peakHourChartData = peakHours;
  const sizeChartData = baggageSizeAnalytics;
  const adminChartData = adminPerformance;
  const bestPayment = [...paymentChartData].sort((a, b) => b.amount - a.amount)[0];
  const bestSize = [...sizeChartData].sort((a, b) => b.amount - a.amount)[0];
  const bestAdmin = [...adminChartData].sort((a, b) => b.revenue - a.revenue)[0];

  const cards = [
    {
      title: t("Umumiy savdo"),
      value: formatMoney(overview.revenue),
      icon: DollarSign,
    },
    {
      title: t("Sof foyda"),
      value: formatMoney(overview.netProfit),
      icon: Wallet,
    },
    {
      title: t("Kassada qolgan"),
      value: formatMoney(overview.cashOnHand ?? financeAnalytics?.cashOnHand ?? 0),
      icon: Wallet,
    },
    {
      title: t("Jami orderlar"),
      value: `${overview.totalOrders} ${t("ta")}`,
      icon: BarChart3,
    },
    {
      title: t("Aktiv baggage"),
      value: `${overview.activeOrders} ${t("ta")}`,
      icon: Briefcase,
    },
    {
      title: t("Kechikkan baggage"),
      value: `${overview.delayedOrders} ${t("ta")}`,
      icon: Clock3,
    },
    {
      title: t("Qarz"),
      value: formatMoney(debtAnalytics?.amount || overview.debtAmount || 0),
      icon: AlertTriangle,
    },
    {
      title: t("Unique customers"),
      value: `${customerAnalytics?.unique || 0} ${t("ta")}`,
      icon: UserCheck,
    },
    {
      title: t("Bekor qilingan"),
      value: `${overview.cancelledOrders} ${t("ta")}`,
      icon: XCircle,
    },
    {
      title: t("AI Health Score"),
      value: `${healthScore}/100`,
      icon: Sparkles,
    },
  ];

  return (
    <section className="page analytics-page">
      <div className="page-header compact-header">
        <div>
          <h1>{t("Analytics")}</h1>
          <p>{t("Kompaniya, filial, savdo va baggage statistikasi")}</p>
        </div>
        <div className="analytics-filter">
          <div className="analytics-view-toggle" role="group" aria-label="Analytics view">
            <button
              type="button"
              className={viewMode === "charts" ? "active" : ""}
              onClick={() => setViewMode("charts")}
            >
              {t("Chart")}
            </button>
            <button
              type="button"
              className={viewMode === "stats" ? "active" : ""}
              onClick={() => setViewMode("stats")}
            >
              {t("Statistika")}
            </button>
          </div>

          <GlassSelect value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="all">{t("Hammasi")}</option>
            <option value="today">{t("Bugun")}</option>
            <option value="7d">{t("7 kun")}</option>
            <option value="30d">{t("30 kun")}</option>
          </GlassSelect>
          {isSuperAdmin && (
            <GlassSelect
              value={activeBranch}
              onChange={(e) => setActiveBranch(e.target.value)}
            >
              <option value={ALL_BRANCHES_LABEL}>{t("Barcha filiallar")}</option>
              {branchNames.map((branch) => (
                <option key={branch} value={branch}>
                  {t(branch)}
                </option>
              ))}
            </GlassSelect>
          )}
          <button
            className="analytics-refresh-btn"
            type="button"
            onClick={(event) => {
              animateButtonIcon(event);
              setRefreshKey((prev) => prev + 1);
            }}
          >
            <RefreshCcw size={16} />
            {t("Refresh")}
          </button>
        </div>
      </div>

      {error ? (
        <StateBlock
          type="error"
          title={t("Analitika yuklanmadi")}
          description={t("Analitika ma'lumotlarini hisoblashda xatolik yuz berdi.")}
          actionLabel={t("Qayta urinish")}
          onAction={retry}
        />
      ) : isLoading ? (
        <>
          {viewMode === "stats" ? (
            <StatSkeleton count={4} />
          ) : (
            <div className="analytics-chart-grid">
              <div className="analytics-chart-card card">
                <ChartSkeleton />
              </div>
              <div className="analytics-chart-card card">
                <ChartSkeleton />
              </div>
            </div>
          )}
        </>
      ) : (
        <>
      {viewMode === "stats" && (
        <>
      <div className="analytics-cards">
        {cards.map((item) => {
          const Icon = item.icon;

          return (
            <div className="analytics-card card" key={item.title}>
              <div className="analytics-card-icon">
                <Icon size={22} />
              </div>

              <div>
                <span>{item.title}</span>
                <h3>{item.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {!hasAnalyticsData && (
        <StateBlock
          type={hasPeriodFilter ? "search" : "analytics"}
          title={
            hasPeriodFilter
              ? t("Tanlangan davr uchun yetarli data yo'q")
              : t("Analitika uchun data yetarli emas")
          }
          description={
            hasPeriodFilter
              ? t("Davr filterini kengaytiring yoki yangi orderlar yaratilishini kuting.")
              : t("Order, shift va harajatlar paydo bo'lganda bu sahifa to'liq analitika beradi.")
          }
        />
      )}
        </>
      )}

      {viewMode === "charts" && (
      <div className="analytics-chart-grid">
        <ChartCard
          title={t("Revenue trend")}
          subtitle={t("Kunlar bo'yicha savdo va orderlar")}
          total={formatMoney(overview.revenue)}
          insight={
            hasMetricData(revenueChartData, ["revenue"])
              ? t("{{days}} kunlik trend, {{orders}} ta order", {
                  days: revenueChartData.length,
                  orders: overview.totalOrders,
                })
              : t("Trend uchun order data kerak")
          }
        >
          {hasMetricData(revenueChartData, ["revenue"]) ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenueChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="chart-grid-line" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={18} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={shortMoneyFormatter} width={42} />
                <Tooltip content={<ChartTooltip formatValue={formatMoney} ordersLabel={t("Orders")} />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name={t("Revenue")}
                  stroke={chartColors.primary}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  name={t("Net profit")}
                  stroke={chartColors.success}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <StateBlock
              type="empty"
              compact
              title={t("Ma'lumot yetarli emas")}
              description={t("Kunlik revenue chart uchun orderlar mavjud emas.")}
            />
          )}
        </ChartCard>

        <ChartCard
          title={isSuperAdmin ? t("Branch comparison") : t("Filial summary")}
          subtitle={t("Revenue, order va sof foyda taqqoslash")}
          insight={
            isSuperAdmin
              ? t("Filiallar kesimida performance")
              : t("Branch admin uchun faqat o'z filiali ko'rsatiladi")
          }
        >
          {hasMetricData(branchChartData, ["revenue", "orders", "profit"]) ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={branchChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="chart-grid-line" />
                <XAxis
                  dataKey="branch"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => truncateLabel(value)}
                />
                <YAxis yAxisId="money" tickLine={false} axisLine={false} tickFormatter={shortMoneyFormatter} width={42} />
                <YAxis yAxisId="orders" orientation="right" tickLine={false} axisLine={false} width={28} />
                <Tooltip content={<ChartTooltip formatValue={formatMoney} ordersLabel={t("Orders")} />} />
                <Legend />
                <Bar yAxisId="money" dataKey="revenue" name={t("Revenue")} fill={chartColors.primary} radius={[8, 8, 0, 0]} />
                <Bar yAxisId="money" dataKey="profit" name={t("Net profit")} fill={chartColors.success} radius={[8, 8, 0, 0]} />
                <Bar yAxisId="orders" dataKey="orders" name={t("Orders")} fill={chartColors.warning} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <StateBlock
              type="empty"
              compact
              title={t("Ma'lumot yetarli emas")}
              description={t("Filial taqqoslash uchun order yoki shift data kerak.")}
            />
          )}
        </ChartCard>

        <ChartCard
          title={t("Payment mix")}
          subtitle={t("To'lov turlari bo'yicha summa")}
          insight={bestPayment ? `${t("Eng katta ulush")}: ${t(bestPayment.payment)}` : t("Payment data mavjud emas")}
        >
          {paymentChartData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Tooltip content={<ChartTooltip formatValue={formatMoney} ordersLabel={t("Orders")} />} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                <Pie
                  data={paymentChartData}
                  dataKey="amount"
                  nameKey="payment"
                  innerRadius="52%"
                  outerRadius="78%"
                  paddingAngle={3}
                >
                  {paymentChartData.map((entry, index) => (
                    <Cell
                      key={entry.payment}
                      fill={[
                        chartColors.success,
                        chartColors.primary,
                        chartColors.cyan,
                        chartColors.warning,
                      ][index % 4]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <StateBlock
              type="empty"
              compact
              title={t("Ma'lumot yetarli emas")}
              description={t("To'lov charti uchun to'langan orderlar kerak.")}
            />
          )}
        </ChartCard>

        <ChartCard
          title={t("Revenue vs expenses")}
          subtitle={t("Kunlar bo'yicha revenue va harajat")}
          total={formatMoney(overview.totalExpenses)}
          insight={
            hasMetricData(expenseChartData, ["expenses", "amount"])
              ? `${t("Expense ratio")}: ${financeAnalytics?.expenseRatio || 0}%`
              : t("Harajat data mavjud emas")
          }
        >
          {hasMetricData(expenseChartData, ["expenses", "amount"]) ? (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={expenseChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="chart-grid-line" />
                <XAxis
                  dataKey={expenseChartData[0]?.category ? "category" : "label"}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => truncateLabel(value, 12)}
                />
                <YAxis tickLine={false} axisLine={false} tickFormatter={shortMoneyFormatter} width={42} />
                <Tooltip content={<ChartTooltip formatValue={formatMoney} ordersLabel={t("Orders")} />} />
                <Legend />
                <Bar dataKey={expenseChartData[0]?.category ? "amount" : "expenses"} name={t("Expenses")} fill={chartColors.danger} radius={[8, 8, 0, 0]} />
                {!expenseChartData[0]?.category && (
                  <Line type="monotone" dataKey="revenue" name={t("Revenue")} stroke={chartColors.primary} strokeWidth={3} dot={false} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <StateBlock
              type="empty"
              compact
              title={t("Harajat data yo'q")}
              description={t("Expense qo'shilganda chart avtomatik shakllanadi.")}
            />
          )}
        </ChartCard>

        <ChartCard
          title={t("Peak hours")}
          subtitle={t("00:00-23:00 oralig'ida order count")}
          insight={
            safeData.bestHour?.orders > 0
              ? t("Peak: {{time}}, {{orders}} ta order", {
                  time: safeData.bestHour.label,
                  orders: safeData.bestHour.orders,
                })
              : t("Peak hour hali shakllanmagan")
          }
        >
          {hasMetricData(peakHourChartData, ["orders"]) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={peakHourChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="chart-grid-line" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={2} />
                <YAxis tickLine={false} axisLine={false} width={32} />
                <Tooltip content={<ChartTooltip formatValue={formatMoney} ordersLabel={t("Orders")} />} />
                <Bar dataKey="orders" name={t("Orders")} fill={chartColors.cyan} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <StateBlock
              type="empty"
              compact
              title={t("Ma'lumot yetarli emas")}
              description={t("Soatlar kesimidagi chart uchun orderlar kerak.")}
            />
          )}
        </ChartCard>

        <ChartCard
          title={t("Baggage sizes")}
          subtitle={t("Razmer bo'yicha order, son va revenue")}
          insight={bestSize ? `${t("Eng yuqori revenue")}: ${t(bestSize.size)}` : t("Bagaj razmeri data mavjud emas")}
        >
          {hasMetricData(sizeChartData, ["orders", "count", "amount"]) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sizeChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="chart-grid-line" />
                <XAxis dataKey="size" tickLine={false} axisLine={false} />
                <YAxis yAxisId="money" tickLine={false} axisLine={false} tickFormatter={shortMoneyFormatter} width={42} />
                <YAxis yAxisId="count" orientation="right" tickLine={false} axisLine={false} width={28} />
                <Tooltip content={<ChartTooltip formatValue={formatMoney} ordersLabel={t("Orders")} />} />
                <Legend />
                <Bar yAxisId="money" dataKey="amount" name={t("Revenue")} fill={chartColors.purple} radius={[8, 8, 0, 0]} />
                <Bar yAxisId="count" dataKey="count" name={t("Baggage count")} fill={chartColors.warning} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <StateBlock
              type="empty"
              compact
              title={t("Ma'lumot yetarli emas")}
              description={t("Bagaj razmerlari bo'yicha orderlar kerak.")}
            />
          )}
        </ChartCard>

        <ChartCard
          title={t("Admin performance")}
          subtitle={t("Adminlar bo'yicha revenue, order va shift")}
          insight={bestAdmin ? `${t("Eng yuqori revenue")}: ${bestAdmin.admin}` : t("Admin data mavjud emas")}
        >
          {hasMetricData(adminChartData, ["revenue", "orders", "shifts"]) ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={adminChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="chart-grid-line" />
                <XAxis
                  dataKey="admin"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => truncateLabel(value)}
                />
                <YAxis yAxisId="money" tickLine={false} axisLine={false} tickFormatter={shortMoneyFormatter} width={42} />
                <YAxis yAxisId="count" orientation="right" tickLine={false} axisLine={false} width={28} />
                <Tooltip content={<ChartTooltip formatValue={formatMoney} ordersLabel={t("Orders")} />} />
                <Legend />
                <Bar yAxisId="money" dataKey="revenue" name={t("Revenue")} fill={chartColors.success} radius={[8, 8, 0, 0]} />
                <Bar yAxisId="count" dataKey="orders" name={t("Orders")} fill={chartColors.primary} radius={[8, 8, 0, 0]} />
                <Bar yAxisId="count" dataKey="shifts" name={t("Shifts")} fill={chartColors.muted} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <StateBlock
              type="empty"
              compact
              title={t("Admin statistikasi yo'q")}
              description={t("Shiftlar va orderlar yig'ilganda chart chiqadi.")}
            />
          )}
        </ChartCard>
      </div>
      )}

      {viewMode === "stats" && (
      <div className="analytics-grid">
        <div className="analytics-panel card">
          <div className="analytics-panel-head">
            <div>
              <h2>{t("Filiallar statistikasi")}</h2>
              <p>{t("Har bir filial kesimida")}</p>
            </div>

            <Building2 size={20} />
          </div>

          <div className="branch-analytics-list">
            {branchComparison.length === 0 && (
              <StateBlock
                type="empty"
                compact
                title={t("Filial statistikasi yo'q")}
                description={t("Filiallar bo'yicha data hali shakllanmagan.")}
              />
            )}

            {branchComparison.map((branch) => (
              <div className="branch-analytics-row" key={branch.branch}>
                <div className="branch-analytics-main">
                  <h3>{t(branch.branch)}</h3>

                  <div className="branch-analytics-meta">
                    <span>{branch.orders} {t("order")}</span>
                    <span>{branch.active} {t("Aktiv")}</span>
                    <span>{branch.delayed} {t("Kechikdi")}</span>
                  </div>
                </div>

                <div className="branch-analytics-money">
                  <b>{formatMoney(branch.revenue)}</b>

                  <small>
                    {t("Net profit")}: {formatMoney(branch.profit)}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-panel card">
          <div className="analytics-panel-head">
            <div>
              <h2>{t("Payment analytics")}</h2>
              <p>{t("To'lov turlari bo'yicha")}</p>
            </div>

            <CreditCard size={20} />
          </div>

          <div className="payment-analytics-list">
            {paymentAnalytics.length === 0 && (
              <StateBlock
                type="empty"
                compact
                title={t("Payment data yo'q")}
                description={t("To'lovlar paydo bo'lganda ulushlar ko'rinadi.")}
              />
            )}

            {paymentAnalytics.map((item) => (
              <div className="payment-analytics-item" key={item.payment}>
                <div className="payment-analytics-top">
                  <span>{t(item.payment)}</span>
                  <b>{item.percent}%</b>
                </div>

                <div className="payment-progress">
                  <div
                    className="payment-progress-fill"
                    style={{
                      width: `${item.percent}%`,
                    }}
                  />
                </div>

                <div className="payment-analytics-bottom">
                  <small>{item.orders} {t("ta")} {t("order")}</small>

                  <b>{formatMoney(item.amount)}</b>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-panel card">
          <div className="analytics-panel-head">
            <div>
              <h2>{t("Baggage size analytics")}</h2>
              <p>{t("Bagaj hajmi bo'yicha")}</p>
            </div>

            <Package size={20} />
          </div>

          <div className="size-analytics-list">
            {baggageSizeAnalytics.length === 0 && (
              <StateBlock
                type="empty"
                compact
                title={t("Bagaj statistikasi yo'q")}
                description={t("Bagaj razmerlari bo'yicha data hali mavjud emas.")}
              />
            )}

            {baggageSizeAnalytics.map((item) => (
              <div className="size-analytics-item" key={item.size}>
                <div>
                  <h3>{t(item.size)}</h3>

                  <p>
                    {item.count} {t("ta")} {t("Baggage")} - {item.orders} {t("order")}
                  </p>
                </div>

                <b>{formatMoney(item.amount)}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-panel card">
          <div className="analytics-panel-head">
            <div>
              <h2>{t("Admin performance")}</h2>
              <p>{t("Kassa ochgan adminlar bo'yicha")}</p>
            </div>

            <UserCheck size={20} />
          </div>

          <div className="admin-performance-list">
            {(adminPerformance || []).length === 0 && (
              <StateBlock
                type="empty"
                compact
                title={t("Admin statistikasi yo'q")}
                description={t("Shiftlar yopilganda admin performance ko'rinadi.")}
              />
            )}

            {(adminPerformance || []).map((item) => (
              <div className="admin-performance-row" key={item.admin}>
                <div>
                  <h3>{item.admin}</h3>
                  <p>{item.shifts} {t("ta")} {t("Shift")}</p>
                </div>

                <div className="admin-performance-money">
                  <b>{formatMoney(item.revenue)}</b>
                  <small>
                    {t("Net profit")}: {formatMoney(item.profit)}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-panel card">
          <div className="analytics-panel-head">
            <div>
              <h2>{t("Peak hours")}</h2>
              <p>{t("Kun davomida orderlar qaysi soatda ko'p tushgan")}</p>
            </div>

            <Timer size={20} />
          </div>

          <div className="peak-hours-list">
            {(peakHours || [])
              .filter((item) => item.orders > 0)
              .slice(0, 8)
              .map((item) => (
                <div className="peak-hour-row" key={item.hour}>
                  <div>
                    <h3>{item.label}</h3>
                    <p>{item.orders} {t("ta")} {t("order")}</p>
                  </div>

                  <b>{formatMoney(item.amount)}</b>
                </div>
              ))}

            {(peakHours || []).filter((item) => item.orders > 0).length ===
              0 && (
              <StateBlock
                type="empty"
                compact
                title={t("Peak hour data yo'q")}
                description={t("Orderlar ko'payganda eng aktiv vaqtlar chiqadi.")}
              />
            )}
          </div>
        </div>

        <div className="analytics-panel card">
          <div className="analytics-panel-head">
            <div>
              <h2>{t("Problem analytics")}</h2>
              <p>{t("Risklar va muammoli holatlar")}</p>
            </div>

            <AlertTriangle size={20} />
          </div>

          <div className="problem-analytics-list">
            {(problemAnalytics || []).map((item) => (
              <div
                className={`problem-analytics-row ${item.level}`}
                key={item.title}
              >
                <div>
                  <h3>{t(item.title)}</h3>
                  <p>{t(item.description)}</p>
                </div>

                <b>
                  {item.isMoney
                    ? formatMoney(item.value)
                    : `${item.value}${item.suffix || ""}`}
                </b>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-panel card">
          <div className="analytics-panel-head">
            <div>
              <h2>{t("Finance analytics")}</h2>
              <p>{t("Moliyaviy umumiy holat")}</p>
            </div>

            <PieChartIcon size={20} />
          </div>

          <div className="finance-analytics-grid">
            <div>
              <span>{t("Qarz")}</span>
              <b>{formatMoney(debtAnalytics?.amount)}</b>
            </div>

            <div>
              <span>{t("Cash in")}</span>
              <b>{formatMoney(cashMovementAnalytics?.in)}</b>
            </div>

            <div>
              <span>{t("Cash out")}</span>
              <b>{formatMoney(cashMovementAnalytics?.out)}</b>
            </div>

            <div>
              <span>{t("Debt closed")}</span>
              <b>{debtAnalytics?.closed || 0}</b>
            </div>

            <div>
              <span>{t("Revenue")}</span>
              <b>{formatMoney(financeAnalytics?.revenue)}</b>
            </div>

            <div>
              <span>{t("Expenses")}</span>
              <b>{formatMoney(financeAnalytics?.totalExpenses)}</b>
            </div>

            <div>
              <span>{t("Inkassa")}</span>
              <b>{formatMoney(financeAnalytics?.totalInkassa)}</b>
            </div>

            <div>
              <span>{t("Net profit")}</span>
              <b>{formatMoney(financeAnalytics?.netProfit)}</b>
            </div>

            <div>
              <span>{t("Kassada qolgan")}</span>
              <b>{formatMoney(financeAnalytics?.cashOnHand)}</b>
            </div>

            <div>
              <span>{t("Profit margin")}</span>
              <b>{financeAnalytics?.profitMargin || 0}%</b>
            </div>

            <div>
              <span>{t("Average order")}</span>
              <b>{formatMoney(Math.round(financeAnalytics?.averageOrder || 0))}</b>
            </div>

            <div>
              <span>{t("Average shift revenue")}</span>
              <b>{formatMoney(Math.round(financeAnalytics?.averageShiftRevenue || 0))}</b>
            </div>

            <div>
              <span>{t("Expense ratio")}</span>
              <b>{financeAnalytics?.expenseRatio || 0}%</b>
            </div>
          </div>
        </div>

        <div className="analytics-panel card">
          <div className="analytics-panel-head">
            <div>
              <h2>{t("Currency analytics")}</h2>
              <p>{t("Valyutalar kesimida real paid amount")}</p>
            </div>

            <DollarSign size={20} />
          </div>

          <div className="finance-analytics-grid">
            {(currencyAnalytics || []).map((item) => (
              <div key={item.currency}>
                <span>{item.currency}</span>
                <b>{formatMoneyByCurrency(item.amount, item.currency)}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-panel card">
          <div className="analytics-panel-head">
            <div>
              <h2>{t("Yacheyka usage")}</h2>
              <p>{t("Bosh, band, kechikkan va servis holati")}</p>
            </div>

            <Package size={20} />
          </div>

          <div className="finance-analytics-grid">
            {(lockerUsage || []).map((item) => (
              <div key={item.status}>
                <span>{t(item.status)}</span>
                <b>{item.count}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-panel card">
          <div className="analytics-panel-head">
            <div>
              <h2>{t("Branch ranking")}</h2>
              <p>{t("Filiallar performance score bo'yicha")}</p>
            </div>

            <Trophy size={20} />
          </div>

          <div className="branch-ranking-list">
            {(branchRanking || []).map((item, index) => (
              <div className="branch-ranking-row" key={item.branch}>
                <div className="branch-rank-left">
                  <strong>#{index + 1}</strong>

                  <div>
                    <h3>{t(item.branch)}</h3>
                    <p>
                      {item.orders} {t("order")} - {item.delayed} {t("Kechikdi")} -{" "}
                      {item.cancelled} {t("Cancelled")}
                    </p>
                  </div>
                </div>

                <div className="branch-rank-score">
                  <b>{item.score}/100</b>
                  <span>{formatMoney(item.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-panel card">
          <div className="analytics-panel-head">
            <div>
              <h2>{t("Shift analytics")}</h2>
              <p>{t("Kassa smenalari bo'yicha holat")}</p>
            </div>

            <CalendarClock size={20} />
          </div>

          <div className="shift-analytics-grid">
            <div>
              <span>{t("Jami shiftlar")}</span>
              <b>{shiftAnalytics?.total || 0}</b>
            </div>

            <div>
              <span>{t("Ochiq shiftlar")}</span>
              <b>{shiftAnalytics?.open || 0}</b>
            </div>

            <div>
              <span>{t("Yopilgan shiftlar")}</span>
              <b>{shiftAnalytics?.closed || 0}</b>
            </div>

            <div>
              <span>{t("12 soatlik")}</span>
              <b>{shiftAnalytics?.twelveHour || 0}</b>
            </div>

            <div>
              <span>{t("24 soatlik")}</span>
              <b>{shiftAnalytics?.twentyFourHour || 0}</b>
            </div>

            <div>
              <span>{t("O'rtacha shift savdosi")}</span>
              <b>{formatMoney(Math.round(shiftAnalytics?.averageRevenue || 0))}</b>
            </div>
          </div>

          {shiftAnalytics?.bestShift && (
            <div className="best-shift-box">
              <span>{t("Eng kuchli shift")}</span>
              <h3>{t(shiftAnalytics.bestShift.branch)}</h3>
              <p>
                {shiftAnalytics.bestShift.admin} -{" "}
                {shiftAnalytics.bestShift.shiftTime || "-"}
              </p>
              <b>
                {formatMoney(
                  shiftAnalytics.bestShift.analyticsRevenue ||
                    shiftAnalytics.bestShift.totalRevenue ||
                    0,
                )}
              </b>
            </div>
          )}
        </div>

        <div className="analytics-panel card">
          <div className="analytics-panel-head">
            <div>
              <h2>{t("Smart insights")}</h2>
              <p>{t("AI-like tavsiyalar")}</p>
            </div>

            <Sparkles size={20} />
          </div>

          <div className="insights-list">
            {insights.length === 0 && (
              <StateBlock
                type="empty"
                compact
                title={t("Insight yo'q")}
                description={t("Analitika uchun yetarli data yig'ilganda tavsiyalar chiqadi.")}
              />
            )}

            {insights.map((item, index) => (
              <div className="insight-item" key={index}>
                {t(item)}
              </div>
            ))}
          </div>
        </div>
      </div>
      )}
        </>
      )}
    </section>
  );
}

