import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, Edit3, Eye, Search } from "lucide-react";
import baggageService from "../../services/baggageService";
import telegramService from "../../services/telegramService";
import { useAuth } from "../../store/AuthContext";
import "./salesHistory.scss";
import { getBranchNames } from "../../utils/branches";
import StateBlock from "../../components/StateBlock/StateBlock";
import { TableSkeleton } from "../../components/Skeleton/Skeleton";
import GlassSelect from "../../components/GlassSelect/GlassSelect";
import usePageResource from "../../hooks/usePageResource";
import { useTranslation } from "../../i18n/useTranslation";
import { animateButtonIcon } from "../../utils/animateButtonIcon";
import { formatMoneyByCurrency, fromMinorUnits, toMinorUnits } from "../../utils/currency";
import { cleanNumericInput, formatNumberInput } from "../../utils/inputFormat";
import { PAYMENT_OPTIONS, getPaymentLabel } from "../../utils/paymentLabels";

const hasLockerPrice = (locker) =>
  locker?.price !== undefined &&
  locker?.price !== null &&
  locker?.price !== "" &&
    Number.isFinite(Number(locker.price));
const asArray = (value) => (Array.isArray(value) ? value : []);
const overtimeCurrency = (order = {}) => order.overtimeCurrency || order.currency || "UZS";
const toDateTimeLocal = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const fromDateTimeLocal = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export default function SalesHistory() {
  const { t, formatMoney, formatDateTime } = useTranslation();
  const branchNames = getBranchNames();
  const [searchParams, setSearchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get("order");
  const { effectiveBranch } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("Barcha filiallar");
  const [payment, setPayment] = useState("Payment");
  const [status, setStatus] = useState("Status");
  const [manualSelectedOrder, setSelectedOrder] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [debtCloseOrder, setDebtCloseOrder] = useState(null);
  const [debtClosePayment, setDebtClosePayment] = useState("Naqd");
  const [editOrder, setEditOrder] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const {
    data: orders = [],
    isLoading,
    error,
    retry,
  } = usePageResource(
    () => baggageService.getAll(effectiveBranch),
    [effectiveBranch, refreshKey],
    [],
  );

  const orderFromUrl = useMemo(
    () => asArray(orders).find((order) => order.orderNumber === orderIdFromUrl || order.id === orderIdFromUrl) || null,
    [orderIdFromUrl, orders],
  );
  const selectedOrder = manualSelectedOrder || orderFromUrl;

  useEffect(() => {
    if (!selectedOrder && !debtCloseOrder && !editOrder) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedOrder(null);
        setDebtCloseOrder(null);
        setEditOrder(null);

        if (orderIdFromUrl) {
          setSearchParams({});
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [debtCloseOrder, editOrder, orderIdFromUrl, selectedOrder, setSearchParams]);

  const filteredOrders = useMemo(() => {
    return asArray(orders).filter((order) => {
      const query = search.toLowerCase();

      const matchSearch =
        String(order.orderNumber || "").toLowerCase().includes(query) ||
        String(order.client || "").toLowerCase().includes(query) ||
        String(order.phone || "").toLowerCase().includes(query);

      const matchBranch = effectiveBranch
        ? order.branch === effectiveBranch
        : branch === "Barcha filiallar" || order.branch === branch;

      const matchPayment =
        payment === "Payment" ||
        getPaymentLabel(order.payment) === getPaymentLabel(payment) ||
        (payment === "Qarz" && Number(order.debtAmount || 0) > 0);

      const matchStatus = status === "Status" || order.status === status;

      return matchSearch && matchBranch && matchPayment && matchStatus;
    });
  }, [orders, search, branch, payment, status, effectiveBranch]);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    payment !== "Payment" ||
    status !== "Status" ||
    (!effectiveBranch && branch !== "Barcha filiallar");

  const handleRefresh = (event) => {
    animateButtonIcon(event);
    setRefreshKey((value) => value + 1);
  };

  const getTotalPrice = (order) => {
    return order.realPaidAmount !== undefined && order.realPaidAmount !== null
      ? Number(order.realPaidAmount || 0)
      : Number(order.finalPrice || 0) + Number(order.overtimeAmount || 0);
  };

  const lockerLabel = (order) =>
    asArray(order.lockers).map((locker) => `#${locker.number || "-"} ${locker.size || "-"} x${locker.count || 1}`).join(", ") ||
    `${order.size || "-"} / ${order.count || 0} ${t("ta")}`;

  const formatCurrency = (order, amount, currency = order.currency) =>
    currency ? formatMoneyByCurrency(amount, currency) : formatMoney(amount);

  const lockerPriceLabel = (order, t) => {
    const lockers = Array.isArray(order.lockers) ? order.lockers : [];

    if (!lockers.length) return "-";

    return lockers
      .map((locker) => {
        const price = hasLockerPrice(locker)
          ? formatMoneyByCurrency(locker.price, locker.currency || order.currency)
          : t("Narx topilmadi");

        return `#${locker.number} / ${locker.size} x${locker.count || 1}: ${price}`;
      })
      .join("; ");
  };

  const openCloseDebt = (order) => {
    setDebtCloseOrder(order);
    setDebtClosePayment("Naqd");
    setStatusMessage("");
  };

  const openEdit = (order) => {
    const orderCurrency = order.currency || "UZS";
    const extraCurrency = overtimeCurrency(order);
    setEditOrder(order);
    setEditForm({
      clientName: order.client || "",
      phone: order.phone || "",
      passport: order.passport || "",
      checkOut: toDateTimeLocal(order.checkOut),
      payment: getPaymentLabel(order.payment),
      currency: orderCurrency,
      finalAmount: String(fromMinorUnits(order.finalAmount || order.finalPrice || 0, orderCurrency)),
      realPaidAmount: String(fromMinorUnits(order.realPaidAmount || 0, orderCurrency)),
      overtimeAmount: String(fromMinorUnits(order.overtimeAmount || 0, extraCurrency)),
      overtimeCurrency: extraCurrency,
      overtimePayment: getPaymentLabel(order.overtimePayment || order.overtimePaymentType || order.payment),
      note: order.note || "",
      items: asArray(order.lockers).map((locker) => ({
        id: locker.itemId || locker.id,
        size: locker.size,
        count: String(locker.count || 1),
      })),
    });
    setStatusMessage("");
  };

  const updateEditForm = (key, value) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateEditItem = (index, key, value) => {
    setEditForm((prev) => ({
      ...prev,
      items: asArray(prev.items).map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const handleSaveEdit = async () => {
    if (!editOrder || !editForm) return;
    if (!editForm.clientName.trim() || !editForm.phone.trim()) {
      setStatusMessage(t("Client va telefon majburiy."));
      return;
    }

    try {
      await baggageService.update(editOrder.id, {
        clientName: editForm.clientName.trim(),
        phone: editForm.phone.trim(),
        passport: editForm.passport.trim(),
        checkOut: fromDateTimeLocal(editForm.checkOut),
        payment: editForm.payment,
        currency: editForm.currency,
        finalAmount: toMinorUnits(editForm.finalAmount || 0, editForm.currency),
        realPaidAmount: editForm.payment === "Qarz" ? 0 : toMinorUnits(editForm.realPaidAmount || 0, editForm.currency),
        overtimeAmount: toMinorUnits(editForm.overtimeAmount || 0, editForm.overtimeCurrency),
        overtimeCurrency: editForm.overtimeCurrency,
        overtimePaymentType: editForm.overtimePayment,
        note: editForm.note,
        items: asArray(editForm.items).map((item) => ({
          id: item.id,
          size: item.size,
          count: Number(item.count || 1),
        })),
      });
    } catch (error) {
      setStatusMessage(t(error.message || "Orderni tahrirlashda xatolik yuz berdi."));
      return;
    }

    setRefreshKey((value) => value + 1);
    setEditOrder(null);
    setSelectedOrder(null);
    setStatusMessage(t("Order tahrirlandi. Telegram xabar yuborildi."));
  };

  const handleCloseDebt = async () => {
    const order = debtCloseOrder;
    if (!order) return;
    const updatedOrder = { ...order, debtAmount: 0 };

    try {
      await baggageService.closeDebt(order.id, {
        amount: order.debtAmount,
        payment: debtClosePayment,
        currency: order.currency,
        admin: "Admin",
        note: "Debt closed from sales history",
      });
    } catch (error) {
      setStatusMessage(t(error.message || "Qarz yopishda xatolik yuz berdi."));
      return;
    }

    setSelectedOrder(updatedOrder);
    setDebtCloseOrder(null);
    setRefreshKey((value) => value + 1);

    try {
      await telegramService.sendDebtClosed(updatedOrder);
      setStatusMessage(t("Qarz yopildi"));
    } catch {
      setStatusMessage(t("Qarz yopildi. Telegram yuborilmadi"));
    }
  };

  return (
    <section className="page sales-history-page">
      <div className="page-header compact-header">
        <div>
          <h1>{t("Savdo tarixi")}</h1>
          <p>{t("Orderlar, paymentlar, statuslar va pickup history")}</p>
        </div>

        <button
          className="history-date-btn"
          type="button"
          onClick={handleRefresh}
        >
          <CalendarDays size={17} />
          {t("Refresh local data")}
        </button>
      </div>

      {statusMessage && <div className="history-status-message">{statusMessage}</div>}

      {selectedOrder && (
        <div
          className="order-modal-backdrop"
          onClick={() => {
            setSelectedOrder(null);

            if (orderIdFromUrl) {
              setSearchParams({});
            }
          }}
        >
          <div className="order-modal card" onClick={(event) => event.stopPropagation()}>
            <div className="order-modal-head">
              <div>
                <h2>{selectedOrder.orderNumber || "-"}</h2>
                <p>
                  {selectedOrder.client} - {selectedOrder.phone}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedOrder(null);

                  if (orderIdFromUrl) {
                    setSearchParams({});
                  }
                }}
              >
                {t("Close")}
              </button>
            </div>

            <div className="order-modal-grid">
              <div>
                <span>{t("Filial")}</span>
                <b>{t(selectedOrder.branch)}</b>
              </div>

              <div>
                <span>{t("Passport")}</span>
                <b>{selectedOrder.passport || "-"}</b>
              </div>

              <div>
                <span>{t("Size")}</span>
                <b>{lockerLabel(selectedOrder)}</b>
              </div>

              <div>
                <span>{t("Yacheyka narxlari")}</span>
                <b>{lockerPriceLabel(selectedOrder, t)}</b>
              </div>

              <div>
                <span>{t("Count")}</span>
                <b>{selectedOrder.count} {t("ta")}</b>
              </div>

              <div>
                <span>{t("Payment")}</span>
                <b>{t(getPaymentLabel(selectedOrder.payment))} / {selectedOrder.currency || "UZS"}</b>
              </div>

              <div>
                <span>{t("Status")}</span>
                <b>{t(selectedOrder.status)}</b>
              </div>

              <div>
                <span>{t("Check-in")}</span>
                <b>{formatDateTime(selectedOrder.checkIn)}</b>
              </div>

              <div>
                <span>{t("Check-out")}</span>
                <b>{formatDateTime(selectedOrder.checkOut)}</b>
              </div>

              <div>
                <span>{t("Base price")}</span>
                <b>{formatCurrency(selectedOrder, selectedOrder.calculatedAmount || selectedOrder.originalPrice || selectedOrder.finalPrice)}</b>
              </div>

              <div>
                <span>{t("Real paid")}</span>
                <b>{formatCurrency(selectedOrder, selectedOrder.realPaidAmount || selectedOrder.finalPrice)}</b>
              </div>

              <div>
                <span>{t("Difference")}</span>
                <b>{formatCurrency(selectedOrder, selectedOrder.difference)}</b>
              </div>

              <div>
                <span>{t("Qarz")}</span>
                <b>{formatCurrency(selectedOrder, selectedOrder.debtAmount)}</b>
              </div>

              <div>
                <span>{t("Overtime")}</span>
                <b>{formatCurrency(selectedOrder, selectedOrder.overtimeAmount, overtimeCurrency(selectedOrder))}</b>
              </div>

              <div>
                <span>{t("Total")}</span>
                <b>{formatCurrency(selectedOrder, getTotalPrice(selectedOrder))}</b>
              </div>

              <div>
                <span>{t("Pickup time")}</span>
                <b>
                  {selectedOrder.realPickupTime
                    ? formatDateTime(selectedOrder.realPickupTime)
                    : "-"}
                </b>
              </div>

              <div>
                <span>{t("Reprint")}</span>
                <b>
                  {selectedOrder.reprintCount || 0} {t("marta")}
                </b>
              </div>

              <div>
                <span>{t("Created")}</span>
                <b>{formatDateTime(selectedOrder.createdAt)}</b>
              </div>

              <div>
                <span>{t("Cancel reason")}</span>
                <b>{selectedOrder.cancelReason || "-"}</b>
              </div>

              <div>
                <span>{t("Cancelled")}</span>
                <b>
                  {selectedOrder.cancelledAt
                    ? formatDateTime(selectedOrder.cancelledAt)
                    : "-"}
                </b>
              </div>
            </div>

            {selectedOrder.note && (
              <div className="order-modal-note">
                <span>{t("Note")}</span>
                <p>{selectedOrder.note}</p>
              </div>
            )}

            {Number(selectedOrder.debtAmount || 0) > 0 && (
              <button
                type="button"
                className="history-debt-close"
                onClick={() => openCloseDebt(selectedOrder)}
              >
                {t("Qarz yopish")}
              </button>
            )}
          </div>
        </div>
      )}

      {editOrder && editForm && (
        <div className="order-modal-backdrop" onClick={() => setEditOrder(null)}>
          <div className="order-modal history-edit-modal card" onClick={(event) => event.stopPropagation()}>
            <div className="order-modal-head">
              <div>
                <h2>{t("Orderni tahrirlash")}</h2>
                <p>{editOrder.orderNumber || "-"} - {editOrder.client}</p>
              </div>
              <button type="button" onClick={() => setEditOrder(null)}>{t("Close")}</button>
            </div>

            <div className="history-edit-grid">
              <label>
                <span>{t("Client")}</span>
                <input value={editForm.clientName} onChange={(event) => updateEditForm("clientName", event.target.value)} />
              </label>
              <label>
                <span>{t("Phone")}</span>
                <input value={editForm.phone} onChange={(event) => updateEditForm("phone", event.target.value)} />
              </label>
              <label>
                <span>{t("Passport")}</span>
                <input value={editForm.passport} onChange={(event) => updateEditForm("passport", event.target.value)} />
              </label>
              <label>
                <span>{t("Check-out")}</span>
                <input type="datetime-local" value={editForm.checkOut} onChange={(event) => updateEditForm("checkOut", event.target.value)} />
              </label>
              <label>
                <span>{t("To'lov turi")}</span>
                <GlassSelect value={editForm.payment} onChange={(event) => updateEditForm("payment", event.target.value)}>
                  {PAYMENT_OPTIONS.map((option) => (
                    <option value={option.value} key={option.value}>{t(option.label)}</option>
                  ))}
                </GlassSelect>
              </label>
              <label>
                <span>{t("Currency")}</span>
                <GlassSelect value={editForm.currency} onChange={(event) => updateEditForm("currency", event.target.value)}>
                  <option value="UZS">UZS</option>
                  <option value="USD">USD</option>
                  <option value="RUB">RUB</option>
                  <option value="EUR">EUR</option>
                  <option value="KZT">KZT</option>
                  <option value="TJS">TJS</option>
                </GlassSelect>
              </label>
              <label>
                <span>{t("Summa")}</span>
                <input
                  inputMode={editForm.currency === "UZS" ? "numeric" : "decimal"}
                  value={formatNumberInput(editForm.finalAmount, { decimal: editForm.currency !== "UZS" })}
                  onChange={(event) => updateEditForm("finalAmount", cleanNumericInput(event.target.value, { decimal: editForm.currency !== "UZS" }))}
                />
              </label>
              <label>
                <span>{t("Real paid")}</span>
                <input
                  inputMode={editForm.currency === "UZS" ? "numeric" : "decimal"}
                  value={formatNumberInput(editForm.payment === "Qarz" ? "0" : editForm.realPaidAmount, { decimal: editForm.currency !== "UZS" })}
                  disabled={editForm.payment === "Qarz"}
                  onChange={(event) => updateEditForm("realPaidAmount", cleanNumericInput(event.target.value, { decimal: editForm.currency !== "UZS" }))}
                />
              </label>
              <label>
                <span>{t("Qo'shimcha to'lov")}</span>
                <input
                  inputMode={editForm.overtimeCurrency === "UZS" ? "numeric" : "decimal"}
                  value={formatNumberInput(editForm.overtimeAmount, { decimal: editForm.overtimeCurrency !== "UZS" })}
                  onChange={(event) => updateEditForm("overtimeAmount", cleanNumericInput(event.target.value, { decimal: editForm.overtimeCurrency !== "UZS" }))}
                />
              </label>
              <label>
                <span>{t("Qo'shimcha valyuta")}</span>
                <GlassSelect value={editForm.overtimeCurrency} onChange={(event) => updateEditForm("overtimeCurrency", event.target.value)}>
                  <option value="UZS">UZS</option>
                  <option value="USD">USD</option>
                  <option value="RUB">RUB</option>
                  <option value="EUR">EUR</option>
                  <option value="KZT">KZT</option>
                  <option value="TJS">TJS</option>
                </GlassSelect>
              </label>
              <label>
                <span>{t("Qo'shimcha to'lov turi")}</span>
                <GlassSelect value={editForm.overtimePayment} onChange={(event) => updateEditForm("overtimePayment", event.target.value)}>
                  {PAYMENT_OPTIONS.filter((option) => option.value !== "Qarz").map((option) => (
                    <option value={option.value} key={option.value}>{t(option.label)}</option>
                  ))}
                </GlassSelect>
              </label>
              <label className="full">
                <span>{t("Note")}</span>
                <textarea value={editForm.note} onChange={(event) => updateEditForm("note", event.target.value)} />
              </label>
            </div>

            {asArray(editForm.items).length > 0 && (
              <div className="history-edit-items">
                {asArray(editForm.items).map((item, index) => (
                  <div className="history-edit-item" key={item.id || index}>
                    <label>
                      <span>{t("Size")}</span>
                      <GlassSelect value={item.size || "S"} onChange={(event) => updateEditItem(index, "size", event.target.value)}>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                      </GlassSelect>
                    </label>
                    <label>
                      <span>{t("Soni")}</span>
                      <input inputMode="numeric" value={item.count} onChange={(event) => updateEditItem(index, "count", cleanNumericInput(event.target.value))} />
                    </label>
                  </div>
                ))}
              </div>
            )}

            <button type="button" className="history-save-edit" onClick={handleSaveEdit}>
              <Edit3 size={17} />
              {t("Saqlash")}
            </button>
          </div>
        </div>
      )}

      {debtCloseOrder && (
        <div className="order-modal-backdrop" onClick={() => setDebtCloseOrder(null)}>
          <div className="order-modal card" onClick={(event) => event.stopPropagation()}>
            <div className="order-modal-head">
              <div>
                <h2>{t("Qarz yopish")}</h2>
                <p>{debtCloseOrder.orderNumber || "-"} - {debtCloseOrder.client}</p>
              </div>
              <button type="button" onClick={() => setDebtCloseOrder(null)}>{t("Close")}</button>
            </div>
            <label className="history-debt-payment">
              <span>{t("To'lov turi")}</span>
              <GlassSelect value={debtClosePayment} onChange={(event) => setDebtClosePayment(event.target.value)}>
                {PAYMENT_OPTIONS.filter((option) => option.value !== "Qarz").map((option) => (
                  <option value={option.value} key={option.value}>{t(option.label)}</option>
                ))}
              </GlassSelect>
            </label>
            <button type="button" className="history-debt-close" onClick={handleCloseDebt}>
              {t("Qarz yopish")}
            </button>
          </div>
        </div>
      )}

      <div className="history-toolbar card">
        <div className="history-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Order ID, telefon yoki klient ismi...")}
          />
        </div>

        <div className="history-filters">
          <GlassSelect
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            disabled={Boolean(effectiveBranch)}
          >
            <option value="Barcha filiallar">{t("Barcha filiallar")}</option>
            {(effectiveBranch ? [effectiveBranch] : branchNames).map((item) => (
              <option key={item} value={item}>
                {t(item)}
              </option>
            ))}
          </GlassSelect>

          <GlassSelect value={payment} onChange={(e) => setPayment(e.target.value)}>
            <option value="Payment">{t("Payment")}</option>
            {PAYMENT_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>{t(option.label)}</option>
            ))}
          </GlassSelect>

          <GlassSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="Status">{t("Status")}</option>
            <option value="Aktiv">{t("Aktiv")}</option>
            <option value="Olib ketildi">{t("Olib ketildi")}</option>
            <option value="Kechikdi">{t("Kechikdi")}</option>
            <option value="Bekor qilindi">{t("Bekor qilindi")}</option>
          </GlassSelect>
        </div>
      </div>

      <div className="history-table card">
        <div className="history-table-head">
          <span>{t("Order")}</span>
          <span>{t("Client")}</span>
          <span>{t("Filial")}</span>
          <span>{t("Bagaj")}</span>
          <span>{t("Payment")}</span>
          <span>{t("Pickup")}</span>
          <span>{t("Status")}</span>
          <span></span>
        </div>

        <div className="history-table-body">
          {error && (
            <StateBlock
              type="error"
              title={t("Savdo tarixi yuklanmadi")}
              description={t("Order tarixini o'qishda xatolik yuz berdi.")}
              actionLabel={t("Qayta urinish")}
              onAction={retry}
            />
          )}

          {isLoading && !error && <TableSkeleton rows={6} columns={8} />}

          {!isLoading && !error && filteredOrders.length === 0 && (
            <StateBlock
              type={hasActiveFilters ? "search" : "empty"}
              title={
                hasActiveFilters
                  ? t("Filter bo'yicha order topilmadi")
                  : t("Savdo tarixi bo'sh")
              }
              description={
                hasActiveFilters
                  ? t("Qidiruv, payment yoki status filterlarini o'zgartirib ko'ring.")
                  : t("Yaratilgan orderlar shu yerda ko'rinadi.")
              }
            />
          )}

          {!isLoading && !error && filteredOrders.map((item) => (
            <div className="history-table-row" key={item.id}>
              <div data-label={t("Order")}>
                <b>{item.orderNumber || "-"}</b>
                <small>{formatDateTime(item.createdAt)}</small>
              </div>

              <div data-label={t("Client")}>
                <b>{item.client}</b>
                <small>{item.phone}</small>
              </div>

              <div data-label={t("Filial")}>
                <b>{t(item.branch)}</b>
                <small>{item.passport || "-"}</small>
              </div>

              <div data-label={t("Bagaj")}>
                <span>
                  {lockerLabel(item)}
                </span>
                <small>{formatDateTime(item.checkOut)}</small>
              </div>

              <div data-label={t("Payment")}>
                <b>{formatCurrency(item, getTotalPrice(item))}</b>
                <small>{t(getPaymentLabel(item.payment))}</small>
              </div>

              <div data-label={t("Pickup")}>
                <span>
                  {item.realPickupTime
                    ? formatDateTime(item.realPickupTime)
                    : "-"}
                </span>
                <small>{t("Overtime")}: {formatCurrency(item, item.overtimeAmount, overtimeCurrency(item))}</small>
              </div>

              <div data-label={t("Status")}>
                <span
                  className={
                    item.status === "Bekor qilindi" ||
                    item.status === "Kechikdi"
                      ? "history-status danger"
                      : "history-status success"
                  }
                >
                  {t(item.status)}
                </span>
              </div>

              <div data-label={t("Action")}>
                {item.status !== "Bekor qilindi" && (
                  <button
                    type="button"
                    className="view-btn edit"
                    onClick={() => openEdit(item)}
                    title={t("Edit")}
                  >
                    <Edit3 size={16} />
                  </button>
                )}
                <button
                  type="button"
                  className="view-btn"
                  onClick={() => setSelectedOrder(item)}
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
