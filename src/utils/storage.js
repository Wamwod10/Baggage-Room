import { getBranchNames, isKnownBranch } from "./branches";
import { convertFromUZS } from "./currency";

const ORDERS_KEY = "br_orders";
const EXPENSES_KEY = "br_expenses";
const SHIFTS_KEY = "br_shifts";
const ACTIVITY_KEY = "br_activity_logs";
const SETTINGS_KEY = "br_settings";
const CASH_MOVEMENTS_KEY = "br_cash_movements";
const INKASSA_KEY = "br_inkassa";

export const PAYMENT_TYPES = ["Naqd", "Karta", "Click/Payme", "O'tkazma", "Qarz"];
export const CURRENCIES = ["UZS", "USD", "RUB", "EUR"];
export const LOCKER_STATUSES = {
  FREE: "Bosh",
  BUSY: "Band",
  DELAYED: "Kechikkan",
  SERVICE: "Servisda",
};

const commonSmallLockers = [1, 4, 5, 6, 9, 13, 14, 15, 16, 17, 18, 19];
const commonMediumLockers = [2, 3, 7, 8, 11, 12, 19, 20];
const commonLargeLockers = [10, 21];

const airportMediumLockers = [
  ...Array.from({ length: 10 }, (_, index) => index + 1),
  ...Array.from({ length: 8 }, (_, index) => index + 12),
  ...Array.from({ length: 8 }, (_, index) => index + 21),
  ...Array.from({ length: 4 }, (_, index) => index + 32),
];

const uniqueLockerNumbers = (...groups) => [...new Set(groups.flat())].sort((a, b) => a - b);

const lockerPresetByBranch = {
  "Toshkent xalqaro aeroport": {
    S: [29, 30, 31, 36, 37, 38, 39, 40, 41, 42, 43, 44],
    M: airportMediumLockers,
    L: [11, 20],
  },
};

const getBranchLockerPreset = (branch) =>
  lockerPresetByBranch[branch] || {
    S: commonSmallLockers,
    M: commonMediumLockers,
    L: commonLargeLockers,
  };

export const buildDefaultLockers = (branch) => {
  const preset = getBranchLockerPreset(branch);
  const numbers = uniqueLockerNumbers(preset.S, preset.M, preset.L);

  return numbers.map((number) => {
    const sizes = Object.entries(preset)
      .filter(([, list]) => list.includes(number))
      .map(([size]) => size);

    return {
      id: `${branch}-${number}`,
      number,
      size: sizes[0] || "S",
      sizes,
      branch,
      status: LOCKER_STATUSES.FREE,
      serviceReason: "",
      updatedAt: null,
    };
  });
};

const DEFAULT_TARIFFS = [1, 12, 24, 48, 72];

const makeSizeTariff = (one, twelve, day, twoDays, threeDays, after72) => ({
  1: one,
  12: twelve,
  24: day,
  48: twoDays,
  72: threeDays,
  after72,
});

const AIRPORT_TASHKENT_TARIFFS = {
  S: makeSizeTariff(20000, 100000, 160000, 240000, 300000, 100000),
  M: makeSizeTariff(30000, 120000, 200000, 300000, 380000, 120000),
  L: makeSizeTariff(40000, 180000, 300000, 450000, 550000, 180000),
};

const STATION_TARIFFS = {
  S: makeSizeTariff(4000, 40000, 75000, 120000, 180000, 30000),
  M: makeSizeTariff(6000, 55000, 100000, 160000, 240000, 40000),
  L: makeSizeTariff(8000, 75000, 140000, 240000, 360000, 50000),
};

const AIRPORT_SAMARKAND_TARIFFS = {
  S: makeSizeTariff(20000, 100000, 150000, 200000, 250000, 30000),
  M: makeSizeTariff(30000, 150000, 250000, 300000, 400000, 40000),
  L: makeSizeTariff(40000, 200000, 300000, 400000, 500000, 50000),
};

const cloneTariffTable = (table) =>
  Object.fromEntries(
    Object.entries(table).map(([size, tariff]) => [size, { ...tariff }]),
  );

const getDefaultTariffTable = (branch) => {
  if (branch === "Toshkent xalqaro aeroport") {
    return cloneTariffTable(AIRPORT_TASHKENT_TARIFFS);
  }

  if (branch === "Samarqand xalqaro aeroport") {
    return cloneTariffTable(AIRPORT_SAMARKAND_TARIFFS);
  }

  return cloneTariffTable(STATION_TARIFFS);
};

