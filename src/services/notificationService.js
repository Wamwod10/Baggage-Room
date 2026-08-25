import apiClient, { getAuthContextKey } from "./apiClient";
import branchService from "./branchService";
import { asArray, getData, getItems, mapActivityLog, mapNotification } from "./apiMappers";

const SMART_ALERT_TTL_MS = 10000;
const smartAlertCache = new Map();

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
    const cacheKey = `${getAuthContextKey()}|${branchId || "all"}`;
    const cached = smartAlertCache.get(cacheKey);
    if (cached && Date.now() - cached.at < SMART_ALERT_TTL_MS) return cached.value;
    const response = await apiClient.get("/notifications", { params: { branchId, isRead: "false", limit: 20 }, signal });
    const alerts = getItems(response).map(mapNotification);
    const value = asArray(alerts).filter((item) => !item.isRead).slice(0, 20);
    smartAlertCache.set(cacheKey, { at: Date.now(), value });
    if (smartAlertCache.size > 12) smartAlertCache.delete(smartAlertCache.keys().next().value);
    return value;
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
