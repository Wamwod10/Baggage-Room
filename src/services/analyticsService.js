import apiClient from "./apiClient";
import branchService from "./branchService";
import { asArray, getData, paymentMap } from "./apiMappers";

const toNumber = (value) => Number(value ?? 0) || 0;

const objectToChart = (object, keyName, valueName) =>
  Object.entries(object || {}).map(([key, value]) => ({
    [keyName]: key,
    [valueName]: toNumber(value),
    amount: toNumber(value),
  }));

const periodToParams = (period) => {
  if (period === "all") return {};

  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);

  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "7d") {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (period === "30d") {
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  } else {
    return {};
  }

  return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
};

const objectKeys = (...objects) => [...new Set(objects.flatMap((object) => Object.keys(object || {})))];

const analyticsService = {
  async getData(period = "all", branchName = null) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const reportParams = { branchId, ...periodToParams(period) };
    const [dashboard, reports] = await Promise.all([
      apiClient.get("/analytics/dashboard", { params: { branchId } }),
      apiClient.get("/analytics/reports", { params: reportParams }),
    ]);

    const dashboardData = getData(dashboard, {}) || {};
    const reportData = getData(reports, {}) || {};
    const orderStats = reportData.orderStats || {};
    const finance = reportData.financeAnalytics || {};
    const revenueByDay = reportData.revenueByDay || {};
    const expensesByDay = reportData.expensesByDay || {};
    const ordersByDay = reportData.ordersByDay || {};

    const dailyRevenue = objectKeys(revenueByDay, expensesByDay, ordersByDay).sort().map((date) => ({
      date,
      label: date,
      revenue: toNumber(revenueByDay[date]),
      profit: toNumber(revenueByDay[date]) - toNumber(expensesByDay[date]),
      expenses: toNumber(expensesByDay[date]),
      orders: toNumber(ordersByDay[date]),
    }));
    const paymentAnalytics = objectToChart(reportData.paymentAnalytics, "payment", "amount").map((item) => ({
      ...item,
      payment: paymentMap[item.payment] || item.payment,
      orders: toNumber(reportData.paymentOrderCounts?.[item.payment]),
    }));
    const totalPayment = paymentAnalytics.reduce((sum, item) => sum + item.amount, 0) || 1;
    const peakHours = Object.entries(reportData.peakHours || {}).map(([hour, orders]) => ({
      hour,
      label: `${hour}:00`,
      orders: toNumber(orders),
      amount: toNumber(revenueByDay[hour]),
    }));
    const bestHour = [...peakHours].sort((a, b) => b.orders - a.orders)[0] || { label: "-", orders: 0 };
    const revenue = toNumber(finance.revenue ?? dashboardData.totalRevenue ?? dashboardData.todayRevenue);
    const totalExpenses = toNumber(finance.totalExpenses ?? dashboardData.totalExpenses ?? dashboardData.expenseAmount);
    const netProfit = toNumber(finance.netProfit ?? dashboardData.netProfit);
    const totalOrders = toNumber(orderStats.totalOrders ?? dashboardData.totalOrders ?? dashboardData.todayOrders ?? dashboardData.todayClients);

    return {
      period,
      overview: {
        revenue,
        netProfit,
        totalExpenses,
        totalOrders,
        activeOrders: toNumber(orderStats.activeOrders ?? dashboardData.activeOrders),
        delayedOrders: toNumber(orderStats.delayedOrders ?? dashboardData.delayedOrders),
        cancelledOrders: toNumber(orderStats.cancelledOrders ?? dashboardData.cancelledOrders),
        debtAmount: toNumber(reportData.debtAnalytics?.open ?? dashboardData.debtAmount),
        healthScore: 100,
      },
      healthScore: 100,
      dailyRevenue,
      branchComparison: asArray(reportData.branchComparison).length ? asArray(reportData.branchComparison).map((branch) => ({
        branch: branch.branch || branch.name || "-",
        revenue: toNumber(branch.revenue),
        profit: toNumber(branch.profit ?? branch.netProfit),
        orders: toNumber(branch.orders ?? branch.totalOrders),
        active: toNumber(branch.active ?? branch.activeOrders),
        delayed: toNumber(branch.delayed ?? branch.delayedOrders),
        cancelled: toNumber(branch.cancelled ?? branch.cancelledOrders),
        score: toNumber(branch.score),
      })) : Object.entries(reportData.revenueByBranch || {}).map(([branch, revenue]) => ({
        branch,
        revenue: toNumber(revenue),
        profit: toNumber(revenue),
        orders: 0,
      })),
      paymentAnalytics: paymentAnalytics.map((item) => ({
        ...item,
        payment: item.payment,
        percent: Math.round((item.amount / totalPayment) * 100),
      })),
      expenseCategories: asArray(reportData.expenseCategories).map((item) => ({
        category: item.category || "-",
        amount: toNumber(item.amount),
        count: toNumber(item.count),
      })),
      peakHours,
      bestHour,
      baggageSizeAnalytics: asArray(reportData.baggageSizeAnalytics).map((item) => ({
        size: item.size || "-",
        orders: toNumber(item.orders),
        count: toNumber(item.count),
        amount: toNumber(item.amount),
      })),
      adminPerformance: asArray(reportData.adminPerformance).map((item) => ({
        admin: item.admin || "-",
        orders: toNumber(item.orders),
        revenue: toNumber(item.revenue),
        profit: toNumber(item.profit),
        shifts: toNumber(item.shifts),
        actions: toNumber(item.actions),
      })),
      debtAnalytics: {
        amount: toNumber(reportData.debtAnalytics?.open ?? dashboardData.debtAmount),
        closed: toNumber(reportData.debtAnalytics?.closed),
      },
      cashMovementAnalytics: {
        in: toNumber(reportData.cashMovementAnalytics?.in) || asArray(reportData.cashMovement).filter((item) => item.direction === "IN").reduce((sum, item) => sum + toNumber(item.amount), 0),
        out: toNumber(reportData.cashMovementAnalytics?.out) || asArray(reportData.cashMovement).filter((item) => item.direction === "OUT").reduce((sum, item) => sum + toNumber(item.amount), 0),
      },
      financeAnalytics: {
        revenue,
        totalExpenses,
        netProfit,
        profitMargin: toNumber(finance.profitMargin),
        averageOrder: toNumber(finance.averageOrder),
        averageShiftRevenue: toNumber(finance.averageShiftRevenue),
        expenseRatio: toNumber(finance.expenseRatio),
      },
      currencyAnalytics: objectToChart(reportData.revenueByCurrency, "currency", "amount"),
      lockerUsage: Object.entries(reportData.lockerUsage || {}).map(([status, count]) => ({ status, name: status, count: toNumber(count) })),
      branchRanking: asArray(reportData.branchRanking).map((item) => ({
        branch: item.branch || "-",
        orders: toNumber(item.orders),
        delayed: toNumber(item.delayed),
        cancelled: toNumber(item.cancelled),
        score: toNumber(item.score),
        revenue: toNumber(item.revenue),
      })),
      shiftAnalytics: {
        total: toNumber(reportData.shiftAnalytics?.total),
        open: toNumber(reportData.shiftAnalytics?.open),
        closed: toNumber(reportData.shiftAnalytics?.closed),
        twelveHour: toNumber(reportData.shiftAnalytics?.twelveHour),
        twentyFourHour: toNumber(reportData.shiftAnalytics?.twentyFourHour),
        averageRevenue: toNumber(reportData.shiftAnalytics?.averageRevenue),
        bestShift: reportData.shiftAnalytics?.bestShift || null,
      },
      problemAnalytics: [],
      customerAnalytics: { unique: toNumber(dashboardData.todayClients ?? totalOrders) },
      insights: [],
    };
  },
};

export default analyticsService;
