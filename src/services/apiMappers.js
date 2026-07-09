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
  CARD: "Terminal",
  TERMINAL: "Terminal",
  CLICK: "Click",
  PAYME: "Payme",
  TRANSFER: "Terminal",
  DEBT: "Qarz",
};

const reversePaymentMap = {
  Naqd: "CASH",
  Karta: "CARD",
  Terminal: "TERMINAL",
  Click: "CLICK",
  Payme: "PAYME",
  "Click/Payme": "CLICK",
  "O'tkazma": "TRANSFER",
  "O‘tkazma": "TRANSFER",
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

const fallbackText = "-";
const toPaymentType = (payment) => reversePaymentMap[payment] || payment || null;
const toStatusLabel = (status) => statusMap[status] || status;
const toLockerStatusLabel = (status) => lockerStatusMap[status] || status;
const toDisplayText = (value, fallback = fallbackText) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (["string", "number", "boolean"].includes(typeof value)) return String(value);
  if (typeof value === "object") {
    return (
      value.displayName ||
      value.name ||
      value.login ||
      value.title ||
      value.message ||
      value.id ||
      fallback
    );
  }
  return fallback;
};
const unwrapData = (payload) => payload?.data ?? payload ?? null;
const asArray = (value) => (Array.isArray(value) ? value : []);
const getItems = (payload) => {
  const data = unwrapData(payload);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};
const getData = (payload, fallback = null) => unwrapData(payload) ?? fallback;
const getArrayData = (payload) => asArray(unwrapData(payload));

const mapLocker = (locker) => {
  if (!locker) return null;
  const branch = branchService.getBranchName(locker.branch);
  return {
    ...locker,
    branch,
    number: locker.number ?? fallbackText,
    size: locker.size || fallbackText,
    status: toLockerStatusLabel(locker.status),
    apiStatus: locker.status,
    activeOrderId: locker.currentOrderId,
    activeOrder: locker.currentOrder ? mapOrder(locker.currentOrder) : null,
  };
};

const mapOrder = (order) => {
  if (!order) return null;
  const branch = branchService.getBranchName(order.branch);
  const items = asArray(order.items);
  const lockers = items.map((item) => ({
    id: item.id || item.lockerId,
    itemId: item.id,
    lockerId: item.lockerId,
    number: item.lockerNumber,
    size: item.size,
    count: Number(item.count || 1),
    unitPrice: item.unitPrice,
    price: item.finalPrice,
    originalPrice: item.originalPrice,
    discountAmount: item.discountAmount,
    currency: item.currency,
  }));

  return {
    ...order,
    id: order.id || order.orderNumber || fallbackText,
    orderNumber: order.orderNumber || fallbackText,
    displayId: order.orderNumber || fallbackText,
    client: order.clientName || order.client || fallbackText,
    phone: order.phone || fallbackText,
    passport: order.passport || "",
    branch: branch || fallbackText,
    branchId: order.branchId,
    status: toStatusLabel(order.status),
    apiStatus: order.status,
    payment: paymentMap[order.paymentType] || order.paymentType || fallbackText,
    paymentType: order.paymentType || null,
    overtimePayment: paymentMap[order.overtimePaymentType] || order.overtimePaymentType || null,
    overtimePaymentType: order.overtimePaymentType || null,
    checkIn: order.checkIn,
    checkOut: order.plannedCheckOut,
    plannedCheckOut: order.plannedCheckOut,
    pickupAt: order.realPickupTime,
    lockers,
    baggageItems: lockers,
    count: lockers.reduce((total, locker) => total + Number(locker.count || 1), 0),
    size: lockers.map((locker) => `${locker.size}${Number(locker.count || 1) > 1 ? ` x${locker.count}` : ""}`).filter(Boolean).join(", ") || order.size || fallbackText,
    calculatedAmount: order.calculatedAmount,
    discount: order.discountAmount,
    discountAmount: order.discountAmount,
    finalPrice: order.finalAmount,
    finalAmount: order.finalAmount,
    realPaidAmount: order.realPaidAmount,
    difference: order.paymentDifference,
    paymentDifference: order.paymentDifference,
    overtimeAmount: order.overtimeAmount,
    overtimeHours: order.overtimeHours,
    currency: order.currency || "UZS",
    note: order.note,
    cancelReason: order.cancelReason,
    debtAmount: order.debt?.status === "OPEN" ? order.debt.amount : 0,
    debtId: order.debt?.id,
    debtStatus: order.debt?.status,
    admin: order.createdBy?.name || order.createdBy?.login || order.admin || fallbackText,
  };
};

const mapExpense = (expense = {}) => ({
  ...expense,
  branch: branchService.getBranchName(expense.branch) || expense.branch || fallbackText,
  category: expense.category || fallbackText,
  amount: Number(expense.amount || 0),
  currency: expense.currency || "UZS",
  admin: expense.createdBy?.name || expense.createdBy?.login || fallbackText,
});

const mapInkassa = (item = {}) => ({
  ...item,
  branch: branchService.getBranchName(item.branch) || item.branch || fallbackText,
  receiver: item.receiverName || item.receiver || fallbackText,
  receiverName: item.receiverName || item.receiver || fallbackText,
  amount: Number(item.amount || 0),
  currency: item.currency || "UZS",
  admin: item.createdBy?.name || item.createdBy?.login || fallbackText,
});

