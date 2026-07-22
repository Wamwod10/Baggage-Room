import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Clock3,
  Edit3,
  Eye,
  MoveRight,
  Printer,
  Search,
  Send,
  XCircle,
} from "lucide-react";
import baggageService from "../../services/baggageService";
import lockerService from "../../services/lockerService";
import { useAuth } from "../../store/AuthContext";
import { getBranchNames } from "../../utils/branches";
import StateBlock from "../../components/StateBlock/StateBlock";
import { TableSkeleton } from "../../components/Skeleton/Skeleton";
import GlassSelect from "../../components/GlassSelect/GlassSelect";
import usePageResource from "../../hooks/usePageResource";
import { useTranslation } from "../../i18n/useTranslation";
import { animateButtonIcon } from "../../utils/animateButtonIcon";
import ReceiptPreview from "../../components/ReceiptPreview/ReceiptPreview";
import { formatMoneyByCurrency, fromMinorUnits, toMinorUnits } from "../../utils/currency";
import { cleanNumericInput, formatNumberInput } from "../../utils/inputFormat";
import { PAYMENT_OPTIONS, getPaymentLabel } from "../../utils/paymentLabels";
import "./activeBaggage.scss";

const formatCurrency = (value, currency) =>
  formatMoneyByCurrency(value, currency);
const overtimeCurrency = (order = {}) => order.overtimeCurrency || order.currency || "UZS";

const hasLockerPrice = (locker) =>
  locker?.price !== undefined &&
  locker?.price !== null &&
  locker?.price !== "" &&
    Number.isFinite(Number(locker.price));

const asArray = (value) => (Array.isArray(value) ? value : []);

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

const lockerPriceLabel = (order, t) => {
  const lockers = Array.isArray(order.lockers) ? order.lockers : [];

  if (!lockers.length) return "-";

  return lockers
    .map((locker) => {
      const price = hasLockerPrice(locker)
        ? formatCurrency(locker.price, locker.currency || order.currency)
        : t("Narx topilmadi");

      return `#${locker.number} / ${locker.size} x${locker.count || 1}: ${price}`;
    })
    .join("; ");
};

const getPickupExpectedTotal = (order = {}) => {
  const basePayable = Number(
    order.finalAmount ??
      order.finalPrice ??
      order.realPaidAmount ??
      order.calculatedAmount ??
      0,
  );
  const previousPaid = order.payment === "Qarz" ? 0 : Number(order.realPaidAmount || basePayable);

  return previousPaid + Number(order.overtimeAmount || 0);
};

