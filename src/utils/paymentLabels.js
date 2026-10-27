export const PAYMENT_OPTIONS = [
  { value: "Naqd", label: "Naqd" },
  { value: "Karta", label: "Karta" },
  { value: "Terminal", label: "Terminal" },
  { value: "Click", label: "Click" },
  { value: "Payme", label: "Payme" },
  { value: "Qarz", label: "Qarz" },
];

const paymentLabelMap = {
  CASH: "Naqd",
  CARD: "Karta",
  TERMINAL: "Terminal",
  CLICK: "Click",
  PAYME: "Payme",
  TRANSFER: "Terminal",
  DEBT: "Qarz",
  Naqd: "Naqd",
  Karta: "Karta",
  Terminal: "Terminal",
  Click: "Click",
  Payme: "Payme",
  "Click/Payme": "Click",
  Qarz: "Qarz",
  "O'tkazma": "Terminal",
  "OвЂtkazma": "Terminal",
};

export const getPaymentLabel = (payment) => paymentLabelMap[payment] || payment || "-";
