import { useEffect, useRef, useState } from 'react';
import apiClient from '../../services/apiClient';
import { getData } from '../../services/apiMappers';
import { createIdempotencyKey, idempotencyHeaders } from '../../utils/idempotency';
import { formatMoneyByCurrency, toMinorUnits } from '../../utils/currency';
const statusLabels = { PENDING: 'Tasdiq kutilmoqda', REJECTED: 'Rad etildi', APPROVED_AWAITING_PAYOUT: 'Tasdiqlandi, qaytarish kutilmoqda', EXECUTED: 'Bajarildi' };
const kindLabels = { REFUND: 'Pul qaytarish', PAYMENT_CORRECTION: 'To‘lov turini tuzatish' };

export default function FinancialRequests({ order }) {
  const [data, setData] = useState({ requests: [], payments: [], canRecordPayout: false });
  const [form, setForm] = useState({ kind: 'REFUND', movementId: '', amount: '', newPaymentType: 'CASH', reason: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState('');
  const [payoutType, setPayoutType] = useState('CASH');
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentType: 'CASH' });
  const [received, setReceived] = useState(0);
  const paymentKey = useRef(createIdempotencyKey('order-payment'));
  const key = useRef(createIdempotencyKey('finance'));
  const payments = data.payments;
  const payment = payments.find((m) => m.id === form.movementId);
  useEffect(() => {
    let active = true;
    const refresh = () => apiClient.get(`/financial-requests/orders/${order.id}`)
      .then((response) => { if (active) setData(getData(response)); })
      .catch((err) => { if (active) setError(err.message); });
    refresh();
    const timer = setInterval(refresh, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [order.id]);
  const submit = async (event) => {
    event.preventDefault();
    if (busy || !payment) return;
    setBusy(true); setError('');
    try {
      const request = getData(await apiClient.post(`/financial-requests/orders/${order.id}`, {
        ...form, amount: form.kind === 'REFUND' ? toMinorUnits(form.amount, payment.currency) : undefined,
        currency: payment.currency, newPaymentType: form.kind === 'PAYMENT_CORRECTION' ? form.newPaymentType : undefined,
      }, idempotencyHeaders(key.current)));
      setData((current) => ({ ...current, requests: [request, ...current.requests.filter((r) => r.id !== request.id)] }));
      key.current = createIdempotencyKey('finance');
      setForm((current) => ({ ...current, reason: '', amount: '' }));
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const payout = async (r) => {
    if (busy || !reference.trim()) return;
    setBusy(true); setError('');
    try {
      const updated = getData(await apiClient.post(`/financial-requests/${r.id}/payout`, {
        amount: r.amount, currency: r.currency, reference, paymentType: payoutType,
      }, idempotencyHeaders(`payout:${r.id}`)));
      setData((current) => ({ ...current, requests: current.requests.map((item) => item.id === r.id ? updated : item) }));
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const receive = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const movement = getData(await apiClient.post(`/orders/${order.id}/payments`, {
        amount: toMinorUnits(paymentForm.amount, order.currency), currency: order.currency, paymentType: paymentForm.paymentType,
      }, idempotencyHeaders(paymentKey.current)));
      setReceived((value) => value + movement.amount);
      paymentKey.current = createIdempotencyKey('order-payment');
      setPaymentForm((value) => ({ ...value, amount: '' }));
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <section aria-label="Moliyaviy so‘rovlar">
    <h3>Moliyaviy so‘rovlar</h3>
    {['ACTIVE', 'DELAYED'].includes(order.apiStatus) && order.paymentType !== 'DEBT' && order.realPaidAmount + received < order.finalAmount && <div>
      <p>Buyurtmani yopish uchun to‘lovni to‘liq amalga oshiring yoki qarz tartibida rasmiylashtiring.</p>
      <label>Qo‘shimcha to‘lov ({order.currency}) <input type="number" min="0" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} /></label>
      <label>To‘lov turi <select value={paymentForm.paymentType} onChange={(event) => setPaymentForm({ ...paymentForm, paymentType: event.target.value })}>
        {['CASH','TERMINAL','CLICK','PAYME'].map((type) => <option key={type}>{type}</option>)}
      </select></label>
      <button disabled={busy || !paymentForm.amount} onClick={receive}>Haqiqiy to‘lovni qayd etish</button>
    </div>}
    <form onSubmit={submit}>
      <label>Amal <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
        <option value="REFUND">Pul qaytarish uchun so‘rov yuborish</option>
        <option value="PAYMENT_CORRECTION">To‘lov turini tuzatish</option>
      </select></label>
      <label>To‘lov <select required value={form.movementId} onChange={(e) => setForm({ ...form, movementId: e.target.value })}>
        <option value="">To‘lovni tanlang</option>
        {payments.map((m) => <option key={m.id} value={m.id}>{m.note} — {m.paymentType} — {formatMoneyByCurrency(m.amount, m.currency)}</option>)}
      </select></label>
      {form.kind === 'REFUND' ? <label>Summa ({payment?.currency || order.currency}) <input required type="number" min="0.01" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
        : <label>Yangi to‘lov turi <select value={form.newPaymentType} onChange={(e) => setForm({ ...form, newPaymentType: e.target.value })}>
          {['CASH','TERMINAL','CLICK','PAYME','CARD','TRANSFER'].map((type) => <option key={type}>{type}</option>)}
        </select></label>}
      <label>Sabab <textarea required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></label>
      <button disabled={busy || !payment} type="submit">So‘rov yuborish</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {data.requests.map((r) => <div key={r.id}>
      <p>{kindLabels[r.kind]} — {formatMoneyByCurrency(r.amount, r.currency)} — {statusLabels[r.status]} — {r.context.managerName || ''}</p>
      {r.status === 'APPROVED_AWAITING_PAYOUT' && <p>Tasdiqlangan. Pul hali qaytarilgani qayd etilmagan.</p>}
      {r.status === 'APPROVED_AWAITING_PAYOUT' && (data.canRecordPayout || r.canRecordPayout) && <>
        <label>Haqiqiy qaytarish usuli <select value={payoutType} onChange={(event) => setPayoutType(event.target.value)}>
          {['CASH', 'TERMINAL', 'CLICK', 'PAYME', 'CARD', 'TRANSFER'].map((type) => <option key={type}>{type}</option>)}
        </select></label>
        <label>Haqiqiy qaytarish tasdig‘i / tranzaksiya raqami <input value={reference} onChange={(e) => setReference(e.target.value)} /></label>
        <button disabled={busy || !reference.trim()} onClick={() => payout(r)}>Pul haqiqatan qaytarilganini qayd etish</button>
      </>}
    </div>)}
  </section>;
}
