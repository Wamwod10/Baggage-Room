import {
  getOrders,
  createOrder,
  updateOrder,
  reprintOrder,
  syncOvertimeOrders,
  calculateOvertime,
  calculateTariffAmount,
  getCustomerHistory,
  closeDebt,
  transferLocker,
  addCashMovement,
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

  pickup(id, data = {}) {
    const order = getOrders().find((item) => item.id === id);

    if (!order) {
      return getOrders();
    }

    const overtime = calculateOvertime(order);
    const basePayable = Number(
      order.finalAmount ??
        order.finalPrice ??
        order.realPaidAmount ??
        order.calculatedAmount ??
        0,
    );
    const calculatedTotal = basePayable + Number(overtime.overtimeAmount || 0);
    const previousPaid = order.payment === "Qarz" ? 0 : Number(order.realPaidAmount || 0);
    const realPaidAmount = Number(data.realPaidAmount ?? calculatedTotal);
    const payment = data.payment || order.payment || "Naqd";
    const debtAmount = payment === "Qarz" ? realPaidAmount : 0;
    const cashMovementAmount =
      payment === "Qarz" ? 0 : Math.max(realPaidAmount - previousPaid, 0);

    if (cashMovementAmount > 0) {
      addCashMovement({
        type: "IN",
        source: overtime.overtimeAmount > 0 ? "overtime payment" : "pickup payment",
        orderId: id,
        branch: order.branch,
        admin: data.admin,
        amount: cashMovementAmount,
        currency: data.currency || order.currency,
        payment,
        note: data.paymentReason || "",
      });
    }

    return updateOrder(id, {
      status: "Olib ketildi",
      realPickupTime: new Date().toISOString(),
      overtimeAmount: overtime.overtimeAmount,
      overtimeHours: overtime.overtimeHours,
      payment,
      currency: data.currency || order.currency,
      finalAmount: calculatedTotal,
      realPaidAmount,
      finalPrice: realPaidAmount,
      difference: realPaidAmount - calculatedTotal,
      paymentEditReason: data.paymentReason || "",
      debtAmount,
    });
  },

  closeDebt(id, data) {
    return closeDebt(id, data);
  },

  transfer(id, data) {
    return transferLocker(id, data);
  },

  calculateTariff(data) {
    return calculateTariffAmount(data);
  },

  getCustomerHistory(data) {
    return getCustomerHistory(data);
  },

  cancel(id, reason) {
    return updateOrder(id, {
      status: "Bekor qilindi",
      cancelReason: reason || "Sabab ko'rsatilmagan",
      cancelledAt: new Date().toISOString(),
    });
  },

  reprint(id) {
    return reprintOrder(id);
  },
};

export default baggageService;

