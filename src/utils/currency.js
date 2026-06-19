const currencyMeta = {
  UZS: { suffix: "so'm", decimals: 0, prefix: "" },
  USD: { suffix: "", decimals: 2, prefix: "$" },
  RUB: { suffix: "RUB", decimals: 2, prefix: "" },
  EUR: { suffix: "", decimals: 2, prefix: "EUR " },
  KZT: { suffix: "₸", decimals: 2, prefix: "" },
  TJS: { suffix: "TJS", decimals: 2, prefix: "" },
};

export const currencyFractionDigits = Object.fromEntries(
  Object.entries(currencyMeta).map(([currency, meta]) => [currency, meta.decimals]),
);

export const toMinorUnits = (amount, currency = "UZS") => {
  const code = currencyMeta[currency] ? currency : "UZS";
  const factor = 10 ** currencyMeta[code].decimals;
  return Math.round(Number(amount || 0) * factor);
};

export const fromMinorUnits = (amount, currency = "UZS") => {
  const code = currencyMeta[currency] ? currency : "UZS";
  const factor = 10 ** currencyMeta[code].decimals;
  return Number(amount || 0) / factor;
};

export const formatMoneyByCurrency = (amount, currency = "UZS") => {
  const code = currencyMeta[currency] ? currency : "UZS";
  const meta = currencyMeta[code];
  const value = fromMinorUnits(amount, code).toLocaleString("uz-UZ", {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  });

  return meta.prefix ? `${meta.prefix}${value}` : `${value}${meta.suffix ? ` ${meta.suffix}` : ""}`;
};

export const convertFromUZS = (amountUZS, currency = "UZS", rates = {}) => {
  if (currency === "UZS") return Number(amountUZS || 0);

  const rate = Number(rates?.[currency] || 0);

  if (!rate) return Number(amountUZS || 0);

  return toMinorUnits(Number(amountUZS || 0) / rate, currency);
};

export const getCurrencySymbol = (currency = "UZS") =>
  currencyMeta[currency]?.prefix || currencyMeta[currency]?.suffix || currency;
