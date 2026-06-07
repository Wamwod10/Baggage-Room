import apiClient from "./apiClient";
import branchService from "./branchService";
import { asArray, getArrayData, getData, getItems, mapActivityLog, mapCashMovement, mapLocker, mapNotification, mapOrder, mapShift } from "./apiMappers";

const toNumber = (value) => Number(value ?? 0) || 0;

const mapDashboard = (data = {}) => ({
  stats: {
    revenue: toNumber(data.todayRevenue ?? data.totalRevenue ?? data.revenue),
    active: toNumber(data.activeOrders),
    ordersCount: toNumber(data.todayOrders ?? data.todayClients ?? data.totalOrders),
    totalOrders: toNumber(data.totalOrders),
    cancelledOrders: toNumber(data.cancelledOrders),
    netProfit: toNumber(data.netProfit),
    cash: toNumber(data.paymentBreakdown?.CASH),
    card: toNumber(data.paymentBreakdown?.CARD),
    clickPayme: 0,
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
    const [dashboard, orders, notifications, audit, cash, lockers] = await Promise.all([
      apiClient.get("/analytics/dashboard", { params: { branchId } }),
      apiClient.get("/orders", { params: { branchId, limit: 20 } }),
      apiClient.get("/notifications", { params: { branchId, limit: 20 } }),
      apiClient.get("/audit", { params: { branchId, limit: 20 } }),
      apiClient.get("/cash-movements", { params: { branchId, limit: 20 } }),
      apiClient.get("/lockers", { params: { branchId } }),
    ]);

    return {
      ...mapDashboard(getData(dashboard, {})),
      orders: getItems(orders).map(mapOrder).filter(Boolean),
      notifications: getItems(notifications).map(mapNotification),
      activityLogs: getItems(audit).map(mapActivityLog),
      cashMovements: getItems(cash).map(mapCashMovement),
      lockers: getArrayData(lockers).map(mapLocker).filter(Boolean),
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
