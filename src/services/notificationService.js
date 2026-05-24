import {
  getNotifications,
  getActivityLogs,
  syncOvertimeOrders,
  getCurrentShift,
} from "../utils/storage";
import { translate } from "../i18n/translations";
import settingsService from "./settingsService";
import telegramService from "./telegramService";

const DELAYED_ALERTS_KEY = "br_delayed_tg_sent";

const getSentDelayedAlerts = () => {
  try {
    const data = localStorage.getItem(DELAYED_ALERTS_KEY);
    const parsed = data ? JSON.parse(data) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveSentDelayedAlerts = (items) => {
  localStorage.setItem(DELAYED_ALERTS_KEY, JSON.stringify(items));
};

const t = (key, params) => {
  try {
    return translate(key, settingsService.get()?.language, params);
  } catch {
    return translate(key, undefined, params);
  }
};

const notificationService = {
  getAlerts(branchName = null) {
    return getNotifications(branchName);
  },

  getActivityLogs(branchName = null) {
    return getActivityLogs(branchName);
  },

  getSmartAlerts(branchName = null) {
    const orders = syncOvertimeOrders(branchName);
    const currentShift = getCurrentShift(branchName);

    const lateOrders = orders.filter((order) => order.status === "Kechikdi");
    const activeOrders = orders.filter((order) => order.status === "Aktiv");

    const soonCheckoutOrders = activeOrders.filter((order) => {
      if (!order.checkOut) return false;

      const checkoutTime = new Date(order.checkOut).getTime();
      const diffMinutes = (checkoutTime - Date.now()) / 1000 / 60;

      return diffMinutes > 0 && diffMinutes <= 60;
    });

    const alerts = [];

    if (!currentShift) {
      alerts.push({
        id: "shift-closed",
        type: "warning",
        title: t("Kassa yopiq"),
        message: t("Yangi order qo'shishdan oldin kassani oching."),
      });
    }

    if (lateOrders.length > 0) {
      alerts.push({
        id: "late-orders",
        type: "danger",
        title: t("Kechikkan baggage"),
        message: t("{{count}} ta baggage check-out vaqtidan o'tgan.", {
          count: lateOrders.length,
        }),
      });
    }

    if (soonCheckoutOrders.length > 0) {
      alerts.push({
        id: "soon-checkout",
        type: "info",
        title: t("Pickup vaqti yaqin"),
        message: t("{{count}} ta baggage 1 soat ichida pickup bo'lishi kerak.", {
          count: soonCheckoutOrders.length,
        }),
      });
    }

    if (activeOrders.length > 20) {
      alerts.push({
        id: "high-load",
        type: "warning",
        title: t("Yuqori yuklama"),
        message: t("Hozir {{count}} ta aktiv baggage bor.", {
          count: activeOrders.length,
        }),
      });
    }

    return alerts;
  },

  async checkDelayedTelegramAlerts(branchName = null) {
    const orders = syncOvertimeOrders(branchName);
    const lateOrders = orders.filter((order) => order.status === "Kechikdi");
    const sentIds = getSentDelayedAlerts();

    for (const order of lateOrders) {
      if (sentIds.includes(order.id)) continue;

      try {
        await telegramService.sendDelayedBaggage(order);
        sentIds.push(order.id);
      } catch {
        // Alert remains visible in the UI; Telegram can be retried later.
      }
    }

    saveSentDelayedAlerts(sentIds);
  },

  getPageData(branchName = null) {
    return {
      alerts: this.getSmartAlerts(branchName),
      systemNotifications: getNotifications(branchName),
      activityLogs: getActivityLogs(branchName),
    };
  },
};

export default notificationService;
