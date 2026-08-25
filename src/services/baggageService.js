import apiClient from "./apiClient";
import branchService from "./branchService";
import { asArray, getArrayData, getData, getItems, mapOrder, mapLocker, toPaymentType } from "./apiMappers";
import { idempotencyHeaders } from "../utils/idempotency";

const statusByLabel = {
  Aktiv: "ACTIVE",
  Kechikdi: "DELAYED",
  "Olib ketildi": "PICKED_UP",
  "Bekor qilindi": "CANCELLED",
};

const paginationFrom = (response = {}, fallback = {}) => ({
  page: Number(response.pagination?.page ?? fallback.page ?? 1),
  limit: Number(response.pagination?.limit ?? fallback.limit ?? 50),
  total: Number(response.pagination?.total ?? 0),
  totalPages: Number(response.pagination?.totalPages ?? 1),
});

const baggageService = {
  async getPage({
    branchName = null,
    page = 1,
    limit = 50,
    search = "",
    status,
    statuses,
    payment,
    paymentType,
    active = false,
    debtOnly = false,
    sortBy = "createdAt",
    sortOrder = "desc",
    phone,
    passport,
    signal,
  } = {}) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const resolvedPaymentType = paymentType || toPaymentType(payment);
    const resolvedStatus = statusByLabel[status] || status;
    const resolvedStatuses = Array.isArray(statuses)
      ? statuses.map((item) => statusByLabel[item] || item).filter(Boolean).join(",")
      : statuses;
    const response = await apiClient.get("/orders", {
      params: {
        branchId,
        page,
        limit,
        search: search?.trim() || undefined,
        phone: phone?.trim() || undefined,
        passport: passport?.trim() || undefined,
        status: resolvedStatus || undefined,
        statuses: resolvedStatuses || undefined,
        paymentType: resolvedPaymentType || undefined,
        active: active ? "true" : undefined,
        debtOnly: debtOnly ? "true" : undefined,
        sortBy,
        sortOrder,
      },
      signal,
    });
    return {
      items: getItems(response).map(mapOrder).filter(Boolean),
      pagination: paginationFrom(response, { page, limit }),
    };
  },

  async getAll(branchName = null, { signal } = {}) {
    const branchId = await branchService.getBranchIdByName(branchName);
    const response = await apiClient.get("/orders", {
      params: { branchId, limit: 200 },
      signal,
    });
    return getItems(response).map(mapOrder).filter(Boolean);
  },

  async getActive(branchName = null) {
    const page = await this.getPage({ branchName, active: true, limit: 50 });
    return page.items;
  },

  async getHistory(branchName = null) {
    const page = await this.getPage({ branchName, statuses: ["PICKED_UP", "CANCELLED"], limit: 50 });
    return page.items;
  },

  async getById(id) {
    const response = await apiClient.get(`/orders/${id}`);
    return mapOrder(getData(response));
  },

  async create(data) {
    const branchId = await branchService.getBranchIdByName(data.branch);
    const lockers = asArray(data.lockers);
    const lockerIds = lockers.map((locker) => locker.id || locker.lockerId).filter(Boolean);
    const baggageItems = asArray(data.baggageItems).length
      ? asArray(data.baggageItems)
      : lockers.map((locker) => ({
        lockerId: locker.id || locker.lockerId,
        size: locker.size,
        count: 1,
      }));
    if (!branchId) throw new Error("Filial tanlanmagan");
    if (!lockerIds.length) throw new Error("Kamida bitta yacheyka tanlang");
    if (!baggageItems.length) throw new Error("Kamida bitta bagaj razmerini tanlang");
    const paymentType = toPaymentType(data.payment);
    if (!paymentType) throw new Error("To'lov turi tanlanmagan");
    const idempotencyKey = String(data.idempotencyKey || "").trim();
    if (!idempotencyKey) throw new Error("Idempotency key topilmadi. Formani qayta ochib urinib ko'ring.");
    const response = await apiClient.post("/orders", {
      branchId,
      clientName: data.client,
      phone: data.phone,
      passport: data.passport,
      tariffHours: Number(data.tariffHours || data.hours || 1),
      customHours: data.customHours ? Number(data.customHours) : undefined,
      currency: data.currency || "UZS",
      paymentType,
      discountAmount: Number(data.discount || data.discountAmount || 0),
      discountReason: data.discountReason || "",
      realPaidAmount: Number(data.realPaidAmount ?? data.finalAmount ?? 0),
      realPaidReason: data.paymentReason || "",
      exchangeRate: Number(data.exchangeRate || 1),
      checkIn: data.checkIn,
      plannedCheckOut: data.checkOut,
      note: data.note || "",
      lockerIds,
      items: baggageItems.map((item) => ({
        lockerId: item.lockerId || item.id || lockerIds[0],
        size: item.size,
        count: Number(item.count || 1),
        tariffHours: Number(item.tariffHours || data.tariffHours || data.hours || 1),
        discountAmount: item.discountAmount || 0,
        currency: item.currency || data.currency || "UZS",
      })).filter((item) => item.lockerId && item.size && Number(item.count || 0) > 0),
    }, { headers: { "Idempotency-Key": idempotencyKey } });
    const responseData = getData(response, {});
    const order = mapOrder(responseData.order || responseData);
    return {
      ...order,
      telegram: responseData.telegram || null,
      warnings: responseData.warnings || [],
    };
  },

  async sendTelegram(id) {
    const response = await apiClient.post(`/orders/${id}/telegram`);
    return getData(response);
  },

  async update(id, data, { idempotencyKey } = {}) {
    const payload = {
      ...data,
      paymentType: data.payment !== undefined ? toPaymentType(data.payment) : data.paymentType,
      overtimePaymentType: data.overtimePaymentType !== undefined ? toPaymentType(data.overtimePaymentType) : data.overtimePaymentType,
      doplataPaymentType: data.doplataPaymentType !== undefined ? toPaymentType(data.doplataPaymentType) : data.doplataPaymentType,
    };
    if (data.payment !== undefined && !payload.paymentType) throw new Error("To'lov turi tanlanmagan");
    if (data.overtimePaymentType !== undefined && !payload.overtimePaymentType) throw new Error("Qo'shimcha to'lov turi tanlanmagan");
    if (data.doplataPaymentType !== undefined && !payload.doplataPaymentType) throw new Error("Qo'shimcha to'lov turi tanlanmagan");
    delete payload.payment;
    const response = await apiClient.patch(`/orders/${id}`, payload, idempotencyHeaders(idempotencyKey));
    return mapOrder(getData(response));
  },

  async pickup(id, data = {}, { idempotencyKey } = {}) {
    const response = await apiClient.post(`/orders/${id}/pickup`, {
      overtimeAmount: Number(data.overtimeAmount || 0),
      debtPaidAmount: data.debtPaidAmount !== undefined ? Number(data.debtPaidAmount) : undefined,
      paymentType: toPaymentType(data.payment),
      overtimePaymentType: toPaymentType(data.overtimePayment || data.overtimePaymentType),
      doplataPaymentType: toPaymentType(data.overtimePayment || data.doplataPaymentType),
      currency: data.currency,
    }, idempotencyHeaders(idempotencyKey));
    return mapOrder(getData(response));
  },

  async closeDebt(id, data = {}, { idempotencyKey } = {}) {
    const order = data.debtId ? null : await this.getById(id);
    const debtId = data.debtId || order?.debtId;
    if (!debtId) throw new Error("Qarz topilmadi");
    const paymentType = toPaymentType(data.payment);
    if (!paymentType) throw new Error("To'lov turi tanlanmagan");
    const response = await apiClient.post(`/debts/${debtId}/close`, {
      amount: Number(data.amount ?? order?.debtAmount ?? 0),
      paymentType,
      currency: data.currency || order?.currency,
      note: data.note || "",
    }, idempotencyHeaders(idempotencyKey));
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

  async getCustomerHistory({ phone, passport, branchName, signal }) {
    if (!phone && !passport) return { visits: 0, orders: [], activeOrders: [], duplicateOrders: [] };
    const page = await this.getPage({
      branchName,
      phone,
      passport,
      limit: 50,
      signal,
    });
    const matchedOrders = asArray(page.items);
    const activeOrders = matchedOrders.filter((order) => order.status === "Aktiv" || order.status === "Kechikdi");
    return {
      visits: Number(page.pagination?.total || matchedOrders.length),
      orders: matchedOrders,
      activeOrders,
      duplicateOrders: activeOrders,
    };
  },

  async cancel(id, reason, { idempotencyKey } = {}) {
    const response = await apiClient.post(`/orders/${id}/cancel`, { cancelReason: reason }, idempotencyHeaders(idempotencyKey));
    return mapOrder(getData(response));
  },

  async reprint(id) {
    return this.getById(id);
  },

  statusByLabel,
};

export default baggageService;
