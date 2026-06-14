import apiClient from "./apiClient";
import branchService from "./branchService";
import { getArrayData, getData, mapShift } from "./apiMappers";

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
    const response = await apiClient.post("/shifts/open", {
      branchId,
      openingCash: Number(data.openingCash || 0),
      acceptedCash: Number(data.acceptedCash ?? data.acceptedAmount ?? 0),
      acceptedFromName: data.acceptedFromName || data.receivedFrom || "",
      handoverToName: data.handoverToName || data.handoverTo || "",
    });
    return mapShift(getData(response));
  },

  async close(branchName, data) {
    const current = await this.getCurrent(branchName);
    if (!current) throw new Error("Bu filialda ochiq smena yo'q");
    const response = await apiClient.post(`/shifts/${current.id}/close`, {
      closingCash: Number(data.closingCash ?? data.cashLeft ?? 0),
      handoverToName: data.handoverToName || data.handoverTo || "",
      salaryAmount: Number(data.salaryAmount || 0),
      salaryReceiver: data.salaryReceiver || "",
    });
    return mapShift(getData(response));
  },

  async isOpen(branchName = null) {
    return Boolean(await this.getCurrent(branchName));
  },
};

export default shiftService;
