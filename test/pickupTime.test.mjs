import test from "node:test";
import assert from "node:assert/strict";
import { calculatePickupOvertime, getPickupCountdown } from "../src/utils/pickupTime.js";

const checkout = "2026-09-21T10:00:00.000Z";

test("pickup countdown is yellow through the free 15-minute grace period", () => {
  assert.deepEqual(getPickupCountdown(checkout, "2026-09-21T10:15:00.000Z"), {
    text: "15 daqiqa kechikdi",
    tone: "grace",
  });
});

test("pickup countdown becomes red after the 15-minute grace period", () => {
  assert.deepEqual(getPickupCountdown(checkout, "2026-09-21T10:16:00.000Z"), {
    text: "16 daqiqa kechikdi",
    tone: "late",
  });
});

test("16 minutes late charges one hour at the matching baggage tariff", () => {
  const result = calculatePickupOvertime({
    order: {
      checkOut: checkout,
      currency: "UZS",
      lockers: [{ size: "M", count: 1, tariffHours: 12, unitPrice: 100000 }],
    },
    tariffs: [{ size: "M", price1h: 15000, price12h: 100000 }],
    actualTime: "2026-09-21T10:16:00.000Z",
  });

  assert.deepEqual(result, { hours: 1, amount: 15000 });
});

test("overtime uses the tariff from the order branch", () => {
  const result = calculatePickupOvertime({
    order: {
      checkOut: checkout,
      branch: "Toshkent aeroport",
      currency: "UZS",
      lockers: [{ size: "M", count: 1 }],
    },
    tariffs: [
      { branch: "Toshkent aeroport", size: "M", price1h: 15000 },
      { branch: "Samarqand", size: "M", price1h: 22000 },
    ],
    actualTime: "2026-09-21T10:16:00.000Z",
  });

  assert.equal(result.amount, 15000);
});
