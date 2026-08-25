import test from "node:test";
import assert from "node:assert/strict";
import {
  formatTashkentDateTime,
  formatTashkentInputDateTime,
  getTashkentDateKey,
  parseTashkentInputToIso,
} from "../src/utils/formatDate.js";
import { getReceiptTimestamp } from "../src/utils/receiptTime.js";

test("UTC midnight crossing is rendered as the next Tashkent day", () => {
  assert.equal(getTashkentDateKey("2026-08-25T23:30:00.000Z"), "2026-08-26");
  assert.equal(formatTashkentInputDateTime("2026-08-25T23:30:00.000Z"), "2026-08-26T04:30");
});

test("Tashkent wall-clock input converts to the same UTC instant in every browser timezone", () => {
  assert.equal(parseTashkentInputToIso("2026-08-26T00:30"), "2026-08-25T19:30:00.000Z");
  assert.equal(parseTashkentInputToIso("2026-08-26T04:30"), "2026-08-25T23:30:00.000Z");
});

test("invalid and unzoned non-input timestamps are rejected", () => {
  assert.equal(parseTashkentInputToIso("2026-02-31T10:00"), undefined);
  assert.equal(parseTashkentInputToIso("2026-08-26 10:00"), undefined);
});

test("formatter pins display to Asia/Tashkent", () => {
  const formatted = formatTashkentDateTime("2026-08-25T19:30:00.000Z", "en-GB");
  assert.match(formatted, /26\/08\/2026/);
  assert.match(formatted, /00:30:00/);
});

test("receipt chooses authoritative transaction timestamps", () => {
  assert.equal(getReceiptTimestamp({ createdAt: "2026-08-25T10:00:00Z", checkIn: "wrong" }), "2026-08-25T10:00:00Z");
  assert.equal(getReceiptTimestamp({ apiStatus: "PICKED_UP", realPickupTime: "2026-08-25T12:00:00Z", createdAt: "old" }), "2026-08-25T12:00:00Z");
  assert.equal(getReceiptTimestamp({}), null);
});
