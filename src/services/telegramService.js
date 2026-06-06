import apiClient from "./apiClient";
import branchService from "./branchService";

const ok = (message = "Backend Telegram flow handles this event") =>
  Promise.resolve({ success: true, skipped: true, message });

const telegramService = {
  async getSettings(branchName = null) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const response = await apiClient.get("/telegram/settings", { params: { branchId } });
    return response.data || [];
  },

  async updateSettings(branchId, data) {
    const response = await apiClient.patch(`/telegram/settings/${branchId}`, data);
    return response.data;
  },

  async test(branchId) {
    const response = await apiClient.post(`/telegram/test/${branchId}`);
    return response.data;
  },

  sendNewOrder: () => ok(),
  sendShiftOpened: () => ok(),
  sendShiftClosed: () => ok(),
  sendOrderCancelled: () => ok(),
  sendDelayedBaggage: () => ok(),
  sendOvertimePayment: () => ok(),
  sendDebtClosed: () => ok(),
  sendInkassa: () => ok(),
  sendExpense: () => ok(),
  sendLockerTransfer: () => ok(),
  sendLockerBlock: () => ok(),
};

export default telegramService;
