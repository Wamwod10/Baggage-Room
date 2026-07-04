import apiClient from "./apiClient";
import branchService from "./branchService";
import { getArrayData, getData, mapShift } from "./apiMappers";
import { toMinorUnits } from "../utils/currency";

const currencies = ["UZS", "USD", "EUR", "RUB"];
const toMinorCurrencyMap = (values = {}) => Object.fromEntries(
  currencies.map((currency) => [currency, toMinorUnits(values?.[currency] || 0, currency)]),
);

const shiftService = {
  async getAll(branchName = null) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const response = await apiClient.get("/shifts", { params: { branchId } });
    return getArrayData(response).map(mapShift).filter(Boolean);
  },

  async getCurrent(branchName = null) {
    const branchId = await branchService.getBranchIdByName(branchName);
    try {
      const response = await apiClient.get("/shifts/current", { params: { branchId } });
      return getData(response) ? mapShift(getData(response)) : null;
    } catch (error) {
      if (error.status === 400 && (!branchId || error.message === "branchId is required")) return null;
      throw error;
    }
  },

  async open(data) {
    const branchId = await branchService.getBranchIdByName(data.branch);
    if (!branchId) throw new Error("Filial tanlanmagan");
    const openingCashByCurrency = toMinorCurrencyMap(data.openingCashByCurrency);
    const acceptedCashByCurrency = toMinorCurrencyMap(data.acceptedCashByCurrency);
    const response = await apiClient.post("/shifts/open", {
      branchId,
      openingCash: openingCashByCurrency.UZS,
      acceptedCash: acceptedCashByCurrency.UZS,
      openingCashByCurrency,
      acceptedCashByCurrency,
      acceptedFromName: data.acceptedFromName || data.receivedFrom || "",
      acceptedByName: data.acceptedByName || data.admin || "",
      handoverToName: data.handoverToName || data.handoverTo || "",
    });
    return mapShift(getData(response));
  },

  async close(branchName, data) {
    const current = await this.getCurrent(branchName);
    if (!current) throw new Error("Bu filialda ochiq smena yo'q");
    const closingCashByCurrency = toMinorCurrencyMap(data.closingCashByCurrency);
    const response = await apiClient.post(`/shifts/${current.id}/close`, {
      closingCash: closingCashByCurrency.UZS,
      closingCashByCurrency,
      handoverToName: data.handoverToName || data.handoverTo || "",
      salaryAmount: Number(data.salaryAmount || 0),
      salaryReceiver: data.salaryReceiver || "",
    });
    return mapShift(getData(response));
  },

  async sendCurrentSalesTelegram(branchName = null) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const response = await apiClient.post("/shifts/current/sales-telegram", null, { params: { branchId } });
    return getData(response);
  },

  async isOpen(branchName = null) {
    return Boolean(await this.getCurrent(branchName));
  },
};

export default shiftService;
