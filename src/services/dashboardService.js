import apiClient from "./apiClient";
import branchService from "./branchService";
import { asArray, getArrayData, getData, getItems, mapCashMovement, mapLocker, mapNotification, mapOrder, mapShift } from "./apiMappers";

const mapDashboard = (data = {}) => ({
  stats: {
    revenue: data.todayRevenue || 0,
    active: data.activeOrders || 0,
    ordersCount: data.todayClients || 0,
    netProfit: data.netProfit || 0,
    cash: data.paymentBreakdown?.CASH || 0,
    card: data.paymentBreakdown?.CARD || 0,
    transfer: data.paymentBreakdown?.TRANSFER || 0,
    debt: data.debtAmount || 0,
    freeLockers: data.emptyLockers || 0,
    activeLockers: data.busyLockers || 0,
    delayedLockers: data.delayedOrders || 0,
    inkassa: data.inkassaAmount || 0,
  },
  branchSummary: asArray(data.branchSummary),
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
      activityLogs: getItems(audit),
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
    return getItems(response);
  },
};

export default dashboardService;
