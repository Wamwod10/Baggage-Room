import test from "node:test";
import assert from "node:assert/strict";
import { updatePickupOvertimeAmount, updatePickupRealPaidAmount } from "../src/utils/pickupPayment.js";

test('pickup edits keep additional payment and total in sync', () => {
  const form = { currency: 'UZS', overtimeAmount: '10000', realPaidAmount: '70000', overtimePayment: 'Naqd' };
  assert.equal(updatePickupOvertimeAmount(form, '20 000').realPaidAmount, '80000');
  assert.equal(updatePickupRealPaidAmount(form, '90 000').overtimeAmount, '30000');
  assert.equal(updatePickupRealPaidAmount(form, '50 000').realPaidAmount, '50000');
  assert.equal(updatePickupRealPaidAmount(form, '50 000').overtimeAmount, '0');
});

test('fixed receipt base survives typing a lower total and handles foreign currency and debt', () => {
  const form = { currency: 'USD', basePaidAmount: '60', realPaidAmount: '70', overtimeAmount: '10', overtimePayment: 'Naqd' };
  const lower = updatePickupRealPaidAmount(form, '5');
  assert.equal(updatePickupRealPaidAmount(lower, '80,50').overtimeAmount, '20.5');
  assert.equal(updatePickupOvertimeAmount(form, '12,50').realPaidAmount, '72.5');
  assert.equal(updatePickupOvertimeAmount({ ...form, overtimePayment: 'Qarz' }, '12,50').realPaidAmount, '60');
});

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
