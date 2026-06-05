import settingsService from "./settingsService";
import { formatMoneyByCurrency } from "../utils/currency";

const formatPrice = (value) => Number(value || 0).toLocaleString("uz-UZ");

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("uz-UZ");
};

const formatCurrencyMap = (items = {}) =>
  Object.entries(items)
    .filter(([, amount]) => Number(amount || 0) > 0)
    .map(([currency, amount]) => formatMoneyByCurrency(amount, currency))
    .join(" / ") || formatMoneyByCurrency(0, "UZS");

const hasLockerPrice = (locker) =>
  locker?.price !== undefined &&
  locker?.price !== null &&
  locker?.price !== "" &&
  Number.isFinite(Number(locker.price));

const formatLockerPriceLines = (order) => {
  const lockers = Array.isArray(order.lockers) ? order.lockers : [];

  if (!lockers.length) {
    return [`<b>Yacheykalar:</b> ${escapeHtml(order.size || "-")}`];
  }

  return [
    "<b>Yacheykalar:</b>",
    ...lockers.map((locker) => {
      const price = hasLockerPrice(locker)
        ? formatMoneyByCurrency(locker.price, locker.currency || order.currency)
        : "Narx topilmadi";
      const hours = Number(locker.tariffHours || order.tariffHours || 0);
      const tariff = hours > 0 ? ` / ${hours} soat` : "";

      return `#${escapeHtml(locker.number || "-")} / ${escapeHtml(locker.size || "-")}${tariff} - ${escapeHtml(price)}`;
    }),
  ];
};

