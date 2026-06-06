import apiClient from "./apiClient";
import branchService from "./branchService";
import { getItems } from "./apiMappers";

const activityService = {
  async getAll(branchName = null) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const response = await apiClient.get("/audit", { params: { branchId, limit: 200 } });
    return getItems(response);
  },

  async create() {
    return null;
  },
};

export default activityService;
