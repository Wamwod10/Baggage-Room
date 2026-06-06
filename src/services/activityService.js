import apiClient from "./apiClient";
import branchService from "./branchService";

const activityService = {
  async getAll(branchName = null) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const response = await apiClient.get("/audit", { params: { branchId, limit: 200 } });
    return response.data?.items || [];
  },

  async create() {
    return null;
  },
};

export default activityService;
