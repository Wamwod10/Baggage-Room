import { isKnownBranch } from "./branches";

const ORDERS_KEY = "br_orders";
const EXPENSES_KEY = "br_expenses";
const SHIFTS_KEY = "br_shifts";
const ACTIVITY_KEY = "br_activity_logs";

const filterByBranch = (items, branchName) =>
  items.filter((item) =>
    branchName ? item.branch === branchName : isKnownBranch(item.branch),
  );

const readJson = (key, fallback) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
};

const readArray = (key) => {
  const value = readJson(key, []);
  return Array.isArray(value) ? value : [];
};

export function getOrders(branchName = null) {
  return filterByBranch(readArray(ORDERS_KEY), branchName);
}

export function saveOrders(orders) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function createOrder(order) {
  const orders = getOrders();

  const newOrder = {
    ...order,
    id: `BR-${String(orders.length + 1).padStart(6, "0")}`,
    status: "Aktiv",
    createdAt: new Date().toISOString(),
    realPickupTime: null,
    reprintCount: 0,
  };

  saveOrders([newOrder, ...orders]);
  addActivityLog({
    action: "ORDER_CREATED",
    description: `${newOrder.id} — ${newOrder.client} order yaratildi`,
    branch: newOrder.branch,
    entityId: newOrder.id,
  });
  return newOrder;
}

export function updateOrder(orderId, updates) {
  const orders = getOrders();
  const existingOrder = orders.find((order) => order.id === orderId);

  const updated = orders.map((order) =>
    order.id === orderId ? { ...order, ...updates } : order,
  );

  saveOrders(updated);
  addActivityLog({
    action: "ORDER_UPDATED",
    description: `${orderId} order yangilandi`,
    branch: updates.branch || existingOrder?.branch,
    entityId: orderId,
  });
  return updated;
}

export function reprintOrder(orderId) {
  const orders = getOrders();
  const existingOrder = orders.find((order) => order.id === orderId);

  const updated = orders.map((order) =>
    order.id === orderId
      ? {
          ...order,
          reprintCount: (order.reprintCount || 0) + 1,
          lastPrintedAt: new Date().toISOString(),
        }
      : order,
  );

  saveOrders(updated);
  addActivityLog({
    action: "REPRINT",
    description: `${orderId} chek qayta chiqarildi`,
    branch: existingOrder?.branch,
    entityId: orderId,
  });
  return updated;
}

export function getExpenses(branchName = null) {
  const expenses = readArray(EXPENSES_KEY);
  const normalizedExpenses = expenses.map((expense, index) => ({
    ...expense,
    id: expense?.id || `EXP-${index}`,
    category: expense?.category || "",
    branch: expense?.branch || "",
    note: expense?.note || "",
    amount: Number(expense?.amount || 0),
    createdAt: expense?.createdAt || null,
  }));

  return filterByBranch(normalizedExpenses, branchName);
}

export function saveExpenses(expenses) {
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

export function createExpense(expense) {
  const expenses = getExpenses();

  const newExpense = {
    ...expense,
    id: `EXP-${Date.now()}`,
    amount: Number(expense.amount || 0),
    createdAt: new Date().toISOString(),
  };

  saveExpenses([newExpense, ...expenses]);

  addActivityLog({
    action: "EXPENSE_CREATED",
    description: `${newExpense.branch} — ${newExpense.category}: ${Number(
      newExpense.amount || 0,
    ).toLocaleString("uz-UZ")} so‘m harajat qo‘shildi`,
    branch: newExpense.branch,
    entityId: newExpense.id,
  });

  return newExpense;
}

export function deleteExpense(expenseId) {
  const expenses = getExpenses();
  const deletedExpense = expenses.find((item) => item.id === expenseId);
  const updated = expenses.filter((item) => item.id !== expenseId);

  saveExpenses(updated);

  if (deletedExpense) {
    addActivityLog({
      action: "EXPENSE_DELETED",
      description: `${deletedExpense.category}: ${Number(
        deletedExpense.amount || 0,
      ).toLocaleString("uz-UZ")} so‘m harajat o‘chirildi`,
      branch: deletedExpense.branch,
      entityId: deletedExpense.id,
    });
  }

  return updated;
}

export function getShifts(branchName = null) {
  return filterByBranch(readArray(SHIFTS_KEY), branchName);
}

export function saveShifts(shifts) {
  localStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts));
}

export function getCurrentShift(branchName = null) {
  return getShifts(branchName).find((shift) => shift.status === "OPEN") || null;
}