const DEFAULT_SETTINGS = {
  language: "uzLatn",
  theme: "light",
  pricing: {
    S: 10000,
    M: 15000,
    L: 20000,
    Small: 10000,
    Medium: 15000,
    Large: 20000,
    XL: 25000,
  },
  branchTariffs: {},
  currencies: CURRENCIES,
  defaultCurrency: "UZS",
  exchangeRates: {
    UZS: 1,
    USD: 12500,
    RUB: 140,
    EUR: 13500,
  },
  overtimePerHour: 10000,
  lockers: {},
  googleSheets: {
    enabled: false,
    endpoint: "",
    queues: ["orders", "shifts", "expenses", "inkassa", "reports"],
  },
  exportCenter: {
    orders: true,
    shifts: true,
    finance: true,
    analytics: true,
  },
  printer: {
    paperWidth: "80mm",
    logoEnabled: true,
    logoSrc: "/1.jpg",
    fontWeight: "bold",
  },
  telegram: {
    enabled: false,
    botToken: "",
    groupId: "",
    groups: {},
    newOrder: true,
    shiftOpened: true,
    shiftClosed: true,
    orderCancelled: true,
    delayedBaggage: true,
    overtimePayment: true,
    debtClosed: true,
    inkassa: true,
    expenseAlerts: true,
    orderEdit: true,
    lockerTransfer: true,
    lockerBlock: true,
  },
};

const branchDefaults = () =>
  getBranchNames().reduce((result, branch) => {
    result[branch] = {
      tariffs: DEFAULT_TARIFFS,
      sizes: getDefaultTariffTable(branch),
    };
    return result;
  }, {});

const defaultLockerSettings = () =>
  getBranchNames().reduce((result, branch) => {
    result[branch] = buildDefaultLockers(branch);
    return result;
  }, {});

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

const normalizeLockers = (lockers = {}) => {
  const defaults = defaultLockerSettings();

  return getBranchNames().reduce((result, branch) => {
    const saved = Array.isArray(lockers?.[branch]) ? lockers[branch] : [];
    const savedByNumber = new Map(saved.map((locker) => [Number(locker.number), locker]));

    result[branch] = defaults[branch].map((locker) => ({
      ...locker,
      ...(savedByNumber.get(Number(locker.number)) || {}),
      branch,
      number: Number(locker.number),
      size: (savedByNumber.get(Number(locker.number)) || locker).size || locker.size,
      sizes: locker.sizes,
    }));

    return result;
  }, {});
};

const normalizeSettings = (settings = {}) => {
  const branchTariffs = branchDefaults();
  const savedBranchTariffs = settings.branchTariffs || {};

  Object.keys(branchTariffs).forEach((branch) => {
    const saved = savedBranchTariffs[branch] || {};
    const defaultSizes = branchTariffs[branch].sizes;
    const sizes = ["S", "M", "L"].reduce((result, size) => {
      const savedSize = saved.sizes?.[size] || saved[size] || {};
      const fallbackHourly = Number(saved.oneHourPrice || defaultSizes[size]?.[1] || 0);

      result[size] = {
        ...defaultSizes[size],
        ...savedSize,
        1: Number(savedSize[1] ?? savedSize.oneHour ?? fallbackHourly),
        12: Number(savedSize[12] ?? defaultSizes[size][12]),
        24: Number(savedSize[24] ?? defaultSizes[size][24]),
        48: Number(savedSize[48] ?? defaultSizes[size][48]),
        72: Number(savedSize[72] ?? defaultSizes[size][72]),
        after72: Number(savedSize.after72 ?? defaultSizes[size].after72),
      };

      return result;
    }, {});

    branchTariffs[branch] = {
      ...branchTariffs[branch],
      ...saved,
      sizes,
      tariffs: Array.isArray(saved.tariffs)
        ? saved.tariffs.map(Number).filter((value) => value > 0)
        : branchTariffs[branch].tariffs,
    };
  });

  const telegramGroups = getBranchNames().reduce((result, branch) => {
    result[branch] = {
      token: settings.telegram?.groups?.[branch]?.token || settings.telegram?.botToken || "",
      groupId: settings.telegram?.groups?.[branch]?.groupId || settings.telegram?.groupId || "",
      // Respect backend setting when available. Default to `false` when no value provided
      // to avoid enabling Telegram on frontend when backend has no setting for branch.
      enabled: settings.telegram?.groups?.[branch]?.enabled ?? settings.telegram?.enabled ?? false,
    };
    return result;
  }, {});

  return {
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
    branchTariffs,
    currencies: Array.isArray(settings.currencies) && settings.currencies.length
      ? settings.currencies
      : DEFAULT_SETTINGS.currencies,
    exchangeRates: {
      ...DEFAULT_SETTINGS.exchangeRates,
      ...(settings.exchangeRates || {}),
    },
    lockers: normalizeLockers(settings.lockers),
    telegram: {
      ...DEFAULT_SETTINGS.telegram,
      ...(settings.telegram || {}),
      groups: telegramGroups,
    },
    googleSheets: {
      ...DEFAULT_SETTINGS.googleSheets,
      ...(settings.googleSheets || {}),
    },
    exportCenter: {
      ...DEFAULT_SETTINGS.exportCenter,
      ...(settings.exportCenter || {}),
    },
    printer: {
      ...DEFAULT_SETTINGS.printer,
      ...(settings.printer || {}),
    },
  };
};

