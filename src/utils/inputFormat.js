export const cleanNumericInput = (value, { decimal = false } = {}) => {
  const raw = String(value ?? "").replace(/\s/g, "").replace(",", ".");
  const filtered = raw.replace(decimal ? /[^\d.]/g : /\D/g, "");

  if (!decimal) return filtered;

  const [integer = "", ...fractionParts] = filtered.split(".");
  const fraction = fractionParts.join("");
  return fractionParts.length ? `${integer}.${fraction}` : integer;
};

export const formatNumberInput = (value, { decimal = false } = {}) => {
  const cleaned = cleanNumericInput(value, { decimal });
  if (!cleaned) return "";

  const [integer, fraction] = cleaned.split(".");
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return decimal && cleaned.includes(".") ? `${formattedInteger}.${fraction || ""}` : formattedInteger;
};

export const cleanPhoneInput = (value) => String(value ?? "").replace(/[^\d+]/g, "");

export const formatPhoneInput = (value) => {
  const cleaned = cleanPhoneInput(value);
  const prefix = cleaned.startsWith("+") ? "+" : "";
  const digits = cleaned.replace(/\D/g, "");

  if (!digits) return prefix;
  if (digits.startsWith("998")) {
    const parts = [
      digits.slice(0, 3),
      digits.slice(3, 5),
      digits.slice(5, 8),
      digits.slice(8, 10),
      digits.slice(10, 12),
      digits.slice(12),
    ].filter(Boolean);
    return `${prefix}${parts.join(" ")}`;
  }

  return `${prefix}${digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim()}`;
};
