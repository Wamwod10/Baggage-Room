import apiClient from "./apiClient";
import branchService from "./branchService";
import { asArray, getArrayData, getData, mapLocker } from "./apiMappers";

const LOCKER_STATUSES = {
  FREE: "Bosh",
  BUSY: "Band",
  DELAYED: "Kechikkan",
  SERVICE: "Servisda",
};

const lockerService = {
  statuses: LOCKER_STATUSES,

  async getAll(branchName = null) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const response = await apiClient.get("/lockers", { params: { branchId } });
    return getArrayData(response).map(mapLocker).filter(Boolean);
  },

  async block(branchName, number, data = {}) {
    const lockers = await this.getAll(branchName);
    const locker = asArray(lockers).find((item) => Number(item.number) === Number(number));
    if (!locker) throw new Error("Locker topilmadi");
    const response = await apiClient.patch(`/lockers/${locker.id}/service`, {
      serviceReason: data.reason || "",
    });
    return mapLocker(getData(response));
  },

  async unblock(branchName, number) {
    const lockers = await this.getAll(branchName);
    const locker = asArray(lockers).find((item) => Number(item.number) === Number(number));
    if (!locker) throw new Error("Locker topilmadi");
    const response = await apiClient.patch(`/lockers/${locker.id}/restore`);
    return mapLocker(getData(response));
  },

  async transfer({ orderId, fromLockerId, toLockerId, note }) {
    const response = await apiClient.post("/lockers/transfer", {
      orderId,
      fromLockerId,
      toLockerId,
      note,
    });
    return getData(response);
  },
};

export default lockerService;
