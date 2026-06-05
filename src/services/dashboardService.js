import {
  getDashboardStats,
  getOrders,
  getExpenses,
  getNotifications,
  getShifts,
  getCurrentShift,
  getActivityLogs,
  getCashMovements,
  getInkassa,
  getLockers,
  syncOvertimeOrders,
} from "../utils/storage";

const dashboardService = {
  sync() {
    return syncOvertimeOrders();
  },

  getData(branchName = null) {
    syncOvertimeOrders();

    return {
      stats: getDashboardStats(branchName),
      orders: getOrders(branchName),
      expenses: getExpenses(branchName),
      notifications: getNotifications(branchName),
      currentShift: getCurrentShift(branchName),
      currentShifts: getShifts(branchName).filter(
        (shift) => shift.status === "OPEN",
      ),
      activityLogs: getActivityLogs(branchName),
      cashMovements: getCashMovements(branchName),
      inkassa: getInkassa(branchName),
      lockers: getLockers(branchName),
    };
  },

  getStats(branchName = null) {
    return getDashboardStats(branchName);
  },

  getLiveActivity(limit = 8, branchName = null) {
    return getActivityLogs(branchName).slice(0, limit);
  },
};

export default dashboardService;
