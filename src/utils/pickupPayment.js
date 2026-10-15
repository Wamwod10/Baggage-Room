import { cleanNumericInput } from "./inputFormat.js";
import { fromMinorUnits, toMinorUnits } from "./currency.js";
import { convertEditMinor } from './orderFinancialEdit.js';

const baseAmount = (form) => form.basePaidAmount !== undefined
  ? toMinorUnits(form.basePaidAmount, form.currency)
  : toMinorUnits(form.realPaidAmount || 0, form.currency) - (form.overtimePayment === 'Qarz' ? 0 : toMinorUnits(form.overtimeAmount || 0, form.currency));

export const updatePickupOvertimeAmount = (form, value) => {
  const overtimeAmount = cleanNumericInput(value, { decimal: form.currency !== "UZS" });
  if (form.realPaidAmount === undefined) return { ...form, overtimeAmount };
  const total = baseAmount(form) + (form.overtimePayment === 'Qarz' ? 0 : toMinorUnits(overtimeAmount || 0, form.currency));
  return { ...form, overtimeAmount, realPaidAmount: String(fromMinorUnits(total, form.currency)) };
};

export const updatePickupRealPaidAmount = (form, value) => {
  const realPaidAmount = cleanNumericInput(value, { decimal: form.currency !== 'UZS' });
  if (form.overtimePayment === 'Qarz') return { ...form, realPaidAmount };
  const extra = Math.max(0, toMinorUnits(realPaidAmount || 0, form.currency) - baseAmount(form));
  return { ...form, realPaidAmount, overtimeAmount: String(fromMinorUnits(extra, form.currency)) };
};
export const updatePickupCurrency = (form, currency, order, rates) => {
  const originalRate = order.currency === 'UZS' ? 1 : order.exchangeRate || rates[order.currency];
  const targetRate = currency === 'UZS' ? 1 : rates[currency];
  const currentRate = form.currency === 'UZS' ? 1 : form.exchangeRate || originalRate;
  const convertOriginal = (amount) => convertEditMinor(amount || 0, order.currency, currency, originalRate, targetRate);
  const overtime = convertEditMinor(toMinorUnits(form.overtimeAmount || 0, form.currency), form.currency, currency, currentRate, targetRate);
  const previousBase = Math.max(0, Number(order.finalAmount || 0) - Number(order.realPaidAmount || 0));
  const convertedDebt = order.finalAmount !== undefined && Number(order.debtAmount || 0) >= previousBase
    ? Math.max(0, convertOriginal(order.finalAmount) - convertOriginal(order.realPaidAmount)) + convertOriginal(Number(order.debtAmount || 0) - previousBase)
    : convertOriginal(order.debtAmount);
  const base = convertOriginal(Number(order.realPaidAmount || 0)) + (form.leaveDebtOpen ? 0 : convertedDebt);
  return updatePickupOvertimeAmount({ ...form, currency, exchangeRate: targetRate, sourceExchangeRate: originalRate,
    basePaidAmount: String(fromMinorUnits(base, currency)), debtAmount: String(fromMinorUnits(convertedDebt, currency)),
    quotedOvertimeAmount: convertEditMinor(form.quotedOvertimeAmount || 0, form.currency, currency, currentRate, targetRate),
  }, String(fromMinorUnits(overtime, currency)));
};