export function getSettings() {
  const settings = readJson(SETTINGS_KEY, null);
  return settings ? normalizeSettings(settings) : normalizeSettings(DEFAULT_SETTINGS);
}

export function saveSettings(settings) {
  const normalizedSettings = normalizeSettings(settings);
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizedSettings));
  return normalizedSettings;
}

const hasAmount = (value) =>
  value !== undefined &&
  value !== null &&
  value !== "" &&
  Number.isFinite(Number(value));

const normalizeOrderLocker = (locker = {}) => {
  const normalized = {
    ...locker,
    number: Number(locker.number),
    size: locker.size || "M",
  };

  [
    "price",
    "originalPrice",
    "discount",
    "finalPrice",
    "originalAmountUZS",
    "tariffHours",
  ].forEach((key) => {
    if (hasAmount(locker[key])) {
      normalized[key] = Number(locker[key]);
    }
  });

  if (locker.currency) {
    normalized.currency = locker.currency;
  }

  return normalized;
};

const normalizeOrder = (order) => {
  const lockers = Array.isArray(order.lockers) && order.lockers.length
    ? order.lockers.map(normalizeOrderLocker)
    : order.lockerNumber
      ? [normalizeOrderLocker({ number: Number(order.lockerNumber), size: order.size || "M" })]
      : [];
  const currency = order.currency || "UZS";
  const calculatedAmount = Number(order.calculatedAmount ?? order.finalPrice ?? 0);
  const realPaidAmount = Number(order.realPaidAmount ?? order.finalPrice ?? calculatedAmount);

  return {
    ...order,
    lockers,
    size: order.size || lockers[0]?.size || "M",
    count: Number(order.count || lockers.length || 1),
    currency,
    calculatedAmount,
    realPaidAmount,
    finalPrice: Number(order.finalPrice ?? realPaidAmount),
    payment: order.payment || "Naqd",
    exchangeRate: Number(order.exchangeRate || 1),
    originalAmountUZS: Number(order.originalAmountUZS || calculatedAmount),
    finalAmount: Number(order.finalAmount ?? realPaidAmount),
    discount: Number(order.discount || 0),
    overtimeAmount: Number(order.overtimeAmount || 0),
    overtimeAmountUZS: Number(order.overtimeAmountUZS || 0),
    overtimeHours: Number(order.overtimeHours || 0),
    debtAmount: Number(order.debtAmount || (order.payment === "Qarz" ? realPaidAmount : 0)),
    debtClosedAt: order.debtClosedAt || null,
    debtClosedBy: order.debtClosedBy || null,
  };
};

export function getOrders(branchName = null) {
  return filterByBranch(readArray(ORDERS_KEY).map(normalizeOrder), branchName);
}

export function saveOrders(orders) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders.map(normalizeOrder)));
}

export function getCashMovements(branchName = null) {
  return filterByBranch(readArray(CASH_MOVEMENTS_KEY), branchName);
}

export function saveCashMovements(items) {
  localStorage.setItem(CASH_MOVEMENTS_KEY, JSON.stringify(items));
}

