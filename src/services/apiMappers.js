import branchService from "./branchService";

const statusMap = {
  ACTIVE: "Aktiv",
  PICKED_UP: "Olib ketildi",
  CANCELLED: "Bekor qilindi",
  DELAYED: "Kechikdi",
  EMPTY: "Bosh",
  BUSY: "Band",
  SERVICE: "Servisda",
};

const lockerStatusMap = {
  EMPTY: "Bosh",
  BUSY: "Band",
  DELAYED: "Kechikkan",
  SERVICE: "Servisda",
};

const paymentMap = {
  CASH: "Naqd",
  CARD: "Karta",
  TRANSFER: "O'tkazma",
  DEBT: "Qarz",
};

const reversePaymentMap = {
  Naqd: "CASH",
  Karta: "CARD",
  "Click/Payme": "CARD",
  "O'tkazma": "TRANSFER",
  "OвЂtkazma": "TRANSFER",
  Qarz: "DEBT",
};

const cashDirectionMap = {
  IN: "IN",
  OUT: "OUT",
};

const cashTypeMap = {
  ORDER_PAYMENT: "order payment",
  DEBT_CLOSE: "debt close",
  EXPENSE: "expense",
  INKASSA: "inkassa",
  MANUAL_CORRECTION: "manual correction",
};

const toPaymentType = (payment) => reversePaymentMap[payment] || payment || "CASH";
const toStatusLabel = (status) => statusMap[status] || status;
const toLockerStatusLabel = (status) => lockerStatusMap[status] || status;
const getItems = (payload) => payload?.items || payload?.data?.items || payload?.data || [];

const mapLocker = (locker) => {
  const branch = branchService.getBranchName(locker.branch);
  return {
    ...locker,
    branch,
    number: locker.number,
    size: locker.size,
    status: toLockerStatusLabel(locker.status),
    apiStatus: locker.status,
    activeOrderId: locker.currentOrderId,
    activeOrder: locker.currentOrder ? mapOrder(locker.currentOrder) : null,
  };
};

const mapOrder = (order) => {
  if (!order) return null;
  const branch = branchService.getBranchName(order.branch);
  const lockers = (order.items || []).map((item) => ({
    id: item.lockerId,
    lockerId: item.lockerId,
    number: item.lockerNumber,
    size: item.size,
    price: item.finalPrice,
    originalPrice: item.originalPrice,
    discountAmount: item.discountAmount,
    currency: item.currency,
  }));

  return {
    ...order,
    id: order.id,
    orderNumber: order.orderNumber,
    displayId: order.orderNumber,
    client: order.clientName,
    phone: order.phone,
    passport: order.passport,
    branch,
    branchId: order.branchId,
    status: toStatusLabel(order.status),
    apiStatus: order.status,
    payment: paymentMap[order.paymentType] || order.paymentType,
    paymentType: order.paymentType,
    checkIn: order.checkIn,
    checkOut: order.plannedCheckOut,
    plannedCheckOut: order.plannedCheckOut,
    pickupAt: order.realPickupTime,
    lockers,
    count: lockers.length,
    size: lockers.map((locker) => locker.size).join(", "),
    calculatedAmount: order.calculatedAmount,
    discount: order.discountAmount,
    discountAmount: order.discountAmount,
    finalPrice: order.finalAmount,
    finalAmount: order.finalAmount,
    realPaidAmount: order.realPaidAmount,
    overtimeAmount: order.overtimeAmount,
    overtimeHours: order.overtimeHours,
    currency: order.currency,
    note: order.note,
    cancelReason: order.cancelReason,
    debtAmount: order.debt?.status === "OPEN" ? order.debt.amount : 0,
    debtId: order.debt?.id,
    debtStatus: order.debt?.status,
    admin: order.createdBy?.name,
  };
};

const mapExpense = (expense) => ({
  ...expense,
  branch: branchService.getBranchName(expense.branch),
  admin: expense.createdBy?.name,
});

const mapInkassa = (item) => ({
  ...item,
  branch: branchService.getBranchName(item.branch),
  receiver: item.receiverName,
  admin: item.createdBy?.name,
});

const mapCashMovement = (item) => ({
  ...item,
  branch: branchService.getBranchName(item.branch),
  type: cashDirectionMap[item.direction] || item.direction,
  source: cashTypeMap[item.type] || item.type,
  payment: paymentMap[item.paymentType] || item.paymentType,
  orderNumber: item.order?.orderNumber,
  client: item.order?.clientName,
  admin: item.createdBy?.name,
});

const mapShift = (shift) => ({
  ...shift,
  branch: branchService.getBranchName(shift.branch),
  openedBy: shift.openedBy?.name,
  closedBy: shift.closedBy?.name,
  totalExpense: shift.expenseAmount,
  totalInkassa: shift.inkassaAmount,
  expectedCash: shift.systemExpectedCash,
});

const mapNotification = (notification) => ({
  ...notification,
  branch: branchService.getBranchName(notification.branch),
  read: notification.isRead,
  type: String(notification.type || "INFO").toLowerCase(),
});

const mapTariff = (tariff) => ({
  ...tariff,
  branch: branchService.getBranchName(tariff.branch),
});

export {
  getItems,
  mapCashMovement,
  mapExpense,
  mapInkassa,
  mapLocker,
  mapNotification,
  mapOrder,
  mapShift,
  mapTariff,
  paymentMap,
  toPaymentType,
};
