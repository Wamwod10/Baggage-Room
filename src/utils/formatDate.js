export const TASHKENT_TIME_ZONE = "Asia/Tashkent";

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const pad = (value, length = 2) => String(value).padStart(length, "0");

const parseInstant = (value) => {
  if (value instanceof Date) return new Date(value.getTime());
  const date = new Date(value);
  return date;
};

const isValidWallClock = ({ year, month, day, hour, minute, second = 0 }) => {
  const normalized = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return normalized.getUTCFullYear() === year &&
    normalized.getUTCMonth() === month - 1 &&
    normalized.getUTCDate() === day &&
    normalized.getUTCHours() === hour &&
    normalized.getUTCMinutes() === minute &&
    normalized.getUTCSeconds() === second;
};

const shiftedTashkentDate = (date = new Date()) => new Date(new Date(date).getTime() + TASHKENT_OFFSET_MS);

export const getTashkentDateKey = (date = new Date()) => {
  const shifted = shiftedTashkentDate(date);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
};

export const getTashkentDateKeyOffset = (offsetDays = 0) => {
  const shifted = shiftedTashkentDate(new Date());
  shifted.setUTCDate(shifted.getUTCDate() + Number(offsetDays || 0));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
};

export const formatTashkentDateTime = (value, locale = "uz-UZ") => {
  if (!value) return "-";
  const date = parseInstant(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, {
    timeZone: TASHKENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date);
};

export const getTashkentClock = (date = new Date()) => {
  const shifted = shiftedTashkentDate(date);
  return {
    date: `${pad(shifted.getUTCDate())}.${pad(shifted.getUTCMonth() + 1)}.${shifted.getUTCFullYear()}`,
    time: `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`,
  };
};

export const formatTashkentInputDateTime = (date = new Date()) => {
  const shifted = shiftedTashkentDate(date);
  return [
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`,
  ].join("T");
};

export const parseTashkentInputToIso = (value) => {
  if (!value) return undefined;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    // API instants must carry Z or an explicit offset. Never let the browser
    // interpret an unzoned wall-clock using its own timezone.
    if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(String(value))) return undefined;
    const date = parseInstant(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  const [, year, month, day, hour, minute, second = "0"] = match;
  const parts = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
  };
  if (!isValidWallClock(parts)) return undefined;
  const utcMs =
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) -
    TASHKENT_OFFSET_MS;
  return new Date(utcMs).toISOString();
};

export const addHoursToIso = (isoValue, hours) => {
  const date = new Date(isoValue || new Date());
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return new Date(date.getTime() + Number(hours || 0) * 60 * 60 * 1000).toISOString();
};