export function addCashMovement(movement) {
  const movements = getCashMovements();
  const amount = Number(movement.amount || 0);

  if (!amount) return null;

  const newMovement = {
    id: `CASH-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: movement.type || "IN",
    source: movement.source || "manual",
    orderId: movement.orderId || null,
    branch: movement.branch,
    admin: movement.admin || "Admin",
    amount,
    currency: movement.currency || "UZS",
    payment: movement.payment || null,
    note: movement.note || "",
    createdAt: movement.createdAt || new Date().toISOString(),
  };

  saveCashMovements([newMovement, ...movements]);
  addActivityLog({
    action: "CASH_MOVEMENT",
    description: `${newMovement.source}: ${amount.toLocaleString("uz-UZ")} ${newMovement.currency}`,
    branch: newMovement.branch,
    user: newMovement.admin,
    entityId: newMovement.orderId || newMovement.id,
    newValue: newMovement,
  });
  return newMovement;
}

const getOneHourPrice = (branch, size = "M") => {
  const settings = getSettings();
  const branchTariff = settings.branchTariffs?.[branch] || {};
  const sizeKey = ["S", "M", "L"].includes(size) ? size : String(size || "M").slice(0, 1).toUpperCase();
  return Number(
    branchTariff.sizes?.[sizeKey]?.[1] ||
      branchTariff.oneHourPrice ||
      settings.pricing?.[sizeKey] ||
      settings.overtimePerHour ||
      0,
  );
};

const calculateSizeTariff = (branch, size, hours, isCustom = false) => {
  const hourCount = Math.max(1, Math.ceil(Number(hours || 1)));
  const settings = getSettings();
  const sizeKey = ["S", "M", "L"].includes(size) ? size : String(size || "M").slice(0, 1).toUpperCase();
  const tariff = settings.branchTariffs?.[branch]?.sizes?.[sizeKey];

  if (!tariff) {
    return getOneHourPrice(branch, sizeKey) * hourCount;
  }

  if (isCustom) {
    return Number(tariff[1] || 0) * hourCount;
  }

  if (hourCount <= 1) return Number(tariff[1] || 0);
  if (hourCount <= 12) return Number(tariff[12] || tariff[1] * hourCount || 0);
  if (hourCount <= 24) return Number(tariff[24] || tariff[1] * hourCount || 0);
  if (hourCount <= 48) return Number(tariff[48] || tariff[1] * hourCount || 0);
  if (hourCount <= 72) return Number(tariff[72] || tariff[1] * hourCount || 0);

  return (
    Number(tariff[72] || 0) +
    Math.ceil((hourCount - 72) / 24) * Number(tariff.after72 || tariff[24] || 0)
  );
};

const roundCurrencyAmount = (amount, currency = "UZS") => {
  const decimals = ["USD", "EUR"].includes(currency) ? 2 : 0;
  const factor = 10 ** decimals;

  return Math.round(Number(amount || 0) * factor) / factor;
};

const buildLockerPriceBreakdown = ({
  branch,
  lockers = [],
  hours = 1,
  isCustom = false,
  currency = "UZS",
  discount = 0,
  exchangeRates = {},
}) => {
  if (!lockers.length) return [];

  const pricedLockers = lockers.map((locker) => {
    const size = locker.size || "M";
    const originalAmountUZS = calculateSizeTariff(branch, size, hours, isCustom);
    const originalPrice = roundCurrencyAmount(
      convertFromUZS(originalAmountUZS, currency, exchangeRates),
      currency,
    );

    return {
      ...locker,
      number: Number(locker.number),
      size,
      originalAmountUZS,
      originalPrice,
      tariffHours: Number(hours || 1),
      currency,
    };
  });

  const totalOriginal = pricedLockers.reduce(
    (sum, locker) => sum + Number(locker.originalPrice || 0),
    0,
  );
  const boundedDiscount = Math.min(Math.max(Number(discount || 0), 0), totalOriginal);
  let remainingDiscount = roundCurrencyAmount(boundedDiscount, currency);

  return pricedLockers.map((locker, index) => {
    const isLast = index === pricedLockers.length - 1;
    const lockerDiscount = isLast
      ? remainingDiscount
      : roundCurrencyAmount(
          totalOriginal > 0 ? (boundedDiscount * locker.originalPrice) / totalOriginal : 0,
          currency,
        );
    remainingDiscount = roundCurrencyAmount(remainingDiscount - lockerDiscount, currency);
    const finalPrice = roundCurrencyAmount(
      Math.max(Number(locker.originalPrice || 0) - lockerDiscount, 0),
      currency,
    );

    return {
      ...locker,
      discount: lockerDiscount,
      finalPrice,
      price: finalPrice,
    };
  });
};

export function calculateTariffAmount({ branch, lockers = [], hours = 1, isCustom = false }) {
  const normalizedLockers = lockers.length ? lockers : [{ size: "M" }];

  return normalizedLockers.reduce(
    (sum, locker) => sum + calculateSizeTariff(branch, locker.size || "M", hours, isCustom),
    0,
  );
}

export function createOrder(order) {
  const orders = getOrders();
  const normalizedInput = normalizeOrder(order);
  const settings = getSettings();
  const shouldBuildLockerPrices =
    normalizedInput.lockers.length > 0 &&
    normalizedInput.lockers.some((locker) => !hasAmount(locker.price));
  const lockers = shouldBuildLockerPrices
    ? buildLockerPriceBreakdown({
        branch: normalizedInput.branch,
        lockers: normalizedInput.lockers,
        hours: normalizedInput.tariffHours || 1,
        isCustom: normalizedInput.tariffMode === "custom",
        currency: normalizedInput.currency || "UZS",
        discount: normalizedInput.discount || 0,
        exchangeRates: settings.exchangeRates,
      })
    : normalizedInput.lockers;
  const newOrder = normalizeOrder({
    ...normalizedInput,
    lockers,
    id: `BR-${String(orders.length + 1).padStart(6, "0")}`,
    status: "Aktiv",
    createdAt: new Date().toISOString(),
    realPickupTime: null,
    reprintCount: 0,
    debtAmount: normalizedInput.payment === "Qarz" ? normalizedInput.realPaidAmount : 0,
  });

  saveOrders([newOrder, ...orders]);

  if (newOrder.payment !== "Qarz") {
    addCashMovement({
      type: "IN",
      source: "order payment",
      orderId: newOrder.id,
      branch: newOrder.branch,
      admin: newOrder.admin || newOrder.adminName,
      amount: newOrder.realPaidAmount,
      currency: newOrder.currency,
      payment: newOrder.payment,
    });
  }

  addActivityLog({
    action: "ORDER_CREATED",
    description: `${newOrder.orderNumber || newOrder.id} - ${newOrder.client} order yaratildi`,
    branch: newOrder.branch,
    user: newOrder.admin || newOrder.adminName,
    entityId: newOrder.id,
    newValue: newOrder,
  });
  return newOrder;
}

export function updateOrder(orderId, updates) {
  const orders = getOrders();
  const existingOrder = orders.find((order) => order.id === orderId);

  const updated = orders.map((order) =>
    order.id === orderId ? normalizeOrder({ ...order, ...updates }) : order,
  );

  saveOrders(updated);
  addActivityLog({
    action: "ORDER_UPDATED",
    description: `${orderId} order yangilandi`,
    branch: updates.branch || existingOrder?.branch,
    user: updates.admin || updates.adminName,
    entityId: orderId,
    oldValue: existingOrder,
    newValue: updated.find((order) => order.id === orderId),
  });
  return updated;
}

export function closeDebt(orderId, { amount, admin, note } = {}) {
  const order = getOrders().find((item) => item.id === orderId);

  if (!order) return getOrders();

  const paidAmount = Number(amount || order.debtAmount || order.realPaidAmount || 0);
  const updated = updateOrder(orderId, {
    debtAmount: 0,
    debtClosedAt: new Date().toISOString(),
    debtClosedBy: admin || "Admin",
    realPaidAmount: paidAmount,
    finalPrice: paidAmount,
  });

  addCashMovement({
    type: "IN",
    source: "qarz yopildi",
    orderId,
    branch: order.branch,
    admin,
    amount: paidAmount,
    currency: order.currency,
    payment: "Qarz",
    note,
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
    currency: expense?.currency || "UZS",
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
    currency: expense.currency || "UZS",
    createdAt: new Date().toISOString(),
  };

  saveExpenses([newExpense, ...expenses]);
  addCashMovement({
    type: "OUT",
    source: "expense",
    branch: newExpense.branch,
    admin: newExpense.admin,
    amount: newExpense.amount,
    currency: newExpense.currency,
    note: newExpense.category,
  });
  addActivityLog({
    action: "EXPENSE_CREATED",
    description: `${newExpense.branch} - ${newExpense.category}: ${Number(
      newExpense.amount || 0,
    ).toLocaleString("uz-UZ")} ${newExpense.currency} harajat qo'shildi`,
    branch: newExpense.branch,
    entityId: newExpense.id,
    newValue: newExpense,
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
      ).toLocaleString("uz-UZ")} ${deletedExpense.currency || "UZS"} harajat o'chirildi`,
      branch: deletedExpense.branch,
      entityId: deletedExpense.id,
      oldValue: deletedExpense,
    });
  }

  return updated;
}

