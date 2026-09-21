export const PICKUP_GRACE_MINUTES = 15;

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const GRACE_MS = PICKUP_GRACE_MINUTES * MINUTE_MS;

const timestamp = (value) => {
  const result = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(result) ? result : null;
};

export const getPickupCountdown = (target, actualTime = new Date()) => {
  const planned = timestamp(target);
  const actual = timestamp(actualTime);
  if (planned === null || actual === null) return { text: "-", tone: "unknown" };

  const diff = planned - actual;
  const minutes = Math.max(0, Math.floor(Math.abs(diff) / MINUTE_MS));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const text = hours > 0 ? `${hours} soat ${rest} daqiqa` : `${rest} daqiqa`;
  if (diff >= 0) return { text: `${text} qoldi`, tone: "on-time" };

  return {
    text: `${text} kechikdi`,
    tone: Math.abs(diff) <= GRACE_MS ? "grace" : "late",
  };
};

const overtimeHours = (plannedCheckOut, actualTime) => {
  const planned = timestamp(plannedCheckOut);
  const actual = timestamp(actualTime);
  if (planned === null || actual === null) return 0;
  const chargeableMs = Math.max(0, actual - planned - GRACE_MS);
  return chargeableMs > 0 ? Math.max(1, Math.ceil(chargeableMs / HOUR_MS)) : 0;
};

const presetPrice = (tariff, hours, isCustom) => {
  if (isCustom) return Number(tariff.price1h || 0) * Math.max(1, Math.ceil(hours || 1));
  if (hours <= 1) return Number(tariff.price1h || 0);
  if (hours <= 12) return Number(tariff.price12h || 0);
  if (hours <= 24) return Number(tariff.price24h || 0);
  if (hours <= 48) return Number(tariff.price48h || 0);
  if (hours <= 72) return Number(tariff.price72h || 0);
  return Number(tariff.price72h || 0) + Math.round((hours - 72) * (Number(tariff.after72hPrice || 0) / 24));
};

export const calculatePickupOvertime = ({ order = {}, tariffs = [], actualTime = new Date() }) => {
  const hours = overtimeHours(order.checkOut || order.plannedCheckOut, actualTime);
  if (!hours) return { hours: 0, amount: 0 };

  const branchTariffs = tariffs.filter(
    (tariff) => !order.branch || !tariff.branch || tariff.branch === order.branch,
  );
  const tariffsBySize = new Map(branchTariffs.map((tariff) => [tariff.size, tariff]));
  const amount = (order.lockers || []).reduce((total, item) => {
    const tariff = tariffsBySize.get(item.size);
    if (!tariff) return total;
    const count = Math.max(1, Number(item.count || 1));
    let hourlyPrice = Number(tariff.price1h || 0);
    if (order.currency && order.currency !== "UZS") {
      const originalUzsPrice = presetPrice(
        tariff,
        Number(item.tariffHours || order.tariffHours || 1),
        order.customHours !== null && order.customHours !== undefined,
      );
      hourlyPrice = originalUzsPrice > 0
        ? Math.round(hourlyPrice * (Number(item.unitPrice || 0) / originalUzsPrice))
        : 0;
    }
    return total + hourlyPrice * count * hours;
  }, 0);

  return { hours, amount };
};
