import apiClient from "./apiClient";
import branchService from "./branchService";
import { asArray, getData, getItems, mapActivityLog, mapNotification } from "./apiMappers";

const notificationService = {
  async getAlerts(branchName = null) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const response = await apiClient.get("/notifications", { params: { branchId, limit: 100 } });
    return getItems(response).map(mapNotification);
  },

  async getActivityLogs(branchName = null) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const response = await apiClient.get("/audit", { params: { branchId, limit: 100 } });
    return getItems(response).map(mapActivityLog);
  },

  async getSmartAlerts(branchName = null) {
    const alerts = await this.getAlerts(branchName);
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

  async getPageData(branchName = null) {
    const [alerts, activityLogs] = await Promise.all([
      this.getSmartAlerts(branchName),
      this.getActivityLogs(branchName),
    ]);
    return { alerts: asArray(alerts), systemNotifications: [], activityLogs: asArray(activityLogs) };
  },
};

export default notificationService;