export function getInkassa(branchName = null) {
  return filterByBranch(readArray(INKASSA_KEY), branchName);
}

export function createInkassa(data) {
  const items = getInkassa();
  const newItem = {
    id: `INK-${Date.now()}`,
    branch: data.branch,
    admin: data.admin || "Admin",
    recipient: data.recipient || "",
    amount: Number(data.amount || 0),
    currency: data.currency || "UZS",
    note: data.note || "",
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(INKASSA_KEY, JSON.stringify([newItem, ...items]));
  addCashMovement({
    type: "OUT",
    source: "inkassa",
    branch: newItem.branch,
    admin: newItem.admin,
    amount: newItem.amount,
    currency: newItem.currency,
    note: newItem.recipient,
  });
  addActivityLog({
    action: "INKASSA_CREATED",
    description: `${newItem.branch} inkassa: ${newItem.amount.toLocaleString("uz-UZ")} ${newItem.currency}`,
    branch: newItem.branch,
    user: newItem.admin,
    entityId: newItem.id,
    newValue: newItem,
  });

  return newItem;
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

export function openShift({ branch, admin, shiftTime, openingCash, receivedFrom, acceptedAmount }) {
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
    receivedFrom: receivedFrom || "",
    acceptedAmount: Number(acceptedAmount || openingCash || 0),
    closingCash: 0,
    openedAt: new Date().toISOString(),
    closedAt: null,
    status: "OPEN",
    totalRevenue: 0,
    totalExpense: 0,
    totalDebt: 0,
    totalInkassa: 0,
    netProfit: 0,
  };

  saveShifts([newShift, ...shifts]);
  addActivityLog({
    action: "SHIFT_OPENED",
    description: `${newShift.branch} kassasi ochildi`,
    branch: newShift.branch,
    user: newShift.admin,
    entityId: newShift.id,
    newValue: newShift,
  });

  return newShift;
}

const isInsideShift = (item, shift) => {
  const openedTime = new Date(shift.openedAt).getTime();
  const closedTime = shift.closedAt ? new Date(shift.closedAt).getTime() : Date.now();
  const itemTime = new Date(item.createdAt || item.closedAt || item.openedAt).getTime();

  return Number.isFinite(itemTime) && itemTime >= openedTime && itemTime <= closedTime;
};

const sumOrdersByCurrency = (orders, predicate, amountGetter) =>
  CURRENCIES.reduce((result, currency) => {
    result[currency] = orders
      .filter((order) => order.currency === currency && predicate(order))
      .reduce((sum, order) => sum + Number(amountGetter(order) || 0), 0);
    return result;
  }, {});

export function closeShift(branchName, { closingCash, handoverTo, rasxod, inkassa, acceptedAmount } = {}) {
  const shifts = getShifts();
  const current = getCurrentShift(branchName);

  if (!current) {
    throw new Error("Ochiq kassa topilmadi");
  }

  const closingTime = new Date().toISOString();
  const tempShift = { ...current, closedAt: closingTime };
  const orders = getOrders(branchName).filter((order) => isInsideShift(order, tempShift));
  const expenses = getExpenses(branchName).filter((expense) => isInsideShift(expense, tempShift));
  const inkassas = getInkassa(branchName).filter((item) => isInsideShift(item, tempShift));
  const movements = getCashMovements(branchName).filter((item) => isInsideShift(item, tempShift));
  const paidOrders = orders.filter((order) => order.payment !== "Qarz");
  const debts = orders.filter((order) => order.payment === "Qarz" && !order.debtClosedAt);

  const totalRevenue = paidOrders.reduce((sum, order) => sum + Number(order.realPaidAmount || 0), 0);
  const totalDebt = debts.reduce((sum, order) => sum + Number(order.debtAmount || 0), 0);
  const totalExpense = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const totalInkassa = inkassas.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const movementIn = movements
    .filter((item) => item.type === "IN")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const movementOut = movements
    .filter((item) => item.type === "OUT")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const cashLeft =
    Number(current.acceptedAmount || current.openingCash || 0) + movementIn - movementOut;

  const updated = shifts.map((shift) =>
    shift.id === current.id
      ? {
          ...shift,
          handoverTo: handoverTo || "",
          acceptedAmount: Number(acceptedAmount ?? shift.acceptedAmount ?? shift.openingCash ?? 0),
          closingCash: Number(closingCash || cashLeft || 0),
          rasxod: Number(rasxod ?? totalExpense),
          inkassa: Number(inkassa ?? totalInkassa),
          cashLeft,
          closedAt: closingTime,
          status: "CLOSED",
          totalRevenue,
          totalExpense,
          totalDebt,
          totalInkassa,
          netProfit: totalRevenue - totalExpense,
          report: {
            from: shift.admin,
            to: handoverTo || "",
            cash: orders
              .filter((order) => order.payment === "Naqd")
              .reduce((sum, order) => sum + Number(order.realPaidAmount || 0), 0),
            cashByCurrency: sumOrdersByCurrency(
              orders,
              (order) => order.payment === "Naqd",
              (order) => order.realPaidAmount,
            ),
            terminal: orders
              .filter((order) => ["Karta", "Click/Payme", "O'tkazma"].includes(order.payment))
              .reduce((sum, order) => sum + Number(order.realPaidAmount || 0), 0),
            terminalByCurrency: sumOrdersByCurrency(
              orders,
              (order) => ["Karta", "Click/Payme", "O'tkazma"].includes(order.payment),
              (order) => order.realPaidAmount,
            ),
            debt: totalDebt,
            debtByCurrency: sumOrdersByCurrency(
              orders,
              (order) => order.payment === "Qarz" && !order.debtClosedAt,
              (order) => order.debtAmount,
            ),
            accepted: Number(shift.acceptedAmount || shift.openingCash || 0),
            expense: totalExpense,
            inkassa: totalInkassa,
            cashLeft,
          },
        }
      : shift,
  );

  const closedShift = updated.find((shift) => shift.id === current.id);
  saveShifts(updated);
  addActivityLog({
    action: "SHIFT_CLOSED",
    description: `${closedShift.branch} kassasi yopildi. Revenue: ${Number(
      closedShift.totalRevenue || 0,
    ).toLocaleString("uz-UZ")} UZS`,
    branch: closedShift.branch,
    user: closedShift.admin,
    entityId: closedShift.id,
    newValue: closedShift,
  });

  return updated;
}

export function getLockers(branchName = null) {
  const settings = getSettings();
  const orders = syncOvertimeOrders(branchName);
  const branches = branchName ? [branchName] : getBranchNames();

  return branches.flatMap((branch) => {
    const branchOrders = orders.filter((order) => order.branch === branch);

    return (settings.lockers?.[branch] || []).map((locker) => {
      const order = branchOrders.find(
        (item) =>
          (item.status === "Aktiv" || item.status === "Kechikdi") &&
          item.lockers?.some((orderLocker) => Number(orderLocker.number) === Number(locker.number)),
      );

      if (locker.status === LOCKER_STATUSES.SERVICE) {
        return { ...locker, activeOrderId: null, activeOrder: null };
      }

      return {
        ...locker,
        status: order
          ? order.status === "Kechikdi"
            ? LOCKER_STATUSES.DELAYED
            : LOCKER_STATUSES.BUSY
          : LOCKER_STATUSES.FREE,
        activeOrderId: order?.id || null,
        activeOrder: order || null,
      };
    });
  });
}

export function updateLocker(branch, number, updates) {
  const settings = getSettings();
  const lockers = normalizeLockers(settings.lockers);
  const oldLocker = lockers[branch]?.find((locker) => Number(locker.number) === Number(number));

  lockers[branch] = (lockers[branch] || []).map((locker) =>
    Number(locker.number) === Number(number)
      ? { ...locker, ...updates, updatedAt: new Date().toISOString() }
      : locker,
  );

  saveSettings({ ...settings, lockers });
  addActivityLog({
    action: updates.status === LOCKER_STATUSES.SERVICE ? "LOCKER_BLOCKED" : "LOCKER_UPDATED",
    description: `${branch} #${number} yacheyka yangilandi`,
    branch,
    user: updates.admin,
    entityId: `${branch}-${number}`,
    oldValue: oldLocker,
    newValue: lockers[branch]?.find((locker) => Number(locker.number) === Number(number)),
  });

  return getLockers(branch);
}

export function transferLocker(orderId, { fromNumber, toNumber, reason, admin }) {
  const orders = getOrders();
  const order = orders.find((item) => item.id === orderId);

  if (!order) return orders;

  const fromLocker = order.lockers.find((locker) => Number(locker.number) === Number(fromNumber));
  const toLocker = getLockers(order.branch).find(
    (locker) => Number(locker.number) === Number(toNumber) && locker.status === LOCKER_STATUSES.FREE,
  );

  if (!fromLocker || !toLocker) {
    throw new Error("Transfer uchun yacheyka topilmadi");
  }

  const updatedLockers = order.lockers.map((locker) =>
    Number(locker.number) === Number(fromNumber)
      ? { ...locker, number: Number(toNumber), size: toLocker.size }
      : locker,
  );

  const updated = updateOrder(orderId, {
    lockers: updatedLockers,
    transferHistory: [
      ...(order.transferHistory || []),
      {
        from: { number: Number(fromNumber), size: fromLocker.size },
        to: { number: Number(toNumber), size: toLocker.size },
        reason,
        admin,
        createdAt: new Date().toISOString(),
      },
    ],
  });

  addActivityLog({
    action: "LOCKER_TRANSFER",
    description: `${orderId}: #${fromNumber} -> #${toNumber} transfer`,
    branch: order.branch,
    user: admin,
    entityId: orderId,
    oldValue: { number: fromNumber, size: fromLocker.size },
    newValue: { number: toNumber, size: toLocker.size, reason },
  });

  return updated;
}

export function getDashboardStats(branchName = null) {
  syncOvertimeOrders(branchName);
  const orders = getOrders(branchName);
  const expenses = getExpenses(branchName);
  const shifts = getShifts(branchName);
  const lockers = getLockers(branchName);
  const inkassas = getInkassa(branchName);
  const cashMovements = getCashMovements(branchName);
  const today = new Date().toISOString().slice(0, 10);

  const todayOrders = orders.filter((order) => order.createdAt?.startsWith(today));
  const todayExpenses = expenses.filter((expense) => expense.createdAt?.startsWith(today));
  const todayInkassa = inkassas.filter((item) => item.createdAt?.startsWith(today));
  const todayMovements = cashMovements.filter((item) => item.createdAt?.startsWith(today));

  const getPaidAmount = (order) =>
    order.payment === "Qarz" && !order.debtClosedAt ? 0 : Number(order.realPaidAmount || 0);
  const revenue = todayOrders.reduce((sum, order) => sum + getPaidAmount(order), 0);
  const debt = todayOrders.reduce((sum, order) => sum + Number(order.debtAmount || 0), 0);
  const expenseTotal = todayExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const inkassaTotal = todayInkassa.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const active = orders.filter((order) => order.status === "Aktiv").length;
  const delayed = orders.filter((order) => order.status === "Kechikdi").length;
  const pickedUp = orders.filter((order) => order.status === "Olib ketildi").length;
  const cancelled = orders.filter((order) => order.status === "Bekor qilindi").length;
  const paymentTotal = (paymentType) =>
    todayOrders
      .filter((order) => order.payment === paymentType)
      .reduce((sum, order) => sum + getPaidAmount(order), 0);
  const normalizePayment = (payment) =>
    String(payment || "")
      .replace(/[^\u0020-\u007E]/g, "")
      .toLowerCase();
  const transferTotal = todayOrders
    .filter((order) => ["o'tkazma", "otkazma"].includes(normalizePayment(order.payment)))
    .reduce((sum, order) => sum + getPaidAmount(order), 0);

  const currencyTotals = CURRENCIES.reduce((result, currency) => {
    result[currency] = todayOrders
      .filter((order) => order.currency === currency)
      .reduce((sum, order) => sum + getPaidAmount(order), 0);
    return result;
  }, {});

  return {
    revenue,
    expenseTotal,
    netProfit: revenue - expenseTotal,
    ordersCount: todayOrders.length,
    active,
    delayed,
    pickedUp,
    cancelled,
    cash: paymentTotal("Naqd"),
    card: paymentTotal("Karta"),
    clickPayme: paymentTotal("Click/Payme"),
    transfer: transferTotal,
    debt,
    inkassa: inkassaTotal,
    activeLockers: lockers.filter((locker) => locker.status === LOCKER_STATUSES.BUSY).length,
    freeLockers: lockers.filter((locker) => locker.status === LOCKER_STATUSES.FREE).length,
    delayedLockers: lockers.filter((locker) => locker.status === LOCKER_STATUSES.DELAYED).length,
    serviceLockers: lockers.filter((locker) => locker.status === LOCKER_STATUSES.SERVICE).length,
    cashMovementIn: todayMovements.filter((item) => item.type === "IN").reduce((sum, item) => sum + Number(item.amount || 0), 0),
    cashMovementOut: todayMovements.filter((item) => item.type === "OUT").reduce((sum, item) => sum + Number(item.amount || 0), 0),
    currencyTotals,
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
        message: `${order.orderNumber || order.id} - ${order.client} pickup ${diffMinutes} daqiqadan keyin`,
      });
    }

    if (diffMinutes <= 0) {
      notifications.push({
        id: `late-${order.id}`,
        type: "danger",
        title: "Baggage kechikdi",
        message: `${order.orderNumber || order.id} - ${order.client} tarif vaqtidan o'tgan`,
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
      message: "Hozircha muhim ogohlantirish yo'q",
    });
  }

  return notifications;
}

