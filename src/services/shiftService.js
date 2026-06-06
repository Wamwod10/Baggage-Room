import apiClient from "./apiClient";
import branchService from "./branchService";
import { getArrayData, getData, mapShift } from "./apiMappers";

const shiftService = {
  async getAll(branchName = null) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const response = await apiClient.get("/shifts", { params: { branchId } });
    return getArrayData(response).map(mapShift);
  },

  async getCurrent(branchName = null) {
    const branchId = await branchService.getBranchIdByName(branchName);
    try {
      const response = await apiClient.get("/shifts/current", { params: { branchId } });
      return getData(response) ? mapShift(getData(response)) : null;
    } catch (error) {
      if (error.status === 400 && !branchId) return null;
      throw error;
    }
  },

  async open(data) {
    const branchId = await branchService.getBranchIdByName(data.branch);
    const response = await apiClient.post("/shifts/open", {
      branchId,
      openingCash: Number(data.openingCash || 0),
      acceptedCash: Number(data.acceptedCash || 0),
      acceptedFromName: data.acceptedFromName,
      handoverToName: data.handoverToName,
    });
    return mapShift(getData(response));
  },

  async close(branchName, data) {
    const current = await this.getCurrent(branchName);
    if (!current) throw new Error("Ochiq shift topilmadi");
    const response = await apiClient.post(`/shifts/${current.id}/close`, {
      closingCash: Number(data.closingCash || data.cashLeft || 0),
      handoverToName: data.handoverToName,
    });
    return mapShift(getData(response));
  },

  async isOpen(branchName = null) {
    return Boolean(await this.getCurrent(branchName));
  },
};

export default shiftService;
