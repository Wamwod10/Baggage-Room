import apiClient from "./apiClient";
import branchService from "./branchService";

const objectToChart = (object, keyName, valueName) =>
  Object.entries(object || {}).map(([key, value]) => ({
    [keyName]: key,
    [valueName]: Number(value || 0),
    amount: Number(value || 0),
  }));

const analyticsService = {
  async getData(period = "all", branchName = null) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const [dashboard, reports] = await Promise.all([
      apiClient.get("/analytics/dashboard", { params: { branchId } }),
      apiClient.get("/analytics/reports", { params: { branchId } }),
    ]);

    const dashboardData = dashboard.data || {};
    const reportData = reports.data || {};
    const dailyRevenue = Object.entries(reportData.revenueByDay || {}).map(([date, revenue]) => ({
      date,
      label: date,
      revenue: Number(revenue || 0),
      profit: Number(revenue || 0),
      expenses: 0,
    }));
    const paymentAnalytics = objectToChart(reportData.paymentAnalytics, "payment", "amount");
    const totalPayment = paymentAnalytics.reduce((sum, item) => sum + item.amount, 0) || 1;

    return {
      period,
      overview: {
        revenue: dashboardData.todayRevenue || 0,
        activeOrders: dashboardData.activeOrders || 0,
        debtAmount: dashboardData.debtAmount || 0,
        healthScore: 100,
      },
      healthScore: 100,
      dailyRevenue,
      branchComparison: Object.entries(reportData.revenueByBranch || {}).map(([branch, revenue]) => ({
        branch,
        revenue: Number(revenue || 0),
        profit: Number(revenue || 0),
        orders: 0,
      })),
      paymentAnalytics: paymentAnalytics.map((item) => ({
        ...item,
        payment: item.payment,
        percent: Math.round((item.amount / totalPayment) * 100),
      })),
      expenseCategories: [],
      peakHours: Object.entries(reportData.peakHours || {}).map(([hour, orders]) => ({
        hour,
        label: `${hour}:00`,
        orders,
      })),
      bestHour: { label: "-", orders: 0 },
      baggageSizeAnalytics: [],
      adminPerformance: (reportData.adminActivity || []).map((item) => ({
        admin: item.user?.name || item.user?.login || "-",
        orders: 0,
        revenue: 0,
        actions: 1,
      })),
      debtAnalytics: {
        amount: reportData.debtAnalytics?.open || dashboardData.debtAmount || 0,
        closed: reportData.debtAnalytics?.closed || 0,
      },
      cashMovementAnalytics: {
        in: (reportData.cashMovement || []).filter((item) => item.direction === "IN").reduce((sum, item) => sum + Number(item.amount || 0), 0),
        out: (reportData.cashMovement || []).filter((item) => item.direction === "OUT").reduce((sum, item) => sum + Number(item.amount || 0), 0),
      },
      financeAnalytics: {
        revenue: dashboardData.todayRevenue || 0,
        totalExpenses: 0,
        netProfit: dashboardData.netProfit || 0,
        profitMargin: 0,
        averageOrder: 0,
        averageShiftRevenue: 0,
        expenseRatio: 0,
      },
      currencyAnalytics: objectToChart(reportData.revenueByCurrency, "currency", "amount"),
      lockerUsage: Object.entries(reportData.lockerUsage || {}).map(([name, count]) => ({ name, count })),
      branchRanking: [],
      shiftAnalytics: { total: 0, open: 0, closed: 0, twelveHour: 0, twentyFourHour: 0, averageRevenue: 0 },
      problemAnalytics: [],
      customerAnalytics: { unique: dashboardData.todayClients || 0 },
      insights: [],
    };
  },
};

export default analyticsService;
