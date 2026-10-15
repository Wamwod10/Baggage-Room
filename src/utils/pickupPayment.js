import { cleanNumericInput } from "./inputFormat.js";
import { fromMinorUnits, toMinorUnits } from "./currency.js";

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