const mapCashMovement = (item = {}) => ({
  ...item,
  branch: branchService.getBranchName(item.branch) || item.branch || fallbackText,
  type: cashDirectionMap[item.direction] || item.direction || fallbackText,
  source: cashTypeMap[item.type] || item.type || fallbackText,
  payment: paymentMap[item.paymentType] || item.paymentType || fallbackText,
  amount: Number(item.amount || 0),
  currency: item.currency || "UZS",
  orderNumber: item.order?.orderNumber || fallbackText,
  client: item.order?.clientName || fallbackText,
  admin: item.createdBy?.name || item.createdBy?.login || fallbackText,
});

const mapShift = (shift) => {
  // If there's no meaningful shift data (for example empty object returned
  // from API), treat it as no shift. Real shifts always have an `id`.
  if (!shift || !shift.id) return null;
  const openedByName = shift.openedBy?.name || shift.openedBy?.login || shift.admin || fallbackText;
  const closedByName = shift.closedBy?.name || shift.closedBy?.login || shift.closedByName || fallbackText;
  const acceptedCash = Number(shift.acceptedCash ?? shift.acceptedAmount ?? 0);
  const openingCash = Number(shift.openingCash || 0);
  const expenseAmount = Number(shift.expenseAmount ?? shift.totalExpense ?? 0);
  const salaryAmount = Number(shift.salaryAmount || 0);
  const inkassaAmount = Number(shift.inkassaAmount ?? shift.totalInkassa ?? 0);
  const totalRevenue = Number(shift.totalRevenue || 0);
  const debtAmount = Number(shift.debtAmount ?? shift.totalDebt ?? 0);
  const systemExpectedCash = Number(
    shift.systemExpectedCash ??
      shift.expectedCash ??
      shift.cashLeft ??
      openingCash + acceptedCash + totalRevenue - expenseAmount - inkassaAmount,
  );
  const currencyMap = (value, fallbackUzs = 0) => {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return ["UZS", "USD", "EUR", "RUB"].reduce((result, currency) => {
      result[currency] = Number(source[currency] ?? (currency === "UZS" ? fallbackUzs : 0));
      return result;
    }, {});
  };

  return {
    ...shift,
    branch: branchService.getBranchName(shift.branch) || shift.branch || fallbackText,
    admin: shift.acceptedByName || openedByName,
    openedBy: openedByName,
    openedByName,
    openedByLogin: shift.openedBy?.login || "",
    closedBy: closedByName,
    closedByName,
    closedByLogin: shift.closedBy?.login || "",
    acceptedFromName: shift.acceptedFromName || shift.receivedFrom || fallbackText,
    receivedFrom: shift.acceptedFromName || shift.receivedFrom || fallbackText,
    acceptedByName: shift.acceptedByName || openedByName,
    acceptedCash,
    acceptedAmount: acceptedCash,
    openingCash,
    openingCashByCurrency: currencyMap(shift.openingCashByCurrency, openingCash),
    acceptedCashByCurrency: currencyMap(shift.acceptedCashByCurrency, acceptedCash),
    closingCashByCurrency: currencyMap(shift.closingCashByCurrency, shift.closingCash || 0),
    differenceByCurrency: currencyMap(shift.differenceByCurrency, shift.difference || 0),
    closingCash: Number(shift.closingCash || 0),
    totalRevenue,
    cashRevenue: Number(shift.cashRevenue || 0),
    cardRevenue: Number(shift.cardRevenue || 0),
    terminalRevenue: Number(shift.terminalRevenue ?? shift.cardRevenue ?? 0),
    clickRevenue: Number(shift.clickRevenue || 0),
    paymeRevenue: Number(shift.paymeRevenue || 0),
    transferRevenue: Number(shift.transferRevenue || 0),
    debtAmount,
    totalDebt: debtAmount,
    expenseAmount,
    totalExpense: expenseAmount,
    salaryAmount,
    salaryReceiver: shift.salaryReceiver || "",
    inkassaAmount,
    totalInkassa: inkassaAmount,
    systemExpectedCash,
    expectedCash: systemExpectedCash,
    cashLeft: Number(shift.cashLeft ?? systemExpectedCash ?? shift.closingCash ?? 0),
    netProfit: Number(shift.netProfit ?? totalRevenue - expenseAmount - inkassaAmount),
    // do not assume OPEN when status is missing — keep actual status or null
    status: shift.status || null,
    shiftTime: shift.shiftTime || fallbackText,
  };
};

const mapNotification = (notification = {}) => ({
  ...notification,
  id: notification.id || `${notification.type || "INFO"}-${notification.createdAt || notification.title || "notification"}`,
  title: notification.title || fallbackText,
  message: notification.message || fallbackText,
  branch: branchService.getBranchName(notification.branch) || notification.branch || fallbackText,
  read: notification.isRead,
  type: String(notification.type || "INFO").toLowerCase(),
});

const mapActivityLog = (log = {}) => ({
  ...log,
  id: log.id || `${log.action || "ACTIVITY"}-${log.createdAt || Math.random()}`,
  action: toDisplayText(log.action),
  description: toDisplayText(log.description, toDisplayText(log.action)),
  branch:
    branchService.getBranchName(log.branch) ||
    toDisplayText(log.branch, log.branchId || fallbackText),
  user: toDisplayText(log.user),
});

const mapTariff = (tariff = {}) => ({
  ...tariff,
  branch: branchService.getBranchName(tariff.branch) || tariff.branch || fallbackText,
  size: tariff.size || fallbackText,
});

export {
  asArray,
  getArrayData,
  getData,
  getItems,
  mapActivityLog,
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
