import { fromMinorUnits } from './currency.js';
export const convertEditMinor = (amount, from, to, sourceRate = 1, targetRate = 1) => {
  if (from === to) return Number(amount || 0);
  const rate = (value) => {
    const text = String(value);
    if (!/^\d+(\.\d{1,12})?$/.test(text) || Number(text) <= 0) throw new Error('Valyuta kursi noto‘g‘ri yoki kiritilmagan');
    const [whole, fraction = ''] = text.split('.');
    return [BigInt(whole + fraction), 10n ** BigInt(fraction.length)];
  };
  const [s, sd] = rate(from === 'UZS' ? 1 : sourceRate);
  const [t, td] = rate(to === 'UZS' ? 1 : targetRate);
  const n = BigInt(amount || 0) * s * td * (to === 'UZS' ? 1n : 100n);
  const d = sd * t * (from === 'UZS' ? 1n : 100n);
  return Number((n * 2n + d) / (2n * d));
};
export const changeEditCurrency = (form, order, currency, rates) => {
  const sourceExchangeRate = order.currency === 'UZS' ? 1 : order.exchangeRate || rates[order.currency];
  const exchangeRate = currency === 'UZS' ? 1 : rates[currency];
  const convert = (amount) => String(fromMinorUnits(convertEditMinor(amount, order.currency, currency, sourceExchangeRate, exchangeRate), currency));
  return { ...form, currency, exchangeRate, sourceExchangeRate,
    finalAmount: convert(order.finalAmount), realPaidAmount: convert(order.realPaidAmount),
    overtimeAmount: convert(order.overtimeAmount), overtimeCurrency: currency };
};