export function openShift({ branch, admin, shiftTime, openingCash }) {
  const current = getCurrentShift(branch);

  if (current) {
    throw new Error("Hozir ochiq kassa mavjud");
  }

  const shifts = getShifts();

  const newShift = {
    id: `SHIFT-${Date.now()}`,
    branch,
    admin,
    shiftTime,
    openingCash: Number(openingCash || 0),
    closingCash: 0,
    openedAt: new Date().toISOString(),
    closedAt: null,
    status: "OPEN",
    totalRevenue: 0,
    totalExpense: 0,
    netProfit: 0,
  };

  saveShifts([newShift, ...shifts]);

  addActivityLog({
    action: "SHIFT_OPENED",
    description: `${newShift.branch} kassasi ochildi`,
    branch: newShift.branch,
    user: newShift.admin,
    entityId: newShift.id,
  });

  return newShift;
}

export function closeShift(branchName, { closingCash }) {
  const shifts = getShifts();
  const current = getCurrentShift(branchName);

  if (!current) {
    throw new Error("Ochiq kassa topilmadi");
  }

  const orders = getOrders(branchName);
  const expenses = getExpenses(branchName);

  const openedTime = new Date(current.openedAt).getTime();

  const shiftOrders = orders.filter(
    (order) => new Date(order.createdAt).getTime() >= openedTime,
  );

  const shiftExpenses = expenses.filter(
    (expense) => new Date(expense.createdAt).getTime() >= openedTime,
  );

  const totalRevenue = shiftOrders.reduce(
    (sum, order) => sum + Number(order.finalPrice || 0),
    0,
  );

  const totalExpense = shiftExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0,
  );

  const updated = shifts.map((shift) =>
    shift.id === current.id
      ? {
          ...shift,
          closingCash: Number(closingCash || 0),
          closedAt: new Date().toISOString(),
          status: "CLOSED",
          totalRevenue,
          totalExpense,
          netProfit: totalRevenue - totalExpense,
        }
      : shift,
  );

  const closedShift = updated.find((shift) => shift.id === current.id);

  saveShifts(updated);

  addActivityLog({
    action: "SHIFT_CLOSED",
    description: `${closedShift.branch} kassasi yopildi. Revenue: ${Number(
      closedShift.totalRevenue || 0,
    ).toLocaleString("uz-UZ")} so‘m`,
    branch: closedShift.branch,
    user: closedShift.admin,
    entityId: closedShift.id,
  });

  return updated;
}

const SETTINGS_KEY = "br_settings";

const DEFAULT_SETTINGS = {
  language: "uzLatn",
  theme: "light",
  pricing: {
    Small: 35000,
    Medium: 50000,
    Large: 70000,
    XL: 100000,
  },
  overtimePerHour: 10000,
  telegram: {
    botToken: "8705025975:AAEbVNwopLn6UGrNrL_qcgmRfA2ZXkaEpBk",
    groupId: "-1003835856932",
    enabled: true,
    newOrder: true,
    shiftOpened: true,
    shiftClosed: true,
    orderCancelled: true,
    delayedBaggage: true,
    expenseAlerts: false,
  },
};

const normalizeSettings = (settings = {}) => ({
  ...DEFAULT_SETTINGS,
  ...settings,
  language:
    settings.language === "uz"
      ? "uzLatn"
      : ["uzLatn", "uzCyrl", "ru"].includes(settings.language)
        ? settings.language
        : DEFAULT_SETTINGS.language,
  pricing: {
    ...DEFAULT_SETTINGS.pricing,
    ...(settings.pricing || {}),
  },
  telegram: {
    ...DEFAULT_SETTINGS.telegram,
    ...(settings.telegram || {}),
  },
});

export function getSettings() {
  const settings = readJson(SETTINGS_KEY, null);

  return settings ? normalizeSettings(settings) : DEFAULT_SETTINGS;
}

export function saveSettings(settings) {
  const normalizedSettings = normalizeSettings(settings);

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizedSettings));
  return normalizedSettings;
}

