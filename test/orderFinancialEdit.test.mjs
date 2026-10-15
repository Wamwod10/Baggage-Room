import test from 'node:test';
import assert from 'node:assert/strict';
import { changeEditCurrency, convertEditMinor } from '../src/utils/orderFinancialEdit.js';
test('edit currency converts totals and preserves nonfinancial fields', () => {
  const order = { currency: 'UZS', finalAmount: 60000, realPaidAmount: 60000, overtimeAmount: 12000 };
  const form = changeEditCurrency({ clientName: 'Client' }, order, 'USD', { USD: 12000 });
  assert.equal(form.finalAmount, '5'); assert.equal(form.realPaidAmount, '5');
  assert.equal(form.overtimeAmount, '1'); assert.equal(form.clientName, 'Client');
  assert.equal(changeEditCurrency(form, order, 'UZS', {}).finalAmount, '60000');
});
test('foreign conversion uses saved source rate and exact half rounding', () => {
  assert.equal(convertEditMinor(23, 'UZS', 'USD', 1, 40), 58);
  assert.equal(changeEditCurrency({}, { currency: 'USD', exchangeRate: 12000, finalAmount: 500, realPaidAmount: 500 }, 'UZS', { USD: 14000 }).finalAmount, '60000');
  assert.throws(() => convertEditMinor(100, 'UZS', 'USD', 1, 0));
});
