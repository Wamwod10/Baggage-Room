export const PAYMENT_OPTIONS = [
  { value: "Naqd", label: "Naqd" },
  { value: "Terminal", label: "Terminal" },
  { value: "Click/Payme", label: "Click/Payme" },
  { value: "Qarz", label: "Qarz" },
];

const paymentLabelMap = {
  CARD: "Terminal",
  TERMINAL: "Terminal",
  TRANSFER: "Terminal",
  Karta: "Terminal",
  Terminal: "Terminal",
  "O'tkazma": "Terminal",
  "O‘tkazma": "Terminal",
};

export const getPaymentLabel = (payment) => paymentLabelMap[payment] || payment || "-";
