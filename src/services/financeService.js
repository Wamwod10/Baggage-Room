import apiClient from "./apiClient";
import branchService from "./branchService";
import { getItems, mapCashMovement, mapInkassa } from "./apiMappers";

const financeService = {
  async getCashMovements(branchName = null) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const response = await apiClient.get("/cash-movements", { params: { branchId, limit: 200 } });
    return getItems(response).map(mapCashMovement);
  },

  async getInkassa(branchName = null) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const response = await apiClient.get("/inkassa", { params: { branchId } });
    return (response.data || []).map(mapInkassa);
  },

  async createInkassa(data) {
    const branchId = await branchService.getBranchIdByName(data.branch);
    const response = await apiClient.post("/inkassa", {
      branchId,
      receiverName: data.receiverName || data.receiver,
      amount: Number(data.amount || 0),
      currency: data.currency || "UZS",
      note: data.note || "",
    });
    return mapInkassa(response.data);
  },
};

export default financeService;
