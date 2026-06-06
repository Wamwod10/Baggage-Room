import apiClient from "./apiClient";
import branchService from "./branchService";
import { mapTariff } from "./apiMappers";
import { getSettings, saveSettings } from "../utils/storage";

const settingsService = {
  get() {
    return getSettings();
  },

  save(data) {
    return saveSettings(data);
  },

  async getTariffs(branchName = null) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const response = await apiClient.get("/tariffs", { params: { branchId } });
    return (response.data || []).map(mapTariff);
  },

  async updateTariff(id, data) {
    const response = await apiClient.patch(`/tariffs/${id}`, data);
    return mapTariff(response.data);
  },
};

export default settingsService;
