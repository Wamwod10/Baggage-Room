import test from "node:test";
import assert from "node:assert/strict";
import { updatePickupOvertimeAmount } from "../src/utils/pickupPayment.js";

test("pickup overtime amount can be edited in UZS", () => {
  const form = {
    payment: "Naqd",
    currency: "UZS",
    overtimeAmount: "0",
  };

  assert.deepEqual(updatePickupOvertimeAmount(form, "125 000"), {
    ...form,
    overtimeAmount: "125000",
  });
});

test("pickup overtime amount accepts decimals for foreign currency", () => {
  const form = {
    payment: "Naqd",
    currency: "USD",
    overtimeAmount: "0",
  };

  assert.deepEqual(updatePickupOvertimeAmount(form, "12,50"), {
    ...form,
    overtimeAmount: "12.50",
  });
});
