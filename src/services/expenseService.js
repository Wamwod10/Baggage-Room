import apiClient from "./apiClient";
import branchService from "./branchService";
import { getData, getItems, mapExpense } from "./apiMappers";
import { toMinorUnits } from "../utils/currency";

const expenseService = {
  async getAll(branchName = null) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const response = await apiClient.get("/expenses", { params: { branchId, limit: 200 } });
    return getItems(response).map(mapExpense);
  },

  async create(data) {
    const branchId = await branchService.getBranchIdByName(data.branch);
    const reason = data.reason || data.note || data.category;
    const response = await apiClient.post("/expenses", {
      branchId,
      category: data.category,
      reason,
      amount: toMinorUnits(data.amount || 0, data.currency || "UZS"),
      currency: data.currency || "UZS",
    });
    return mapExpense(getData(response));
  },

  async delete(id) {
    const response = await apiClient.delete(`/expenses/${id}`);
    return getData(response);
  },
};

export default expenseService;
