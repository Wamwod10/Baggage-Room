import apiClient from "./apiClient";
import branchService from "./branchService";
import { getItems, mapExpense } from "./apiMappers";

const expenseService = {
  async getAll(branchName = null) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const response = await apiClient.get("/expenses", { params: { branchId, limit: 200 } });
    return getItems(response).map(mapExpense);
  },

  async create(data) {
    const branchId = await branchService.getBranchIdByName(data.branch);
    const response = await apiClient.post("/expenses", {
      branchId,
      category: data.category,
      reason: data.reason,
      amount: Number(data.amount || 0),
      currency: data.currency || "UZS",
    });
    return mapExpense(response.data);
  },

  async delete(id) {
    const response = await apiClient.delete(`/expenses/${id}`);
    return response.data;
  },
};

export default expenseService;