export function calculateOvertime(order) {
  if (!order.checkOut) {
    return { status: order.status, overtimeAmount: 0, overtimeHours: 0 };
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
    return { status: "Aktiv", overtimeAmount: 0, overtimeHours: 0 };
  }

  const diffMs = now - checkoutTime;
  const overtimeHours = Math.max(1, Math.ceil(diffMs / 1000 / 60 / 60));
  const overtimeAmountUZS = calculateTariffAmount({
    branch: order.branch,
    lockers: order.lockers?.length ? order.lockers : [{ size: order.size || "M" }],
    hours: overtimeHours,
    isCustom: true,
  });
  const settings = getSettings();
  const overtimeAmount = convertFromUZS(
    overtimeAmountUZS,
    order.currency || "UZS",
    settings.exchangeRates,
  );

  return { status: "Kechikdi", overtimeAmount, overtimeAmountUZS, overtimeHours };
}

export function syncOvertimeOrders(branchName = null) {
  const orders = getOrders();
  let changed = false;

  const updated = orders.map((order) => {
    const overtime = calculateOvertime(order);

    if (overtime.status !== order.status || overtime.overtimeAmount !== order.overtimeAmount) {
      changed = true;
    }

    return { ...order, ...overtime };
  });

  if (changed) {
    saveOrders(updated);
  }

  return filterByBranch(updated, branchName);
}

