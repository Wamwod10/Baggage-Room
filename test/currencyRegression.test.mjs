import test from 'node:test';
import assert from 'node:assert/strict';
import { fromMinorUnits, toMinorUnits, formatMoneyByCurrency } from '../src/utils/currency.js';
for (const [minor, currency, major] of [[214285,'RUB',2142.85],[13280,'USD',132.80],[85715,'RUB',857.15],[7360,'USD',73.60],[96000,'UZS',96000]]) test('currency regression '+minor+' '+currency,()=>{
 assert.equal(fromMinorUnits(minor,currency),major);
 assert.equal(toMinorUnits(major,currency),minor);
 const formatted=formatMoneyByCurrency(minor,currency).replace(/[\s\u00a0\u202f]/g,'').replace(',','.').replace(/[^0-9.]/g,'');
 assert.equal(formatted,currency==='UZS'?String(major):major.toFixed(2));
});

test('currency maps format each native minor amount once, with exact decimal digits',async()=>{
 const {formatMoneyMap}=await import('../src/utils/currency.js');
 const result=formatMoneyMap({UZS:96000,USD:13280,RUB:214285});
 assert.ok(result.includes(formatMoneyByCurrency(96000,'UZS')));
 assert.ok(result.includes(formatMoneyByCurrency(13280,'USD')));
 assert.ok(result.includes(formatMoneyByCurrency(214285,'RUB')));
 assert.equal(formatMoneyMap(undefined,96000),formatMoneyByCurrency(96000,'UZS'));
});

test('foreign overtime preserves new TJV and historical pricing rules',async()=>{
 const {calculatePickupOvertime}=await import('../src/utils/pickupTime.js');
 const order={currency:'USD',customHours:15,tariffHours:15,plannedCheckOut:'2026-10-25T10:00:00Z',lockers:[{size:'S',count:1,tariffHours:15,unitPrice:416}],pricingSnapshot:{customTariffRule:'TJV_12H_PLUS_HOURLY'}};
 const tariffs=[{size:'S',price1h:4000,price12h:40000}];
 const actualTime='2026-10-25T11:00:00Z';
 assert.equal(calculatePickupOvertime({order,tariffs,actualTime}).amount,32);
 assert.equal(calculatePickupOvertime({order:{...order,pricingSnapshot:{},lockers:[{...order.lockers[0],unitPrice:480}]},tariffs,actualTime}).amount,32);
});
