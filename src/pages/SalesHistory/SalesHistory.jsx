import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, Eye, Search } from "lucide-react";
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
import { formatMoneyByCurrency } from "../../utils/currency";

const hasLockerPrice = (locker) =>
  locker?.price !== undefined &&
  locker?.price !== null &&
  locker?.price !== "" &&
    Number.isFinite(Number(locker.price));
const asArray = (value) => (Array.isArray(value) ? value : []);

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
    if (!selectedOrder) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedOrder(null);

        if (orderIdFromUrl) {
          setSearchParams({});
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [orderIdFromUrl, selectedOrder, setSearchParams]);

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
        order.payment === payment ||
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
    asArray(order.lockers).map((locker) => `#${locker.number || "-"} ${locker.size || "-"}`).join(", ") ||
    `${order.size || "-"} / ${order.count || 0} ${t("ta")}`;

  const formatCurrency = (order, amount) =>
    order.currency ? formatMoneyByCurrency(amount, order.currency) : formatMoney(amount);

  const lockerPriceLabel = (order) => {
    const lockers = Array.isArray(order.lockers) ? order.lockers : [];

    if (!lockers.length) return "-";

    return lockers
      .map((locker) => {
        const price = hasLockerPrice(locker)
          ? formatMoneyByCurrency(locker.price, locker.currency || order.currency)
          : "Narx topilmadi";

        return `#${locker.number} / ${locker.size}: ${price}`;
      })
      .join("; ");
  };

  const handleCloseDebt = async (order) => {
    const updatedOrder = { ...order, debtAmount: 0 };

    try {
      await baggageService.closeDebt(order.id, {
        amount: order.debtAmount,
        payment: "Naqd",
        currency: order.currency,
        admin: "Admin",
        note: "Debt closed from sales history",
      });
    } catch (error) {
      setStatusMessage(error.message || t("Qarz yopishda xatolik yuz berdi."));
      return;
    }

    setSelectedOrder(updatedOrder);
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
                  {selectedOrder.client} · {selectedOrder.phone}
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
                <b>{lockerPriceLabel(selectedOrder)}</b>
              </div>

              <div>
                <span>{t("Count")}</span>
                <b>{selectedOrder.count} {t("ta")}</b>
              </div>

              <div>
                <span>{t("Payment")}</span>
                <b>{t(selectedOrder.payment)} / {selectedOrder.currency || "UZS"}</b>
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
                <b>{formatMoney(selectedOrder.overtimeAmount)}</b>
              </div>

              <div>
                <span>{t("Total")}</span>
                <b>{formatMoney(getTotalPrice(selectedOrder))}</b>
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
                onClick={() => handleCloseDebt(selectedOrder)}
              >
                {t("Qarz yopish")}
              </button>
            )}
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
            <option value="Naqd">{t("Naqd")}</option>
            <option value="Karta">{t("Karta")}</option>
            <option value="Click/Payme">Click/Payme</option>
            <option>O‘tkazma</option>
            <option value="Qarz">{t("Qarz")}</option>
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
              <div>
                <b>{item.orderNumber || "-"}</b>
                <small>{formatDateTime(item.createdAt)}</small>
              </div>

              <div>
                <b>{item.client}</b>
                <small>{item.phone}</small>
              </div>

              <div>
                <b>{t(item.branch)}</b>
                <small>{item.passport || "-"}</small>
              </div>

              <div>
                <span>
                  {lockerLabel(item)}
                </span>
                <small>{formatDateTime(item.checkOut)}</small>
              </div>

              <div>
                <b>{formatCurrency(item, getTotalPrice(item))}</b>
                <small>{t(item.payment)}</small>
              </div>

              <div>
                <span>
                  {item.realPickupTime
                    ? formatDateTime(item.realPickupTime)
                    : "-"}
                </span>
                <small>{t("Overtime")}: {formatMoney(item.overtimeAmount)}</small>
              </div>

              <div>
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

              <div>
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