export function getCustomerHistory({ phone, passport, branchName = null } = {}) {
  const cleanPhone = String(phone || "").replace(/\D/g, "");
  const cleanPassport = String(passport || "").trim().toLowerCase();
  const orders = getOrders(branchName).filter((order) => {
    const orderPhone = String(order.phone || "").replace(/\D/g, "");
    const orderPassport = String(order.passport || "").trim().toLowerCase();

    return (
      (cleanPhone && orderPhone && orderPhone.includes(cleanPhone.slice(-7))) ||
      (cleanPassport && orderPassport === cleanPassport)
    );
  });

  return {
    orders,
    visits: orders.length,
    activeOrders: orders.filter((order) => order.status === "Aktiv" || order.status === "Kechikdi"),
    lastVisit: orders[0]?.createdAt || null,
  };
}

export function getActivityLogs(branchName = null) {
  return filterByBranch(readArray(ACTIVITY_KEY), branchName);
}

export function addActivityLog(log) {
  const logs = getActivityLogs();
  const newLog = {
    id: `LOG-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    action: log.action,
    description: log.description,
    branch: log.branch || "-",
    user: log.user || "Admin",
    entityId: log.entityId || "-",
    oldValue: log.oldValue || null,
    newValue: log.newValue || null,
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(ACTIVITY_KEY, JSON.stringify([newLog, ...logs]));
  return newLog;
}
