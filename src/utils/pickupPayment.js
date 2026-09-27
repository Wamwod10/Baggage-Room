import { cleanNumericInput } from "./inputFormat.js";

export const updatePickupOvertimeAmount = (form, value) => ({
  ...form,
  overtimeAmount: cleanNumericInput(value, { decimal: form.currency !== "UZS" }),
});