const telegramService = {
  async sendMessage(text, options = {}) {
    const settings = settingsService.get();
    const telegram = settings.telegram || {};
    const branchGroup = options.branch ? telegram.groups?.[options.branch] : null;
    const botToken = (branchGroup?.token || telegram.botToken || "").trim();
    const groupId = (branchGroup?.groupId || telegram.groupId || "").trim();
    const groupEnabled = branchGroup?.enabled ?? telegram.enabled;

    if (telegram.enabled === false || groupEnabled === false) {
      return {
        ok: false,
        skipped: true,
        reason: "Telegram integration o'chirilgan",
      };
    }

    if (!botToken || !groupId) {
      return {
        ok: false,
        skipped: true,
        reason: "Bot token yoki Group ID kiritilmagan",
      };
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: groupId,
          text,
          parse_mode: "HTML",
        }),
      },
    );

    const data = await response.json().catch(() => ({
      ok: false,
      description: "Telegram javobi o'qilmadi",
    }));

    if (!response.ok || !data.ok) {
      throw new Error(data.description || "Telegram xabar yuborilmadi");
    }

    return data;
  },

  async sendNewOrder(order) {
    const settings = settingsService.get();

    if (settings.telegram?.newOrder === false) {
      return {
        ok: false,
        skipped: true,
        reason: "Yangi order xabari o'chirilgan",
      };
    }

    const text = [
      "<b>Yangi baggage qabul qilindi</b>",
      "",
      `<b>Filial:</b> ${escapeHtml(order.branch || "-")}`,
      `<b>Klient:</b> ${escapeHtml(order.client || "-")}`,
      `<b>Telefon:</b> ${escapeHtml(order.phone || "-")}`,
      `<b>Passport:</b> ${escapeHtml(order.passport || "-")}`,
      "",
      ...formatLockerPriceLines(order),
      `<b>Soni:</b> ${escapeHtml(order.count || 0)} ta`,
      `<b>Check-in:</b> ${escapeHtml(formatDateTime(order.checkIn))}`,
      `<b>Check-out:</b> ${escapeHtml(formatDateTime(order.checkOut))}`,
      "",
      `<b>To'lov:</b> ${escapeHtml(order.payment || "-")}`,
      `<b>Summa:</b> ${formatMoneyByCurrency(order.realPaidAmount || order.finalPrice, order.currency)}`,
      "",
      `<b>Order:</b> ${escapeHtml(order.id)}`,
      `<b>Sana:</b> ${new Date().toLocaleString("uz-UZ")}`,
    ].join("\n");

    return this.sendMessage(text, { branch: order.branch });
  },

  async sendShiftClosed(shift) {
    const settings = settingsService.get();

    if (settings.telegram?.shiftClosed === false) {
      return {
        ok: false,
        skipped: true,
        reason: "Shift yopilganda report o'chirilgan",
      };
    }

    const text = [
      "<b>Smenani topshirdi:</b>",
      `${escapeHtml(shift.admin || "-")} -> ${escapeHtml(shift.handoverTo || "-")}`,
      "",
      "<b>Bugungi:</b>",
      `<b>Umumiy savdo:</b> ${formatPrice(shift.totalRevenue)} UZS`,
      `<b>Cash:</b> ${escapeHtml(formatCurrencyMap(shift.report?.cashByCurrency))}`,
      `<b>Terminal:</b> ${escapeHtml(formatCurrencyMap(shift.report?.terminalByCurrency))}`,
      `<b>Qarz:</b> ${escapeHtml(formatCurrencyMap(shift.report?.debtByCurrency))}`,
      "",
      `<b>Oldingi smenadan qabul:</b> ${formatPrice(shift.acceptedAmount)} UZS`,
      `<b>Rasxod:</b> ${formatPrice(shift.totalExpense)} UZS`,
      `<b>Inkassa:</b> ${formatPrice(shift.totalInkassa)} UZS`,
      `<b>Kassada qolgan:</b> ${formatPrice(shift.cashLeft || shift.closingCash)} UZS`,
      "",
      `<b>Filial:</b> ${escapeHtml(shift.branch || "-")}`,
      `<b>Yopildi:</b> ${escapeHtml(formatDateTime(shift.closedAt))}`,
    ].join("\n");

    return this.sendMessage(text, { branch: shift.branch });
  },

  async sendShiftOpened(shift) {
    const settings = settingsService.get();

    if (settings.telegram?.shiftOpened === false) {
      return {
        ok: false,
        skipped: true,
        reason: "Kassa ochilganda xabar o'chirilgan",
      };
    }

    const text = [
      "<b>Kassa ochildi</b>",
      "",
      `<b>Filial:</b> ${escapeHtml(shift.branch || "-")}`,
      `<b>Admin:</b> ${escapeHtml(shift.admin || "-")}`,
      `<b>Shift:</b> ${escapeHtml(shift.shiftTime || "-")}`,
      "",
      `<b>Ochildi:</b> ${escapeHtml(formatDateTime(shift.openedAt))}`,
      `<b>Opening cash:</b> ${formatPrice(shift.openingCash)} so'm`,
      "",
      `<b>Shift ID:</b> ${escapeHtml(shift.id || "-")}`,
      `<b>Sana:</b> ${new Date().toLocaleString("uz-UZ")}`,
    ].join("\n");

    return this.sendMessage(text, { branch: shift.branch });
  },

  async sendOrderCancelled(order) {
    const settings = settingsService.get();

    if (settings.telegram?.orderCancelled === false) {
      return {
        ok: false,
        skipped: true,
        reason: "Order bekor qilinganda xabar o'chirilgan",
      };
    }

    const text = [
      "<b>Order bekor qilindi</b>",
      "",
      `<b>Filial:</b> ${escapeHtml(order.branch || "-")}`,
      `<b>Order:</b> ${escapeHtml(order.id || "-")}`,
      `<b>Klient:</b> ${escapeHtml(order.client || "-")}`,
      `<b>Telefon:</b> ${escapeHtml(order.phone || "-")}`,
      "",
      `<b>Size:</b> ${escapeHtml(order.size || "-")}`,
      `<b>Soni:</b> ${escapeHtml(order.count || 0)} ta`,
      `<b>To'lov:</b> ${escapeHtml(order.payment || "-")}`,
      `<b>Summa:</b> ${formatMoneyByCurrency(order.realPaidAmount || order.finalPrice, order.currency)}`,
      "",
      `<b>Sabab:</b> ${escapeHtml(order.cancelReason || "-")}`,
      `<b>Bekor qilingan vaqt:</b> ${escapeHtml(formatDateTime(order.cancelledAt))}`,
    ].join("\n");

    return this.sendMessage(text, { branch: order.branch });
  },

  async sendDelayedBaggage(order) {
    const settings = settingsService.get();

    if (!settings.telegram?.delayedBaggage) {
      return { ok: false, skipped: true };
    }

    const text = [
      "<b>Baggage kechikdi</b>",
      "",
      `<b>Filial:</b> ${escapeHtml(order.branch || "-")}`,
      `<b>Order:</b> ${escapeHtml(order.id || "-")}`,
      `<b>Klient:</b> ${escapeHtml(order.client || "-")}`,
      `<b>Telefon:</b> ${escapeHtml(order.phone || "-")}`,
      "",
      `<b>Size:</b> ${escapeHtml(order.size || "-")}`,
      `<b>Soni:</b> ${escapeHtml(order.count || 0)} ta`,
      `<b>Check-out:</b> ${escapeHtml(formatDateTime(order.checkOut))}`,
      "",
      `<b>Overtime:</b> ${escapeHtml(order.overtimeHours || 0)} soat`,
      `<b>Qo'shimcha summa:</b> ${formatMoneyByCurrency(order.overtimeAmount, order.currency)}`,
    ].join("\n");

    return this.sendMessage(text, { branch: order.branch });
  },

  async sendOvertimePayment(order) {
    const settings = settingsService.get();

    if (settings.telegram?.overtimePayment === false) {
      return { ok: false, skipped: true, reason: "Overtime xabari o'chirilgan" };
    }

    const text = [
      "<b>Overtime payment</b>",
      "",
      `<b>Filial:</b> ${escapeHtml(order.branch || "-")}`,
      `<b>Order:</b> ${escapeHtml(order.id || "-")}`,
      `<b>Klient:</b> ${escapeHtml(order.client || "-")}`,
      `<b>Overtime:</b> ${escapeHtml(order.overtimeHours || 0)} soat`,
      `<b>Qo'shimcha:</b> ${formatMoneyByCurrency(order.overtimeAmount, order.currency)}`,
      `<b>Real to'lov:</b> ${formatMoneyByCurrency(order.realPaidAmount, order.currency)}`,
    ].join("\n");

    return this.sendMessage(text, { branch: order.branch });
  },

  async sendDebtClosed(order) {
    const settings = settingsService.get();

    if (settings.telegram?.debtClosed === false) {
      return { ok: false, skipped: true, reason: "Qarz yopildi xabari o'chirilgan" };
    }

    const text = [
      "<b>Qarz yopildi</b>",
      "",
      `<b>Filial:</b> ${escapeHtml(order.branch || "-")}`,
      `<b>Order:</b> ${escapeHtml(order.id || "-")}`,
      `<b>Klient:</b> ${escapeHtml(order.client || "-")}`,
      `<b>Summa:</b> ${formatMoneyByCurrency(order.realPaidAmount, order.currency)}`,
      `<b>Kim yopdi:</b> ${escapeHtml(order.debtClosedBy || "-")}`,
    ].join("\n");

    return this.sendMessage(text, { branch: order.branch });
  },

  async sendInkassa(item) {
    const settings = settingsService.get();

    if (settings.telegram?.inkassa === false) {
      return { ok: false, skipped: true, reason: "Inkassa xabari o'chirilgan" };
    }

    const text = [
      "<b>Inkassa</b>",
      "",
      `<b>Filial:</b> ${escapeHtml(item.branch || "-")}`,
      `<b>Kimga:</b> ${escapeHtml(item.recipient || "-")}`,
      `<b>Summa:</b> ${formatMoneyByCurrency(item.amount, item.currency)}`,
      `<b>Admin:</b> ${escapeHtml(item.admin || "-")}`,
    ].join("\n");

    return this.sendMessage(text, { branch: item.branch });
  },

  async sendLockerTransfer(order, transfer) {
    const settings = settingsService.get();

    if (settings.telegram?.lockerTransfer === false) {
      return { ok: false, skipped: true, reason: "Yacheyka transfer xabari o'chirilgan" };
    }

    const text = [
      "<b>Yacheyka transfer</b>",
      "",
      `<b>Filial:</b> ${escapeHtml(order.branch || "-")}`,
      `<b>Order:</b> ${escapeHtml(order.id || "-")}`,
      `<b>Old:</b> #${escapeHtml(transfer.from?.number || "-")} ${escapeHtml(transfer.from?.size || "")}`,
      `<b>New:</b> #${escapeHtml(transfer.to?.number || "-")} ${escapeHtml(transfer.to?.size || "")}`,
      `<b>Sabab:</b> ${escapeHtml(transfer.reason || "-")}`,
      `<b>Admin:</b> ${escapeHtml(transfer.admin || "-")}`,
    ].join("\n");

    return this.sendMessage(text, { branch: order.branch });
  },

  async sendLockerBlock(locker, reason) {
    const settings = settingsService.get();

    if (settings.telegram?.lockerBlock === false) {
      return { ok: false, skipped: true, reason: "Yacheyka block xabari o'chirilgan" };
    }

    const text = [
      "<b>Yacheyka servisga olindi</b>",
      "",
      `<b>Filial:</b> ${escapeHtml(locker.branch || "-")}`,
      `<b>Yacheyka:</b> #${escapeHtml(locker.number || "-")} ${escapeHtml(locker.size || "")}`,
      `<b>Sabab:</b> ${escapeHtml(reason || "-")}`,
    ].join("\n");

    return this.sendMessage(text, { branch: locker.branch });
  },
};

export default telegramService;
