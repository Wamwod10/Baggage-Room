import apiClient from "./apiClient";
import branchService from "./branchService";
import { asArray, getArrayData, getData, mapLocker } from "./apiMappers";
import { idempotencyHeaders } from "../utils/idempotency";

const LOCKER_STATUSES = {
  FREE: "Bosh",
  BUSY: "Band",
  DELAYED: "Kechikkan",
  SERVICE: "Servisda",
};

const lockerService = {
  statuses: LOCKER_STATUSES,

  async getAll(branchName = null, { signal } = {}) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const response = await apiClient.get("/lockers", { params: { branchId }, signal });
    return getArrayData(response).map(mapLocker).filter(Boolean);
  },

  async block(branchOrLocker, numberOrData, data = {}, { idempotencyKey } = {}) {
    const directLocker = branchOrLocker && typeof branchOrLocker === "object" ? branchOrLocker : null;
    const locker = directLocker || asArray(await this.getAll(branchOrLocker)).find((item) => Number(item.number) === Number(numberOrData));
    if (!locker) throw new Error("Locker topilmadi");
    const payload = directLocker ? numberOrData || {} : data;
    const response = await apiClient.patch(`/lockers/${locker.id}/service`, {
      serviceReason: payload.reason || "",
    }, idempotencyHeaders(payload.idempotencyKey || idempotencyKey));
    return mapLocker(getData(response));
  },

  async unblock(branchOrLocker, number, { idempotencyKey } = {}) {
    const directLocker = branchOrLocker && typeof branchOrLocker === "object" ? branchOrLocker : null;
    const locker = directLocker || asArray(await this.getAll(branchOrLocker)).find((item) => Number(item.number) === Number(number));
    if (!locker) throw new Error("Locker topilmadi");
    const response = await apiClient.patch(`/lockers/${locker.id}/restore`, {}, idempotencyHeaders(idempotencyKey));
    return mapLocker(getData(response));
  },

  async transfer({ orderId, fromLockerId, toLockerId, note, idempotencyKey }) {
    const response = await apiClient.post("/lockers/transfer", {
      orderId,
      fromLockerId,
      toLockerId,
      note,
    }, idempotencyHeaders(idempotencyKey));
    return getData(response);
  },
};

export default lockerService;
