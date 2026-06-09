import apiClient from "./apiClient";
import branchService from "./branchService";
import { asArray, getArrayData, getData, getItems, mapOrder, mapLocker, toPaymentType } from "./apiMappers";

const statusByLabel = {
  Aktiv: "ACTIVE",
  Kechikdi: "DELAYED",
  "Olib ketildi": "PICKED_UP",
  "Bekor qilindi": "CANCELLED",
};

const baggageService = {
  async getAll(branchName = null) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const response = await apiClient.get("/orders", {
      params: { branchId, limit: 200 },
    });
    return getItems(response).map(mapOrder).filter(Boolean);
  },

  async getActive(branchName = null) {
    const orders = await this.getAll(branchName);
    return asArray(orders).filter((order) => order.status === "Aktiv" || order.status === "Kechikdi");
  },

  async getHistory(branchName = null) {
    const orders = await this.getAll(branchName);
    return asArray(orders).filter((order) => order.status === "Olib ketildi" || order.status === "Bekor qilindi");
  },

  async getById(id) {
    const response = await apiClient.get(`/orders/${id}`);
    return mapOrder(getData(response));
  },

  async create(data) {
    const branchId = await branchService.getBranchIdByName(data.branch);
    const lockers = asArray(data.lockers);
    const lockerIds = lockers.map((locker) => locker.id || locker.lockerId).filter(Boolean);
    if (!branchId) throw new Error("Filial tanlanmagan");
    if (!lockerIds.length) throw new Error("Kamida bitta yacheyka tanlang");
    const response = await apiClient.post("/orders", {
      branchId,
      clientName: data.client,
      phone: data.phone,
      passport: data.passport,
      tariffHours: Number(data.tariffHours || data.hours || 1),
      customHours: data.customHours ? Number(data.customHours) : undefined,
      currency: data.currency || "UZS",
      paymentType: toPaymentType(data.payment),
      discountAmount: Number(data.discount || data.discountAmount || 0),
      discountReason: data.discountReason || "",
      realPaidAmount: Number(data.realPaidAmount ?? data.finalAmount ?? 0),
      realPaidReason: data.paymentReason || "",
      checkIn: data.checkIn,
      plannedCheckOut: data.checkOut,
      note: data.note || "",
      lockerIds,
      items: lockers.map((locker) => ({
        lockerId: locker.id || locker.lockerId,
        tariffHours: Number(locker.tariffHours || data.tariffHours || data.hours || 1),
        discountAmount: locker.discountAmount || 0,
        currency: locker.currency || data.currency || "UZS",
      })).filter((locker) => locker.lockerId),
    });
    const responseData = getData(response, {});
    return mapOrder(responseData.order || responseData);
  },

  async update(id, data) {
    const response = await apiClient.patch(`/orders/${id}`, data);
    return mapOrder(getData(response));
  },

  async pickup(id, data = {}) {
    const response = await apiClient.post(`/orders/${id}/pickup`, {
      overtimeAmount: Number(data.overtimeAmount || 0),
      debtPaidAmount: data.debtPaidAmount !== undefined ? Number(data.debtPaidAmount) : undefined,
      paymentType: toPaymentType(data.payment),
      currency: data.currency,
    });
    return mapOrder(getData(response));
  },

  async closeDebt(id, data) {
    const order = await this.getById(id);
    if (!order.debtId) throw new Error("Qarz topilmadi");
    const response = await apiClient.post(`/debts/${order.debtId}/close`, {
      amount: Number(data.amount || order.debtAmount || 0),
      paymentType: toPaymentType(data.payment || "Naqd"),
      currency: data.currency || order.currency,
      note: data.note || "",
    });
    return getData(response);
  },

  async transfer(id, data) {
    const order = await this.getById(id);
    const from = asArray(order.lockers).find((locker) => Number(locker.number) === Number(data.fromNumber));
    if (!from) throw new Error("Eski yacheyka topilmadi");
    const branchId = await branchService.getBranchIdByName(order.branch);
    const lockersResponse = await apiClient.get("/lockers", { params: { branchId } });
    const to = getArrayData(lockersResponse)
      .map(mapLocker)
      .filter(Boolean)
      .find((locker) => Number(locker.number) === Number(data.toNumber));
    if (!to) throw new Error("Yangi yacheyka topilmadi");
    const response = await apiClient.post("/lockers/transfer", {
      orderId: id,
      fromLockerId: from.lockerId || from.id,
      toLockerId: to.id,
      note: data.reason || "",
    });
    return mapOrder(getData(response));
  },

  calculateTariff({ lockers = [] }) {
    const safeLockers = asArray(lockers);
    return safeLockers.reduce((sum, locker) => sum + Number(locker.price || locker.originalPrice || 0), 0);
  },

  async getCustomerHistory({ phone, passport, branchName }) {
    if (!phone && !passport) return { visits: 0, orders: [], activeOrders: [], duplicateOrders: [] };
    const orders = await this.getAll(branchName);
    const matchedOrders = asArray(orders).filter((order) => (phone && order.phone === phone) || (passport && order.passport === passport));
    const activeOrders = matchedOrders.filter((order) => order.status === "Aktiv" || order.status === "Kechikdi");
    return {
      visits: matchedOrders.length,
      orders: matchedOrders,
      activeOrders,
      duplicateOrders: activeOrders,
    };
  },

  async cancel(id, reason) {
    const response = await apiClient.post(`/orders/${id}/cancel`, { cancelReason: reason });
    return mapOrder(getData(response));
  },

  async reprint(id) {
    return this.getById(id);
  },

  statusByLabel,
};

export default baggageService;
