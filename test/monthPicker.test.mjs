import test from "node:test";
import assert from "node:assert/strict";
import {
  MONTH_NAMES_UZ,
  formatMonthLabel,
  getMonthParts,
  makeMonthKey,
  getCurrentTashkentMonth,
} from "../src/components/MonthPicker/monthUtils.js";

test("month picker shows Uzbek month labels and retains YYYY-MM value", () => {
  assert.equal(MONTH_NAMES_UZ.length, 12);
  assert.equal(formatMonthLabel("2026-08"), "Avgust 2026");
  assert.equal(formatMonthLabel("2026-11"), "Noyabr 2026");
  assert.equal(formatMonthLabel(""), "Oy tanlang");
  assert.deepEqual(getMonthParts("2026-02"), { year: 2026, month: 2 });
});

test("custom picker won't produce malformed month values", () => {
  assert.equal(makeMonthKey(2026, 1), "2026-01");
  assert.equal(makeMonthKey(2026, 12), "2026-12");
  assert.equal(makeMonthKey(2026, 0), "");
  assert.equal(makeMonthKey(2026, 13), "");
  assert.equal(makeMonthKey(1999, 4), "");
  assert.equal(getMonthParts("2026-13"), null);
  assert.equal(getMonthParts("2026-01-01"), null);
});

test("current month follows Tashkent calendar boundary, not UTC", () => {
  const utcBeforeMidnight = new Date("2026-10-31T19:02:00.000Z");
  assert.equal(getCurrentTashkentMonth(utcBeforeMidnight), "2026-11");
  assert.equal(getCurrentTashkentMonth(new Date("2026-11-30T18:59:59.000Z")), "2026-11");
  assert.equal(getCurrentTashkentMonth(new Date("2026-11-30T19:00:00.000Z")), "2026-12");
});