export function getDashboardStats(branchName = null) {
  const orders = getOrders(branchName);
  const expenses = getExpenses(branchName);
  const shifts = getShifts(branchName);

  const today = new Date().toISOString().slice(0, 10);

  const todayOrders = orders.filter((order) =>
    order.createdAt?.startsWith(today),
  );

  const todayExpenses = expenses.filter((expense) =>
    expense.createdAt?.startsWith(today),
  );

  const revenue = todayOrders.reduce(
    (sum, order) => sum + Number(order.finalPrice || 0),
    0,
  );

  const expenseTotal = todayExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0,
  );

  const active = orders.filter((order) => order.status === "Aktiv").length;
  const pickedUp = orders.filter(
    (order) => order.status === "Olib ketildi",
  ).length;
  const cancelled = orders.filter(
    (order) => order.status === "Bekor qilindi",
  ).length;

  const cash = todayOrders
    .filter((order) => order.payment === "Naqd")
    .reduce((sum, order) => sum + Number(order.finalPrice || 0), 0);

  const card = todayOrders
    .filter((order) => order.payment === "Karta")
    .reduce((sum, order) => sum + Number(order.finalPrice || 0), 0);

  const clickPayme = todayOrders
    .filter((order) => order.payment === "Click/Payme")
    .reduce((sum, order) => sum + Number(order.finalPrice || 0), 0);

  const transfer = todayOrders
    .filter(
      (order) => order.payment === "O'tkazma" || order.payment === "O‘tkazma",
    )
    .reduce((sum, order) => sum + Number(order.finalPrice || 0), 0);

  return {
    revenue,
    expenseTotal,
    netProfit: revenue - expenseTotal,
    ordersCount: todayOrders.length,
    active,
    pickedUp,
    cancelled,
    cash,
    card,
    clickPayme,
    transfer,
    shiftsCount: shifts.length,
  };
}

export function getNotifications(branchName = null) {
  const orders = getOrders(branchName);
  const currentShift = getCurrentShift(branchName);

  const notifications = [];

  const now = Date.now();

  orders.forEach((order) => {
    if (!order.checkOut || order.status !== "Aktiv") return;

    const checkoutTime = new Date(order.checkOut).getTime();
    const diffMinutes = Math.round((checkoutTime - now) / 60000);

    if (diffMinutes <= 30 && diffMinutes > 0) {
      notifications.push({
        id: `pickup-${order.id}`,
        type: "warning",
        title: "Check-out vaqti yaqin",
        message: `${order.id} — ${order.client} pickup ${diffMinutes} daqiqadan keyin`,
      });
    }

    if (diffMinutes <= 0) {
      notifications.push({
        id: `late-${order.id}`,
        type: "danger",
        title: "Baggage kechikdi",
        message: `${order.id} — ${order.client} check-out vaqtidan o‘tgan`,
      });
    }
  });

  if (!currentShift) {
    notifications.push({
      id: "shift-closed",
      type: "danger",
      title: "Kassa yopiq",
      message: "Hozir ochiq kassa topilmadi",
    });
  }

  if (notifications.length === 0) {
    notifications.push({
      id: "all-good",
      type: "success",
      title: "Hammasi joyida",
      message: "Hozircha muhim ogohlantirish yo‘q",
    });
  }

  return notifications;
}

export function calculateOvertime(order) {
  const settings = getSettings();

  if (!order.checkOut) {
    return {
      status: order.status,
      overtimeAmount: 0,
      overtimeHours: 0,
    };
  }

  if (order.status !== "Aktiv" && order.status !== "Kechikdi") {
    return {
      status: order.status,
      overtimeAmount: order.overtimeAmount || 0,
      overtimeHours: order.overtimeHours || 0,
    };
  }

  const now = Date.now();
  const checkoutTime = new Date(order.checkOut).getTime();

  if (now <= checkoutTime) {
    return {
      status: "Aktiv",
      overtimeAmount: 0,
      overtimeHours: 0,
    };
  }

  const diffMs = now - checkoutTime;
  const overtimeHours = Math.max(1, Math.floor(diffMs / 1000 / 60 / 60));
  const overtimeAmount = overtimeHours * Number(settings.overtimePerHour || 0);

  return {
    status: "Kechikdi",
    overtimeAmount,
    overtimeHours,
  };
}

export function syncOvertimeOrders(branchName = null) {
  const orders = getOrders();

  const updated = orders.map((order) => {
    const overtime = calculateOvertime(order);

    return {
      ...order,
      ...overtime,
    };
  });

  saveOrders(updated);
  return filterByBranch(updated, branchName);
}

export function getActivityLogs(branchName = null) {
  return filterByBranch(readArray(ACTIVITY_KEY), branchName);
}

export function addActivityLog(log) {
  const logs = getActivityLogs();

  const newLog = {
    id: `LOG-${Date.now()}`,
    action: log.action,
    description: log.description,
    branch: log.branch || "-",
    user: log.user || "Admin",
    entityId: log.entityId || "-",
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(ACTIVITY_KEY, JSON.stringify([newLog, ...logs]));
  return newLog;
}
