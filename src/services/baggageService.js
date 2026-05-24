import {
  getOrders,
  createOrder,
  updateOrder,
  reprintOrder,
  syncOvertimeOrders,
  calculateOvertime,
} from "../utils/storage";

const baggageService = {
  getAll(branchName = null) {
    return syncOvertimeOrders(branchName);
  },

  getActive(branchName = null) {
    return syncOvertimeOrders(branchName).filter(
      (order) => order.status === "Aktiv" || order.status === "Kechikdi",
    );
  },

  getHistory(branchName = null) {
    return syncOvertimeOrders(branchName).filter(
      (order) =>
        order.status === "Olib ketildi" || order.status === "Bekor qilindi",
    );
  },

  getById(id) {
    return getOrders().find((order) => order.id === id) || null;
  },

  create(data) {
    return createOrder(data);
  },

  update(id, data) {
    return updateOrder(id, data);
  },

  pickup(id) {
    const order = getOrders().find((item) => item.id === id);

    if (!order) {
      return getOrders();
    }

    const overtime = calculateOvertime(order);

    return updateOrder(id, {
      status: "Olib ketildi",
      realPickupTime: new Date().toISOString(),
      overtimeAmount: overtime.overtimeAmount,
      overtimeHours: overtime.overtimeHours,
    });
  },

  cancel(id, reason) {
    return updateOrder(id, {
      status: "Bekor qilindi",
      cancelReason: reason || "Sabab ko‘rsatilmagan",
      cancelledAt: new Date().toISOString(),
    });
  },

  reprint(id) {
    return reprintOrder(id);
  },
};

export default baggageService;