export default function ActiveBaggage() {
  const { t, formatDateTime } = useTranslation();
  const { effectiveBranch, user } = useAuth();
  const branchNames = getBranchNames();
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("Barcha filiallar");
  const [status, setStatus] = useState("Barcha statuslar");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [pickupOrder, setPickupOrder] = useState(null);
  const [pickupForm, setPickupForm] = useState({
    payment: "Naqd",
    overtimePayment: "Naqd",
    currency: "UZS",
    realPaidAmount: "",
    overtimeAmount: "",
    paymentReason: "",
  });
  const [debtCloseOrder, setDebtCloseOrder] = useState(null);
  const [debtClosePayment, setDebtClosePayment] = useState("Naqd");
  const [transferOrder, setTransferOrder] = useState(null);
  const [transferForm, setTransferForm] = useState({
    fromNumber: "",
    toNumber: "",
    reason: "",
  });
  const [formError, setFormError] = useState("");
  const [telegramSendingId, setTelegramSendingId] = useState("");

  const {
    data: pageData = { orders: [], lockers: [] },
    isLoading,
    error,
    retry,
  } = usePageResource(
    async () => {
      const [orders, lockers] = await Promise.all([
        baggageService.getAll(effectiveBranch),
        lockerService.getAll(effectiveBranch),
      ]);
      return { orders: asArray(orders), lockers: asArray(lockers) };
    },
    [effectiveBranch, refreshKey],
    { orders: [], lockers: [] },
  );

  useEffect(() => {
    if (!selectedOrder && !editOrder && !receiptOrder && !cancelOrder && !pickupOrder && !transferOrder && !debtCloseOrder) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedOrder(null);
        setEditOrder(null);
        setReceiptOrder(null);
        setCancelOrder(null);
        setPickupOrder(null);
        setTransferOrder(null);
        setDebtCloseOrder(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [selectedOrder, editOrder, receiptOrder, cancelOrder, pickupOrder, transferOrder, debtCloseOrder]);

  const safePageData = pageData && typeof pageData === "object" ? pageData : { orders: [], lockers: [] };
  const pageOrders = asArray(safePageData.orders);
  const pageLockers = asArray(safePageData.lockers);

  const rawActiveOrders = useMemo(() => {
    return pageOrders.filter(
      (order) =>
        order.status === "Aktiv" ||
        order.status === "Kechikdi" ||
        Number(order.debtAmount || 0) > 0,
    );
  }, [pageOrders]);

  const activeOrders = useMemo(() => {
    return asArray(rawActiveOrders).filter((order) => {
      const query = search.toLowerCase();
      const lockerText = asArray(order.lockers).map((locker) => locker.number).join(" ");

      const matchSearch =
        String(order.orderNumber || "").toLowerCase().includes(query) ||
        String(order.client || "").toLowerCase().includes(query) ||
        String(order.phone || "").toLowerCase().includes(query) ||
        lockerText.includes(query);

      const matchBranch = effectiveBranch
        ? order.branch === effectiveBranch
        : branch === "Barcha filiallar" || order.branch === branch;

      const matchStatus =
        status === "Barcha statuslar" ||
        order.status === status ||
        (status === "Qarz" && Number(order.debtAmount || 0) > 0);

      return matchSearch && matchBranch && matchStatus;
    });
  }, [rawActiveOrders, search, branch, status, effectiveBranch]);

  const handleRefresh = (event) => {
    animateButtonIcon(event);
    setRefreshKey((value) => value + 1);
  };

  const openPickup = (order) => {
    setPickupOrder(order);
    setPickupForm({
      payment: order.payment === "Qarz" ? "Naqd" : getPaymentLabel(order.payment),
      overtimePayment: order.payment === "Qarz" ? "Naqd" : getPaymentLabel(order.payment),
      currency: order.currency || "UZS",
      realPaidAmount: String(fromMinorUnits(getPickupExpectedTotal(order), order.currency || "UZS")),
      overtimeAmount: String(fromMinorUnits(order.overtimeAmount || 0, order.currency || "UZS")),
      paymentReason: "",
    });
    setFormError("");
  };

  const handlePickup = async () => {
    if (!pickupOrder) return;

    if (Number(pickupForm.realPaidAmount || 0) < 0) {
      setFormError(t("Summa manfiy bo'lishi mumkin emas."));
      return;
    }

    const overtimeMinor = toMinorUnits(pickupForm.overtimeAmount || 0, pickupForm.currency || pickupOrder.currency || "UZS");
    const expectedPaidTotal =
      getPickupExpectedTotal({ ...pickupOrder, overtimeAmount: 0 }) +
      (pickupForm.overtimePayment === "Qarz" ? 0 : overtimeMinor);

    if (
      toMinorUnits(pickupForm.realPaidAmount || 0, pickupForm.currency || pickupOrder.currency || "UZS") !== expectedPaidTotal &&
      !pickupForm.paymentReason.trim()
    ) {
      setFormError(t("Summani o'zgartirish sababini kiriting."));
      return;
    }

    try {
      await baggageService.pickup(pickupOrder.id, {
        ...pickupForm,
        overtimeAmount: overtimeMinor,
        debtPaidAmount: pickupOrder.debtAmount || undefined,
        admin: user?.fullName,
      });
    } catch (error) {
      setFormError(t(error.message || "Pickup tasdiqlashda xatolik yuz berdi."));
      return;
    }

    setRefreshKey((value) => value + 1);
    setPickupOrder(null);
    setSelectedOrder(null);
  };

  const openCloseDebt = (order) => {
    setDebtCloseOrder(order);
    setDebtClosePayment("Naqd");
    setFormError("");
  };

  const handleCloseDebt = async () => {
    const order = debtCloseOrder;
    if (!order) return;
    try {
      await baggageService.closeDebt(order.id, {
        amount: order.debtAmount,
        payment: debtClosePayment,
        currency: order.currency,
        admin: user?.fullName,
        note: "Debt closed from active baggage",
      });
    } catch (error) {
      setFormError(t(error.message || "Qarz yopishda xatolik yuz berdi."));
      return;
    }
    setDebtCloseOrder(null);
    setRefreshKey((value) => value + 1);
  };

  const handleCancel = (order) => {
    setCancelOrder(order);
    setCancelReason("");
    setFormError("");
  };

  const openEdit = (order) => {
    setEditOrder(order);
    setEditForm({
      clientName: order.client || "",
      phone: order.phone || "",
      passport: order.passport || "",
      checkOut: toDateTimeLocal(order.checkOut),
      payment: getPaymentLabel(order.payment),
      currency: order.currency || "UZS",
      finalAmount: String(fromMinorUnits(order.finalAmount || order.finalPrice || 0, order.currency || "UZS")),
      realPaidAmount: String(fromMinorUnits(order.realPaidAmount || 0, order.currency || "UZS")),
      note: order.note || "",
      items: asArray(order.lockers).map((locker) => ({
        id: locker.itemId || locker.id,
        lockerId: locker.lockerId,
        number: locker.number,
        size: locker.size,
        count: String(locker.count || 1),
      })),
    });
    setFormError("");
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
      setFormError(t("Client va telefon majburiy."));
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
        note: editForm.note,
        items: asArray(editForm.items).map((item) => ({
          id: item.id,
          lockerId: item.lockerId,
          size: item.size,
          count: Number(item.count || 1),
        })),
      });
    } catch (error) {
      setFormError(t(error.message || "Orderni tahrirlashda xatolik yuz berdi."));
      return;
    }
    setRefreshKey((value) => value + 1);
    setEditOrder(null);
    setSelectedOrder(null);
  };

  const handleConfirmCancel = async () => {
    if (!cancelOrder) return;

    if (!cancelReason.trim()) {
      setFormError(t("Bekor qilish sababini kiriting."));
      return;
    }

    try {
      await baggageService.cancel(cancelOrder.id, cancelReason.trim());
    } catch (error) {
      setFormError(t(error.message || "Orderni bekor qilishda xatolik yuz berdi."));
      return;
    }

    setRefreshKey((value) => value + 1);
    setSelectedOrder(null);
    setCancelOrder(null);
    setCancelReason("");
  };

  const handleReprint = async (orderId) => {
    let order;
    try {
      order = await baggageService.reprint(orderId);
    } catch (error) {
      setFormError(t(error.message || "Chekni qayta chiqarishda xatolik yuz berdi."));
      return;
    }

    setRefreshKey((value) => value + 1);
    setReceiptOrder(order);
  };

  const openTransfer = (order) => {
    const orderLockers = asArray(order.lockers);
    const firstLocker = orderLockers[0];
    setTransferOrder(order);
    setTransferForm({
      fromNumber: String(firstLocker?.number || ""),
      toNumber: "",
      reason: "",
    });
    setFormError("");
  };

  const transferTargets = useMemo(() => {
    if (!transferOrder) return [];
    return pageLockers.filter(
      (locker) =>
        locker.branch === transferOrder.branch &&
        locker.status === "Bosh",
    );
  }, [pageLockers, transferOrder]);

  const editLockerOptions = useMemo(() => {
    if (!editOrder) return [];
    const currentLockerIds = new Set(asArray(editOrder.lockers).map((locker) => locker.lockerId));
    return pageLockers.filter(
      (locker) =>
        locker.branch === editOrder.branch &&
        (locker.status === "Bosh" || currentLockerIds.has(locker.id)),
    );
  }, [editOrder, pageLockers]);

  const handleTransfer = async () => {
    if (!transferOrder) return;

    if (!transferForm.fromNumber || !transferForm.toNumber || !transferForm.reason.trim()) {
      setFormError(t("Old, New va sabab maydonlarini to'ldiring."));
      return;
    }

    try {
      await baggageService.transfer(transferOrder.id, {
        ...transferForm,
        admin: user?.fullName || "Admin",
      });
    } catch (error) {
      setFormError(t(error.message || "Transfer saqlashda xatolik yuz berdi."));
      return;
    }
    setRefreshKey((value) => value + 1);
    setTransferOrder(null);
  };

  const handleSendTelegram = async (order) => {
    if (!order?.id || telegramSendingId) return;
    setTelegramSendingId(order.id);
    setFormError("");
    try {
      await baggageService.sendTelegram(order.id);
      setFormError(`${order.orderNumber || "-"} ${t("Telegram xabar yuborildi.")}`);
    } catch (error) {
      setFormError(t(error.message || "Telegram bilan ulanishda xatolik yuz berdi"));
    } finally {
      setTelegramSendingId("");
    }
  };

  const getTotalPrice = (order) =>
    order.status === "Aktiv" || order.status === "Kechikdi"
      ? getPickupExpectedTotal(order)
      : order.realPaidAmount !== undefined && order.realPaidAmount !== null
      ? Number(order.realPaidAmount || 0)
      : Number(order.finalPrice || 0) + Number(order.overtimeAmount || 0);

  const lockerLabel = (order) =>
    asArray(order.lockers).map((locker) => `#${locker.number} ${locker.size} x${locker.count || 1}`).join(", ") ||
    `${order.size} / ${order.count} ${t("ta")}`;

  return (
    <section className="page active-baggage-page">
      <div className="page-header compact-header">
        <div>
          <h1>{t("Aktiv baggage")}</h1>
          <p>{t("Aktiv, kechikkan va qarzdor orderlar nazorati")}</p>
        </div>

        <button className="page-action-btn" onClick={handleRefresh}>
          <Clock3 size={17} />
          {t("Refresh")}
        </button>
      </div>

      {formError && <div className="form-error active-form-error">{formError}</div>}

      <div className="active-toolbar card">
        <div className="active-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Order ID, ism, telefon yoki yacheyka...")}
          />
        </div>

        <div className="active-filters">
          <GlassSelect value={branch} onChange={(e) => setBranch(e.target.value)} disabled={Boolean(effectiveBranch)}>
            <option value="Barcha filiallar">{t("Barcha filiallar")}</option>
            {(effectiveBranch ? [effectiveBranch] : branchNames).map((item) => (
              <option key={item} value={item}>
                {t(item)}
              </option>
            ))}
          </GlassSelect>

          <GlassSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="Barcha statuslar">{t("Barcha statuslar")}</option>
            <option value="Aktiv">{t("Aktiv")}</option>
            <option value="Kechikdi">{t("Kechikdi")}</option>
            <option value="Qarz">{t("Qarz")}</option>
          </GlassSelect>
        </div>
      </div>

      <div className="active-table card">
        <div className="active-table-head">
          <span>{t("Order")}</span>
          <span>{t("Client")}</span>
          <span>{t("Filial")}</span>
          <span>{t("Yacheykalar")}</span>
          <span>{t("Tarif tugashi")}</span>
          <span>{t("Narx")}</span>
          <span>{t("Status")}</span>
          <span>{t("Action")}</span>
        </div>

        <div className="active-table-body">
          {error && (
            <StateBlock
              type="error"
              title={t("Aktiv baggage yuklanmadi")}
              description={t("Order ma'lumotlarini o'qishda xatolik yuz berdi.")}
              actionLabel={t("Qayta urinish")}
              onAction={retry}
            />
          )}

          {isLoading && !error && <TableSkeleton rows={5} columns={8} />}

          {!isLoading && !error && activeOrders.length === 0 && (
            <StateBlock
              type={rawActiveOrders.length > 0 ? "search" : "baggage"}
              title={rawActiveOrders.length > 0 ? t("Filter bo'yicha aktiv baggage topilmadi") : t("Aktiv baggage yo'q")}
              description={
                rawActiveOrders.length > 0
                  ? t("Qidiruv, filial yoki status filterlarini yengillashtirib ko'ring.")
                  : t("Hozircha saqlanayotgan yoki pickup kutilayotgan order mavjud emas.")
              }
            />
          )}

          {!isLoading &&
            !error &&
            activeOrders.map((order) => (
              <div className="active-table-row" key={order.id}>
                <div data-label={t("Order")}>
                  <b>{order.orderNumber || "-"}</b>
                  <small>{formatDateTime(order.checkIn)}</small>
                </div>

                <div data-label={t("Client")}>
                  <b>{order.client}</b>
                  <small>{order.phone}</small>
                </div>

                <div data-label={t("Filial")}>
                  <span>{t(order.branch)}</span>
                </div>

                <div data-label={t("Bagaj")}>
                  <span>{lockerLabel(order)}</span>
                  <small>
                    {order.count || asArray(order.lockers).reduce((total, locker) => total + Number(locker.count || 1), 0) || 1} {t("ta")}
                  </small>
                </div>

                <div data-label={t("Check-out")}>
                  <span>{formatDateTime(order.checkOut)}</span>
                </div>

                <div data-label={t("Narx")}>
                  <b>{formatCurrency(getTotalPrice(order), order.currency)}</b>
                  <small>
                    {t("Overtime")}: {formatCurrency(order.overtimeAmount, overtimeCurrency(order))}
                  </small>
                  {Number(order.debtAmount || 0) > 0 && (
                    <small className="debt-line">
                      {t("Qarz")}: {formatCurrency(order.debtAmount, order.currency)}
                    </small>
                  )}
                </div>

                <div data-label={t("Status")}>
                  <span className={order.status === "Kechikdi" ? "status-pill danger" : "status-pill success"}>
                    {Number(order.debtAmount || 0) > 0 ? t("Qarz") : t(order.status)}
                  </span>
                </div>

                <div className="row-actions" data-label={t("Action")}>
                  <button type="button" className="icon-action view" onClick={() => setSelectedOrder(order)}>
                    <Eye size={16} />
                  </button>
                  <button type="button" className="icon-action edit" onClick={() => openEdit(order)} title="Edit">
                    <Edit3 size={16} />
                  </button>
                  <button type="button" className="icon-action print" onClick={() => handleReprint(order.id)}>
                    <Printer size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-action telegram"
                    onClick={() => handleSendTelegram(order)}
                    disabled={telegramSendingId === order.id}
                    title="Telegram"
                  >
                    <Send size={16} />
                  </button>
                  {(order.status === "Aktiv" || order.status === "Kechikdi") && (
                    <>
                      <button type="button" className="icon-action transfer" onClick={() => openTransfer(order)}>
                        <MoveRight size={16} />
                      </button>
                      <button type="button" className="icon-action pickup" onClick={() => openPickup(order)}>
                        <CheckCircle size={16} />
                      </button>
                      <button type="button" className="icon-action cancel" onClick={() => handleCancel(order)}>
                        <XCircle size={16} />
                      </button>
                    </>
                  )}
                  {Number(order.debtAmount || 0) > 0 && (
                    <button type="button" className="debt-close-btn" onClick={() => openCloseDebt(order)}>
                      {t("Qarz yopish")}
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {selectedOrder && (
        <div className="active-modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="active-modal card" onClick={(event) => event.stopPropagation()}>
            <div className="active-modal-head">
              <div>
                <h2>{selectedOrder.orderNumber || "-"}</h2>
                <p>
                  {selectedOrder.client} - {selectedOrder.phone}
                </p>
              </div>

              <button type="button" onClick={() => setSelectedOrder(null)}>
                {t("Close")}
              </button>
            </div>

            <div className="active-modal-grid">
              <div><span>{t("Filial")}</span><b>{t(selectedOrder.branch)}</b></div>
              <div><span>{t("Passport")}</span><b>{selectedOrder.passport || "-"}</b></div>
              <div><span>{t("Yacheykalar")}</span><b>{lockerLabel(selectedOrder)}</b></div>
              <div><span>{t("Yacheyka narxlari")}</span><b>{lockerPriceLabel(selectedOrder, t)}</b></div>
              <div><span>{t("Payment")}</span><b>{t(getPaymentLabel(selectedOrder.payment))}</b></div>
              <div><span>{t("Currency")}</span><b>{selectedOrder.currency}</b></div>
              <div><span>{t("Status")}</span><b>{t(selectedOrder.status)}</b></div>
              <div><span>{t("Check-in")}</span><b>{formatDateTime(selectedOrder.checkIn)}</b></div>
              <div><span>{t("Check-out")}</span><b>{formatDateTime(selectedOrder.checkOut)}</b></div>
              <div><span>{t("Original price")}</span><b>{formatCurrency(selectedOrder.originalPrice || selectedOrder.calculatedAmount, selectedOrder.currency)}</b></div>
              <div><span>{t("Discount")}</span><b>{formatCurrency(selectedOrder.discount, selectedOrder.currency)}</b></div>
              <div><span>{t("Real paid")}</span><b>{formatCurrency(selectedOrder.realPaidAmount, selectedOrder.currency)}</b></div>
              <div><span>{t("Difference")}</span><b>{formatCurrency(selectedOrder.difference, selectedOrder.currency)}</b></div>
              <div><span>{t("Qarz")}</span><b>{formatCurrency(selectedOrder.debtAmount, selectedOrder.currency)}</b></div>
              <div><span>{t("Pickup time")}</span><b>{formatDateTime(selectedOrder.realPickupTime)}</b></div>
            </div>

            {selectedOrder.note && (
              <div className="active-modal-note">
                <span>{t("Note")}</span>
                <p>{selectedOrder.note}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {editOrder && editForm && (
        <div className="active-modal-backdrop" onClick={() => setEditOrder(null)}>
          <div className="active-modal card edit-modal" onClick={(event) => event.stopPropagation()}>
            <div className="active-modal-head">
              <div>
                <h2>{t("Orderni tahrirlash")}</h2>
                <p>{editOrder.orderNumber || "-"} - {editOrder.client}</p>
              </div>
              <button type="button" onClick={() => setEditOrder(null)}>{t("Close")}</button>
            </div>

            <div className="edit-form-grid">
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
              <label className="full">
                <span>{t("Note")}</span>
                <textarea value={editForm.note} onChange={(event) => updateEditForm("note", event.target.value)} />
              </label>
            </div>

            <div className="edit-items">
              {asArray(editForm.items).map((item, index) => (
                <div className="edit-item-row" key={item.id || index}>
                  <label>
                    <span>{t("Yacheyka")}</span>
                    <GlassSelect value={item.lockerId || ""} onChange={(event) => updateEditItem(index, "lockerId", event.target.value)}>
                      {editLockerOptions.map((locker) => (
                        <option key={locker.id} value={locker.id}>
                          #{locker.number} {locker.size}
                        </option>
                      ))}
                    </GlassSelect>
                  </label>
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

            <button type="button" className="pickup-confirm-btn" onClick={handleSaveEdit}>
              <Edit3 size={17} />
              {t("Saqlash")}
            </button>
          </div>
        </div>
      )}

      {pickupOrder && (
        <div className="active-modal-backdrop" onClick={() => setPickupOrder(null)}>
          <div className="active-modal card pickup-modal" onClick={(event) => event.stopPropagation()}>
              <div className="active-modal-head">
              <div>
                <h2>{t("Pickup payment")}</h2>
                <p>{pickupOrder.orderNumber || "-"} - {lockerLabel(pickupOrder)}</p>
              </div>
              <button type="button" onClick={() => setPickupOrder(null)}>{t("Close")}</button>
            </div>

            <div className="pickup-summary">
              <div>
                <span>{t("Calculated")}</span>
                <b>{formatCurrency(Number(pickupOrder.calculatedAmount || pickupOrder.finalPrice || 0), pickupOrder.currency)}</b>
              </div>
              <div>
                <span>{t("Overtime")}</span>
                <b>{formatCurrency(pickupOrder.overtimeAmount, overtimeCurrency(pickupOrder))}</b>
              </div>
              <div>
                <span>{t("Overtime soat")}</span>
                <b>{pickupOrder.overtimeHours || 0}</b>
              </div>
            </div>

            <div className="pickup-form">
              <label>
                <span>{Number(pickupOrder.debtAmount || 0) > 0 ? t("Qarz to'lovi turi") : t("To'lov turi")}</span>
                <GlassSelect value={pickupForm.payment} onChange={(event) => setPickupForm((prev) => ({ ...prev, payment: event.target.value }))}>
                  {PAYMENT_OPTIONS.map((option) => (
                    <option value={option.value} key={option.value}>{t(option.label)}</option>
                  ))}
                </GlassSelect>
              </label>
              <label>
                <span>{t("Currency")}</span>
                <GlassSelect value={pickupForm.currency} onChange={(event) => setPickupForm((prev) => ({ ...prev, currency: event.target.value }))}>
                  <option value="UZS">UZS</option>
                  <option value="USD">USD</option>
                  <option value="RUB">RUB</option>
                  <option value="EUR">EUR</option>
                  <option value="KZT">KZT</option>
                  <option value="TJS">TJS</option>
                </GlassSelect>
              </label>
              <label>
                <span>{t("Qo'shimcha to'lov")}</span>
                <input
                  inputMode={pickupForm.currency === "UZS" ? "numeric" : "decimal"}
                  value={formatNumberInput(pickupForm.overtimeAmount, { decimal: pickupForm.currency !== "UZS" })}
                  onChange={(event) =>
                    setPickupForm((prev) => ({
                      ...prev,
                      overtimeAmount: cleanNumericInput(event.target.value, { decimal: prev.currency !== "UZS" }),
                    }))
                  }
                />
              </label>
              {Number(pickupForm.overtimeAmount || 0) > 0 && (
                <label>
                  <span>{t("Qo'shimcha to'lov turi")}</span>
                  <GlassSelect value={pickupForm.overtimePayment} onChange={(event) => setPickupForm((prev) => ({ ...prev, overtimePayment: event.target.value }))}>
                    {PAYMENT_OPTIONS.map((option) => (
                      <option value={option.value} key={option.value}>{t(option.label)}</option>
                    ))}
                  </GlassSelect>
                </label>
              )}
              <label>
                <span>{t("Real olingan summa")}</span>
                <input
                  inputMode="decimal"
                  value={formatNumberInput(pickupForm.realPaidAmount, { decimal: pickupForm.currency !== "UZS" })}
                  onChange={(event) =>
                    setPickupForm((prev) => ({
                      ...prev,
                      realPaidAmount: cleanNumericInput(event.target.value, { decimal: prev.currency !== "UZS" }),
                    }))
                  }
                />
              </label>
              <label className="full">
                <span>{t("Sabab")}</span>
                <input value={pickupForm.paymentReason} onChange={(event) => setPickupForm((prev) => ({ ...prev, paymentReason: event.target.value }))} />
              </label>
            </div>

            <button type="button" className="pickup-confirm-btn" onClick={handlePickup}>
              <CheckCircle size={17} />
              {t("Pickup tasdiqlash")}
            </button>
          </div>
        </div>
      )}

      {debtCloseOrder && (
        <div className="active-modal-backdrop" onClick={() => setDebtCloseOrder(null)}>
          <div className="active-modal card cancel-modal" onClick={(event) => event.stopPropagation()}>
            <div className="active-modal-head">
              <div>
                <h2>{t("Qarz yopish")}</h2>
                <p>{debtCloseOrder.orderNumber || "-"} - {debtCloseOrder.client}</p>
              </div>
              <button type="button" onClick={() => setDebtCloseOrder(null)}>{t("Close")}</button>
            </div>
            <div className="pickup-form">
              <label className="full">
                <span>{t("To'lov turi")}</span>
                <GlassSelect value={debtClosePayment} onChange={(event) => setDebtClosePayment(event.target.value)}>
                  {PAYMENT_OPTIONS.filter((option) => option.value !== "Qarz").map((option) => (
                    <option value={option.value} key={option.value}>{t(option.label)}</option>
                  ))}
                </GlassSelect>
              </label>
            </div>
            <button type="button" className="pickup-confirm-btn" onClick={handleCloseDebt}>
              <CheckCircle size={17} />
              {t("Qarz yopish")}
            </button>
          </div>
        </div>
      )}

      {transferOrder && (
        <div className="active-modal-backdrop" onClick={() => setTransferOrder(null)}>
          <div className="active-modal card transfer-modal" onClick={(event) => event.stopPropagation()}>
            <div className="active-modal-head">
              <div>
                <h2>{t("Yacheyka transfer")}</h2>
                <p>{transferOrder.orderNumber || "-"}</p>
              </div>
              <button type="button" onClick={() => setTransferOrder(null)}>{t("Close")}</button>
            </div>

            <div className="pickup-form">
              <label>
                <span>{t("Old")}</span>
                <GlassSelect value={transferForm.fromNumber} onChange={(event) => setTransferForm((prev) => ({ ...prev, fromNumber: event.target.value, toNumber: "" }))}>
                  {[...new Map(asArray(transferOrder.lockers).map((locker) => [Number(locker.number), locker])).values()].map((locker) => (
                    <option key={locker.number} value={locker.number}>
                      #{locker.number}
                    </option>
                  ))}
                </GlassSelect>
              </label>
              <label>
                <span>{t("New")}</span>
                <GlassSelect value={transferForm.toNumber} onChange={(event) => setTransferForm((prev) => ({ ...prev, toNumber: event.target.value }))}>
                  <option value="">{t("Tanlang")}</option>
                  {transferTargets.map((locker) => (
                    <option key={locker.id} value={locker.number}>
                      #{locker.number} {locker.size}
                    </option>
                  ))}
                </GlassSelect>
              </label>
              <label className="full">
                <span>{t("Sabab")}</span>
                <input value={transferForm.reason} onChange={(event) => setTransferForm((prev) => ({ ...prev, reason: event.target.value }))} />
              </label>
            </div>

            <button type="button" className="pickup-confirm-btn" onClick={handleTransfer}>
              <MoveRight size={17} />
              {t("Transfer saqlash")}
            </button>
          </div>
        </div>
      )}

      {cancelOrder && (
        <div className="active-modal-backdrop" onClick={() => setCancelOrder(null)}>
          <div className="active-modal card cancel-modal" onClick={(event) => event.stopPropagation()}>
            <div className="active-modal-head">
              <div>
                <h2>{t("Orderni bekor qilish")}</h2>
                <p>{cancelOrder.orderNumber || "-"} - {cancelOrder.client}</p>
              </div>

              <button type="button" onClick={() => setCancelOrder(null)}>{t("Close")}</button>
            </div>

            <label className="cancel-reason-field">
              <span>{t("Bekor qilish sababi")}</span>
              <textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} />
            </label>

            <button type="button" className="cancel-confirm-btn" onClick={handleConfirmCancel}>
              {t("Bekor qilishni tasdiqlash")}
            </button>
          </div>
        </div>
      )}

      {receiptOrder && <ReceiptPreview order={receiptOrder} onClose={() => setReceiptOrder(null)} />}
    </section>
  );
}
