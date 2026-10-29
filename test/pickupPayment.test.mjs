import test from "node:test";
import assert from "node:assert/strict";
import { updatePickupOvertimeAmount, updatePickupRealPaidAmount, updatePickupCurrency } from "../src/utils/pickupPayment.js";

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
test('pickup currency converts the receipt base, overtime, debt and quote together', () => {
  const order={currency:'UZS',realPaidAmount:60000,debtAmount:12000};
  const form={currency:'UZS',realPaidAmount:'84000',basePaidAmount:'72000',overtimeAmount:'12000',quotedOvertimeAmount:12000,overtimePayment:'Naqd'};
  const usd=updatePickupCurrency(form,'USD',order,{USD:12000});
  assert.equal(usd.basePaidAmount,'6');assert.equal(usd.overtimeAmount,'1');
  assert.equal(usd.realPaidAmount,'7');assert.equal(usd.debtAmount,'1');
  assert.equal(usd.quotedOvertimeAmount,100);
  assert.equal(updatePickupCurrency({...usd,leaveDebtOpen:true},'USD',order,{USD:12000}).realPaidAmount,'6');
  assert.equal(updatePickupCurrency(usd,'UZS',order,{USD:12000}).realPaidAmount,'84000');
  const rounded=updatePickupCurrency({...form,overtimeAmount:'0',quotedOvertimeAmount:0},'USD',
    {currency:'UZS',finalAmount:100,realPaidAmount:50,debtAmount:50},{USD:12500});
  assert.equal(rounded.debtAmount,'0.01');assert.equal(rounded.realPaidAmount,'0.01');
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

test('tenge and card are available and card keeps its label', async () => {
  const { availableOrderCurrencies } = await import('../src/utils/currency.js');
  const { PAYMENT_OPTIONS, getPaymentLabel } = await import('../src/utils/paymentLabels.js');
  assert.deepEqual(availableOrderCurrencies(['UZS', 'USD', 'RUB', 'EUR']), ['UZS', 'USD', 'RUB', 'EUR', 'KZT', 'TJS']);
  assert.ok(PAYMENT_OPTIONS.some(({ value }) => value === 'Karta'));
  assert.equal(getPaymentLabel('CARD'), 'Karta');
});
