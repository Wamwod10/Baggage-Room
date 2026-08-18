import apiClient from "./apiClient";
import branchService from "./branchService";
import { asArray, getData, getItems, mapActivityLog, mapCashMovement, mapNotification, mapShift } from "./apiMappers";

const toNumber = (value) => Number(value ?? 0) || 0;

const mapDashboard = (data = {}) => ({
  stats: {
    revenue: toNumber(data.todayRevenue ?? data.totalRevenue ?? data.revenue),
    active: toNumber(data.activeOrders),
    ordersCount: toNumber(data.todayOrders ?? data.todayClients ?? data.totalOrders),
    totalOrders: toNumber(data.totalOrders),
    cancelledOrders: toNumber(data.cancelledOrders),
    netProfit: toNumber(data.netProfit),
    cashOnHand: toNumber(data.cashOnHand ?? data.cashLeft),
    cashLeft: toNumber(data.cashLeft ?? data.cashOnHand),
    cash: toNumber(data.paymentBreakdown?.CASH),
    card: toNumber(data.paymentBreakdown?.TERMINAL ?? data.paymentBreakdown?.CARD ?? data.paymentBreakdown?.TRANSFER),
    terminal: toNumber(data.paymentBreakdown?.TERMINAL ?? data.paymentBreakdown?.CARD ?? data.paymentBreakdown?.TRANSFER),
    click: toNumber(data.paymentBreakdown?.CLICK),
    payme: toNumber(data.paymentBreakdown?.PAYME),
    clickPayme: toNumber(data.paymentBreakdown?.CLICK) + toNumber(data.paymentBreakdown?.PAYME),
    transfer: toNumber(data.paymentBreakdown?.TRANSFER),
    debt: toNumber(data.debtAmount ?? data.openDebtAmount),
    freeLockers: toNumber(data.emptyLockers),
    activeLockers: toNumber(data.busyLockers),
    delayedLockers: toNumber(data.delayedOrders),
    inkassa: toNumber(data.inkassaAmount),
    cashMovementIn: toNumber(data.cashMovementIn ?? data.todayRevenue),
    cashMovementOut: toNumber(data.cashMovementOut),
    totalExpenses: toNumber(data.totalExpenses ?? data.expenseAmount),
    currencyTotals: data.currencyBreakdown || {},
    revenueByCurrency: data.revenueByCurrency || data.currencyBreakdown || {},
    expensesByCurrency: data.expensesByCurrency || {},
    inkassaByCurrency: data.inkassaByCurrency || {},
    debtByCurrency: data.debtByCurrency || {},
    cashOnHandByCurrency: data.cashOnHandByCurrency || {},
    netProfitByCurrency: data.netProfitByCurrency || {},
    paymentByCurrency: data.paymentCurrencyBreakdown || {},
  },
  branchSummary: asArray(data.branchSummary).map((branch) => ({
    ...branch,
    name: branch.name || branch.branch || "-",
    revenue: toNumber(branch.revenue),
    active: toNumber(branch.active ?? branch.activeOrders),
    delayed: toNumber(branch.delayed ?? branch.delayedOrders),
    freeLockers: toNumber(branch.freeLockers ?? branch.emptyLockers),
    orders: toNumber(branch.orders ?? branch.totalOrders),
    profit: toNumber(branch.profit ?? branch.netProfit),
  })),
  paymentBreakdown: data.paymentBreakdown || {},
  currencyBreakdown: data.currencyBreakdown || {},
  currentShifts: asArray(data.shiftStatus).map(mapShift),
  currentShift: asArray(data.shiftStatus)[0] ? mapShift(asArray(data.shiftStatus)[0]) : null,
  orders: [],
  expenses: [],
  notifications: [],
  activityLogs: [],
  cashMovements: [],
  lockers: [],
});

const dashboardService = {
  sync() {},

  async getData(branchName = null) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const [dashboard, notifications, audit, cash] = await Promise.all([
      apiClient.get("/analytics/dashboard", { params: { branchId } }),
      apiClient.get("/notifications", { params: { branchId, limit: 20 } }),
      apiClient.get("/audit", { params: { branchId, limit: 20 } }),
      apiClient.get("/cash-movements", { params: { branchId, limit: 20 } }),
    ]);

    return {
      ...mapDashboard(getData(dashboard, {})),
      notifications: getItems(notifications).map(mapNotification),
      activityLogs: getItems(audit).map(mapActivityLog),
      cashMovements: getItems(cash).map(mapCashMovement),
    };
  },

  async getStats(branchName = null) {
    return (await this.getData(branchName)).stats;
  },

  async getLiveActivity(limit = 8, branchName = null) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const response = await apiClient.get("/audit", { params: { branchId, limit } });
    return getItems(response).map(mapActivityLog);
  },
};

export default dashboardService;
