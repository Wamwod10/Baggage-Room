import apiClient from "./apiClient";
import branchService from "./branchService";

const ok = (message = "Backend Telegram flow handles this event") =>
  Promise.resolve({ success: true, skipped: true, message });
const getData = (payload, fallback = null) => payload?.data ?? payload ?? fallback;
const getArrayData = (payload) => (Array.isArray(getData(payload)) ? getData(payload) : []);

const telegramService = {
  async getSettings(branchName = null) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const response = await apiClient.get("/telegram/settings", { params: { branchId } });
    return getArrayData(response);
  },

  async updateSettings(branchId, data) {
    const response = await apiClient.patch(`/telegram/settings/${branchId}`, data);
    return getData(response);
  },

  async test(branchId) {
    const response = await apiClient.post(`/telegram/test/${branchId}`);
    return getData(response);
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
