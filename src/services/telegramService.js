import settingsService from "./settingsService";

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

const telegramService = {
  async sendMessage(text) {
    const settings = settingsService.get();
    const telegram = settings.telegram || {};
    const botToken = telegram.botToken?.trim();
    const groupId = telegram.groupId?.trim();

    if (telegram.enabled === false) {
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
      "📦 <b>Yangi baggage qabul qilindi</b>",
      "",
      `🏢 <b>Filial:</b> ${escapeHtml(order.branch || "-")}`,
      `👤 <b>Klient:</b> ${escapeHtml(order.client || "-")}`,
      `📞 <b>Telefon:</b> ${escapeHtml(order.phone || "-")}`,
      `🪪 <b>Passport:</b> ${escapeHtml(order.passport || "-")}`,
      "",
      `🧳 <b>Size:</b> ${escapeHtml(order.size || "-")}`,
      `🔢 <b>Soni:</b> ${escapeHtml(order.count || 0)} ta`,
      `🕒 <b>Check-in:</b> ${escapeHtml(formatDateTime(order.checkIn))}`,
      `🕘 <b>Check-out:</b> ${escapeHtml(formatDateTime(order.checkOut))}`,
      "",
      `💳 <b>To'lov:</b> ${escapeHtml(order.payment || "-")}`,
      `💰 <b>Summa:</b> ${formatPrice(order.finalPrice)} so'm`,
      "",
      `🆔 <b>Order:</b> ${escapeHtml(order.id)}`,
      `📅 <b>Sana:</b> ${new Date().toLocaleString("uz-UZ")}`,
    ].join("\n");

    return this.sendMessage(text);
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
      "📊 <b>Kassa yopildi</b>",
      "",
      `🏢 <b>Filial:</b> ${escapeHtml(shift.branch || "-")}`,
      `👤 <b>Admin:</b> ${escapeHtml(shift.admin || "-")}`,
      `🕘 <b>Shift:</b> ${escapeHtml(shift.shiftTime || "-")}`,
      "",
      `🕒 <b>Ochildi:</b> ${escapeHtml(formatDateTime(shift.openedAt))}`,
      `🔒 <b>Yopildi:</b> ${escapeHtml(formatDateTime(shift.closedAt))}`,
      "",
      `💰 <b>Umumiy savdo:</b> ${formatPrice(shift.totalRevenue)} so'm`,
      `📉 <b>Harajat:</b> ${formatPrice(shift.totalExpense)} so'm`,
      `✅ <b>Sof foyda:</b> ${formatPrice(shift.netProfit)} so'm`,
      "",
      `💵 <b>Opening cash:</b> ${formatPrice(shift.openingCash)} so'm`,
      `🏁 <b>Closing cash:</b> ${formatPrice(shift.closingCash)} so'm`,
    ].join("\n");

    return this.sendMessage(text);
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
      "🟢 <b>Kassa ochildi</b>",
      "",
      `🏢 <b>Filial:</b> ${escapeHtml(shift.branch || "-")}`,
      `👤 <b>Admin:</b> ${escapeHtml(shift.admin || "-")}`,
      `🕘 <b>Shift:</b> ${escapeHtml(shift.shiftTime || "-")}`,
      "",
      `🕒 <b>Ochildi:</b> ${escapeHtml(formatDateTime(shift.openedAt))}`,
      `💵 <b>Opening cash:</b> ${formatPrice(shift.openingCash)} so‘m`,
      "",
      `🆔 <b>Shift ID:</b> ${escapeHtml(shift.id || "-")}`,
      `📅 <b>Sana:</b> ${new Date().toLocaleString("uz-UZ")}`,
    ].join("\n");

    return this.sendMessage(text);
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
      "❌ <b>Order bekor qilindi</b>",
      "",
      `🏢 <b>Filial:</b> ${escapeHtml(order.branch || "-")}`,
      `🆔 <b>Order:</b> ${escapeHtml(order.id || "-")}`,
      `👤 <b>Klient:</b> ${escapeHtml(order.client || "-")}`,
      `📞 <b>Telefon:</b> ${escapeHtml(order.phone || "-")}`,
      "",
      `🧳 <b>Size:</b> ${escapeHtml(order.size || "-")}`,
      `🔢 <b>Soni:</b> ${escapeHtml(order.count || 0)} ta`,
      `💳 <b>To‘lov:</b> ${escapeHtml(order.payment || "-")}`,
      `💰 <b>Summa:</b> ${formatPrice(
        Number(order.finalPrice || 0) + Number(order.overtimeAmount || 0),
      )} so‘m`,
      "",
      `📝 <b>Sabab:</b> ${escapeHtml(order.cancelReason || "-")}`,
      `🕒 <b>Bekor qilingan vaqt:</b> ${escapeHtml(
        formatDateTime(order.cancelledAt),
      )}`,
    ].join("\n");

    return this.sendMessage(text);
  },

  async sendDelayedBaggage(order) {
    const settings = settingsService.get();

    if (!settings.telegram?.delayedBaggage) {
      return { ok: false, skipped: true };
    }

    const text = [
      "⚠️ <b>Baggage kechikdi</b>",
      "",
      `🏢 <b>Filial:</b> ${escapeHtml(order.branch || "-")}`,
      `🆔 <b>Order:</b> ${escapeHtml(order.id || "-")}`,
      `👤 <b>Klient:</b> ${escapeHtml(order.client || "-")}`,
      `📞 <b>Telefon:</b> ${escapeHtml(order.phone || "-")}`,
      "",
      `🧳 <b>Size:</b> ${escapeHtml(order.size || "-")}`,
      `🔢 <b>Soni:</b> ${escapeHtml(order.count || 0)} ta`,
      `🕘 <b>Check-out:</b> ${escapeHtml(formatDateTime(order.checkOut))}`,
      "",
      `⏰ <b>Overtime:</b> ${escapeHtml(order.overtimeHours || 0)} soat`,
      `💰 <b>Qo'shimcha summa:</b> ${formatPrice(order.overtimeAmount)} so'm`,
    ].join("\n");

    return this.sendMessage(text);
  },
};

export default telegramService;
