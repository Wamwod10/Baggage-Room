const currencyMeta = {
  UZS: { suffix: "so'm", decimals: 0, prefix: "" },
  USD: { suffix: "", decimals: 2, prefix: "$" },
  RUB: { suffix: "", decimals: 0, prefix: "₽" },
  EUR: { suffix: "", decimals: 2, prefix: "€" },
};

export const formatMoneyByCurrency = (amount, currency = "UZS") => {
  const code = currencyMeta[currency] ? currency : "UZS";
  const meta = currencyMeta[code];
  const value = Number(amount || 0).toLocaleString("uz-UZ", {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  });

  return meta.prefix ? `${meta.prefix}${value}` : `${value} ${meta.suffix}`;
};

export const convertFromUZS = (amountUZS, currency = "UZS", rates = {}) => {
  if (currency === "UZS") return Number(amountUZS || 0);

  const rate = Number(rates?.[currency] || 0);

  if (!rate) return Number(amountUZS || 0);

  return Number(amountUZS || 0) / rate;
};

export const getCurrencySymbol = (currency = "UZS") =>
  currencyMeta[currency]?.prefix || currencyMeta[currency]?.suffix || currency;
