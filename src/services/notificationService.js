import apiClient from "./apiClient";
import branchService from "./branchService";
import { asArray, getData, getItems, mapActivityLog, mapNotification } from "./apiMappers";

const notificationService = {
  async getAlerts(branchName = null, { signal } = {}) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const response = await apiClient.get("/notifications", { params: { branchId, limit: 100 }, signal });
    return getItems(response).map(mapNotification);
  },

  async getActivityLogs(branchName = null, { signal } = {}) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const response = await apiClient.get("/audit", { params: { branchId, limit: 100 }, signal });
    return getItems(response).map(mapActivityLog);
  },

  async getSmartAlerts(branchName = null, { signal } = {}) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const response = await apiClient.get("/notifications", { params: { branchId, isRead: "false", limit: 20 }, signal });
    const alerts = getItems(response).map(mapNotification);
    return asArray(alerts).filter((item) => !item.isRead).slice(0, 20);
  },

  async markRead(id) {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return mapNotification(getData(response));
  },

  async markAllRead(branchName = null) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const response = await apiClient.patch("/notifications/read-all", { branchId });
    return getData(response);
  },

  async checkDelayedTelegramAlerts() {
    return [];
  },

  async getPageData(branchName = null, { signal } = {}) {
    const [alerts, activityLogs] = await Promise.all([
      this.getSmartAlerts(branchName, { signal }),
      this.getActivityLogs(branchName, { signal }),
    ]);
    return { alerts: asArray(alerts), systemNotifications: [], activityLogs: asArray(activityLogs) };
  },
};

export default notificationService;
