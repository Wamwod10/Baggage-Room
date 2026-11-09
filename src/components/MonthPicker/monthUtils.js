export const MONTH_NAMES_UZ = Object.freeze([
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
]);

const MONTH_KEY = /^(20\d{2})-(0[1-9]|1[0-2])$/;

export const getMonthParts = (value) => {
  const match = MONTH_KEY.exec(String(value || ""));
  return match ? { year: Number(match[1]), month: Number(match[2]) } : null;
};

export const formatMonthLabel = (value) => {
  const parts = getMonthParts(value);
  return parts ? `${MONTH_NAMES_UZ[parts.month - 1]} ${parts.year}` : "Oy tanlang";
};

export const makeMonthKey = (year, month) => {
  if (!Number.isInteger(year) || year < 2000 || year > 2099 || !Number.isInteger(month) || month < 1 || month > 12) {
    return "";
  }
  return `${year}-${String(month).padStart(2, "0")}`;
};

export const getCurrentTashkentMonth = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return makeMonthKey(year, month);
};
