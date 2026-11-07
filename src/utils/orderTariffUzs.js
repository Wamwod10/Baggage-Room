// Separate the UZS tariff from the native/minor-unit payment currency.
// Historical orders retain foreign calculatedAmount, so prefer the immutable
// tariff snapshot rather than converting today's rates or mutating old rows.
const positiveInteger = (value) => Number.isSafeInteger(value) && value >= 0;
const calculateSnapshotPrice = (tariff, hours, { isCustom, customRule, dailyRate }) => {
  if (!tariff || !Number.isFinite(hours) || hours <= 0) return null;
  let amount;
  if (hours > 72 && positiveInteger(dailyRate) && dailyRate > 0) {
    amount = Math.ceil(hours / 24) * dailyRate;
  } else if (customRule === 'TJV_12H_PLUS_HOURLY' && isCustom && hours > 12 && hours <= 72) {
    amount = Number(tariff.price12h || 0) + Math.ceil(hours - 12) * Number(tariff.price1h || 0);
  } else if (isCustom) {
    amount = Number(tariff.price1h || 0) * Math.max(1, Math.ceil(hours));
  } else if (hours <= 1) amount = Number(tariff.price1h);
  else if (hours <= 12) amount = Number(tariff.price12h);
  else if (hours <= 24) amount = Number(tariff.price24h);
  else if (hours <= 48) amount = Number(tariff.price48h);
  else if (hours <= 72) amount = Number(tariff.price72h);
  else return null;
  return positiveInteger(amount) ? amount : null;
};

export const resolveCalculatedAmountUZS = (order) => {
  if (!order) return null;
  const stored = order.calculatedAmountUZS;
  if (stored !== null && stored !== undefined && positiveInteger(Number(stored))) return Number(stored);
  if ((order.currency || 'UZS') === 'UZS') {
    const amount = Number(order.calculatedAmount);
    return positiveInteger(amount) ? amount : null;
  }
  const snapshot = order.pricingSnapshot;
  const tariffs = snapshot?.tariffs;
  const items = order.items || order.baggageItems || order.lockers;
  if (!tariffs || !Array.isArray(items) || !items.length) return null;
  let total = 0;
  for (const item of items) {
    const size = item.size;
    const tariff = tariffs[size];
    const hours = Number(item.tariffHours ?? order.tariffHours);
    const count = Number(item.count ?? 1);
    if (!positiveInteger(count) || count <= 0) return null;
    const unit = calculateSnapshotPrice(tariff, hours, {
      isCustom: order.customHours !== null && order.customHours !== undefined,
      customRule: snapshot.customTariffRule,
      dailyRate: snapshot.dailyRates?.[size],
    });
    if (unit === null) return null;
    total += unit * count;
    if (!positiveInteger(total)) return null;
  }
  return total;
};
