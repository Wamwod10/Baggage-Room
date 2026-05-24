import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Clock3,
  Eye,
  Printer,
  Search,
  XCircle,
} from "lucide-react";
import baggageService from "../../services/baggageService";
import telegramService from "../../services/telegramService";
import { printReceipt } from "../../utils/printReceipt";
import { useAuth } from "../../store/AuthContext";
import { getBranchNames } from "../../utils/branches";
import StateBlock from "../../components/StateBlock/StateBlock";
import { TableSkeleton } from "../../components/Skeleton/Skeleton";
import usePageResource from "../../hooks/usePageResource";
import { useTranslation } from "../../i18n/useTranslation";
import "./activeBaggage.scss";

export default function ActiveBaggage() {
  const { t, formatMoney, formatDateTime } = useTranslation();
  const { effectiveBranch } = useAuth();
  const branchNames = getBranchNames();
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("Barcha filiallar");
  const [status, setStatus] = useState("Barcha statuslar");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");

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

  useEffect(() => {
    if (!selectedOrder && !receiptOrder && !cancelOrder) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedOrder(null);
        setReceiptOrder(null);
        setCancelOrder(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [selectedOrder, receiptOrder, cancelOrder]);

  const rawActiveOrders = useMemo(() => {
    return orders.filter(
      (order) => order.status === "Aktiv" || order.status === "Kechikdi",
    );
  }, [orders]);

  const activeOrders = useMemo(() => {
    return orders
      .filter(
        (order) => order.status === "Aktiv" || order.status === "Kechikdi",
      )
      .filter((order) => {
        const query = search.toLowerCase();

        const matchSearch =
          String(order.id || "").toLowerCase().includes(query) ||
          String(order.client || "").toLowerCase().includes(query) ||
          String(order.phone || "").toLowerCase().includes(query);

        const matchBranch = effectiveBranch
          ? order.branch === effectiveBranch
          : branch === "Barcha filiallar" || order.branch === branch;

        const matchStatus =
          status === "Barcha statuslar" || order.status === status;

        return matchSearch && matchBranch && matchStatus;
      });
  }, [orders, search, branch, status, effectiveBranch]);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    status !== "Barcha statuslar" ||
    (!effectiveBranch && branch !== "Barcha filiallar");
  const isFilterEmpty = hasActiveFilters && rawActiveOrders.length > 0;

  const handleRefresh = () => {
    setRefreshKey((value) => value + 1);
  };

  const handlePickup = (orderId) => {
    baggageService.pickup(orderId);

    setRefreshKey((value) => value + 1);
    setSelectedOrder(null);
  };

  const handleCancel = (order) => {
    setCancelOrder(order);
    setCancelReason("");
    setCancelError("");
  };

  const handleConfirmCancel = async () => {
    if (!cancelOrder) return;

    if (!cancelReason.trim()) {
      setCancelError(t("Bekor qilish sababini kiriting."));
      return;
    }

    const updatedOrders = baggageService.cancel(cancelOrder.id, cancelReason.trim());
    const cancelledOrder =
      updatedOrders.find((order) => order.id === cancelOrder.id) || {
        ...cancelOrder,
        status: "Bekor qilindi",
        cancelReason: cancelReason.trim(),
        cancelledAt: new Date().toISOString(),
      };

    setRefreshKey((value) => value + 1);
    setSelectedOrder(null);
    setCancelOrder(null);
    setCancelReason("");
    setCancelError("");

    try {
      await telegramService.sendOrderCancelled(cancelledOrder);
    } catch (error) {
      setCancelError(
        `${t("Telegram yuborilmadi")}: ${
          error.message || t("xatolik yuz berdi")
        }.`,
      );
    }
  };

  const handleReprint = (orderId) => {
    const updated = baggageService.reprint(orderId);
    const order = updated.find((item) => item.id === orderId);

    setRefreshKey((value) => value + 1);
    setReceiptOrder(order);
  };

  const getTotalPrice = (order) => {
    return Number(order.finalPrice || 0) + Number(order.overtimeAmount || 0);
  };

  return (
    <section className="page active-baggage-page">
      <div className="page-header compact-header">
        <div>
          <h1>{t("Aktiv baggage")}</h1>
          <p>{t("Hozir saqlanayotgan va pickup kutilayotgan orderlar")}</p>
        </div>

        <button className="page-action-btn" onClick={handleRefresh}>
          <Clock3 size={17} />
          {t("Refresh")}
        </button>
      </div>

      <div className="active-toolbar card">
        <div className="active-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Order ID, ism yoki telefon orqali qidirish...")}
          />
        </div>

        <div className="active-filters">
          <select
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
          </select>

          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="Barcha statuslar">{t("Barcha statuslar")}</option>
            <option value="Aktiv">{t("Aktiv")}</option>
            <option value="Kechikdi">{t("Kechikdi")}</option>
          </select>
        </div>
      </div>

      <div className="active-table card">
        <div className="active-table-head">
          <span>{t("Order")}</span>
          <span>{t("Client")}</span>
          <span>{t("Filial")}</span>
          <span>{t("Bagaj")}</span>
          <span>{t("Check-out")}</span>
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
              type={isFilterEmpty ? "search" : "baggage"}
              title={
                isFilterEmpty
                  ? t("Filter bo'yicha aktiv baggage topilmadi")
                  : t("Aktiv baggage yo'q")
              }
              description={
                isFilterEmpty
                  ? t("Qidiruv, filial yoki status filterlarini yengillashtirib ko'ring.")
                  : t("Hozircha saqlanayotgan yoki pickup kutilayotgan order mavjud emas.")
              }
            />
          )}

          {!isLoading && !error && activeOrders.map((order) => (
            <div className="active-table-row" key={order.id}>
              <div>
                <b>{order.id}</b>
                <small>{formatDateTime(order.checkIn)}</small>
              </div>

              <div>
                <b>{order.client}</b>
                <small>{order.phone}</small>
              </div>

              <div>
                <span>{t(order.branch)}</span>
              </div>

              <div>
                <span>
                  {t(order.size)} / {order.count} {t("ta")}
                </span>
              </div>

              <div>
                <span>{formatDateTime(order.checkOut)}</span>
              </div>

              <div>
                <b>{formatMoney(getTotalPrice(order))}</b>
                <small>
                  {t("Overtime")}: {formatMoney(order.overtimeAmount)}
                </small>
              </div>

              <div>
                <span
                  className={
                    order.status === "Kechikdi"
                      ? "status-pill danger"
                      : "status-pill success"
                  }
                >
                  {t(order.status)}
                </span>
              </div>

              <div className="row-actions">
                <button
                  type="button"
                  className="icon-action view"
                  onClick={() => setSelectedOrder(order)}
                >
                  <Eye size={16} />
                </button>

                <button
                  type="button"
                  className="icon-action print"
                  onClick={() => handleReprint(order.id)}
                >
                  <Printer size={16} />
                </button>

                <button
                  type="button"
                  className="icon-action pickup"
                  onClick={() => handlePickup(order.id)}
                >
                  <CheckCircle size={16} />
                </button>

                <button
                  type="button"
                  className="icon-action cancel"
                  onClick={() => handleCancel(order)}
                >
                  <XCircle size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedOrder && (
        <div
          className="active-modal-backdrop"
          onClick={() => setSelectedOrder(null)}
        >
          <div className="active-modal card" onClick={(event) => event.stopPropagation()}>
            <div className="active-modal-head">
              <div>
                <h2>{selectedOrder.id}</h2>
                <p>
                  {selectedOrder.client} · {selectedOrder.phone}
                </p>
              </div>

              <button type="button" onClick={() => setSelectedOrder(null)}>
                {t("Close")}
              </button>
            </div>

            <div className="active-modal-grid">
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
                <b>{t(selectedOrder.size)}</b>
              </div>
              <div>
                <span>{t("Count")}</span>
                <b>{selectedOrder.count} {t("ta")}</b>
              </div>
              <div>
                <span>{t("Payment")}</span>
                <b>{t(selectedOrder.payment)}</b>
              </div>
              <div>
                <span>{t("Status")}</span>
                <b>{t(selectedOrder.status)}</b>
              </div>
              <div>
                <span>{t("Check-in")}</span>
                <b>{selectedOrder.checkIn || "-"}</b>
              </div>
              <div>
                <span>{t("Check-out")}</span>
                <b>{selectedOrder.checkOut || "-"}</b>
              </div>
              <div>
                <span>{t("Base price")}</span>
                <b>{formatMoney(selectedOrder.finalPrice)}</b>
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
                <span>{t("Reprint")}</span>
                <b>{selectedOrder.reprintCount || 0} marta</b>
              </div>
              <div>
                <span>{t("Created")}</span>
                <b>{selectedOrder.createdAt?.slice(0, 19) || "-"}</b>
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
              <div className="active-modal-note">
                <span>{t("Note")}</span>
                <p>{selectedOrder.note}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {cancelOrder && (
        <div className="active-modal-backdrop" onClick={() => setCancelOrder(null)}>
          <div
            className="active-modal card cancel-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="active-modal-head">
              <div>
                <h2>{t("Orderni bekor qilish")}</h2>
                <p>
                  {cancelOrder.id} - {cancelOrder.client}
                </p>
              </div>

              <button type="button" onClick={() => setCancelOrder(null)}>
                {t("Close")}
              </button>
            </div>

            <label className="cancel-reason-field">
              <span>{t("Bekor qilish sababi")}</span>
              <textarea
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder={t("Masalan: mijoz orderni bekor qildi")}
              />
            </label>

            {cancelError && <div className="form-error">{cancelError}</div>}

            <button
              type="button"
              className="cancel-confirm-btn"
              onClick={handleConfirmCancel}
            >
              {t("Bekor qilishni tasdiqlash")}
            </button>
          </div>
        </div>
      )}

      {receiptOrder && (
        <div className="receipt-backdrop" onClick={() => setReceiptOrder(null)}>
          <div className="receipt-modal" onClick={(event) => event.stopPropagation()}>
            <div className="receipt-head">
              <h2>{t("Receipt preview")}</h2>
              <button type="button" onClick={() => setReceiptOrder(null)}>
                {t("Close")}
              </button>
            </div>

            <div className="receipt-paper">
              <h3>BAGGAGE ROOM</h3>
              <p>{t(receiptOrder.branch)}</p>

              <div className="receipt-line" />

              <div className="receipt-row">
                <span>{t("Order ID")}</span>
                <b>{receiptOrder.id}</b>
              </div>
              <div className="receipt-row">
                <span>{t("Client")}</span>
                <b>{receiptOrder.client}</b>
              </div>
              <div className="receipt-row">
                <span>{t("Phone")}</span>
                <b>{receiptOrder.phone}</b>
              </div>
              <div className="receipt-row">
                <span>{t("Baggage")}</span>
                <b>
                  {t(receiptOrder.size)} / {receiptOrder.count} {t("ta")}
                </b>
              </div>
              <div className="receipt-row">
                <span>{t("Check-in")}</span>
                <b>{receiptOrder.checkIn || "-"}</b>
              </div>
              <div className="receipt-row">
                <span>{t("Check-out")}</span>
                <b>{receiptOrder.checkOut || "-"}</b>
              </div>
              <div className="receipt-row">
                <span>{t("Payment")}</span>
                <b>{t(receiptOrder.payment)}</b>
              </div>

              <div className="receipt-line" />

              <div className="receipt-total">
                <span>{t("Total")}</span>
                <b>{formatMoney(getTotalPrice(receiptOrder))}</b>
              </div>

              <div className="receipt-line" />

              <p className="receipt-thanks">{t("Thank you!")}</p>
              <small>{t("Reprint")}: {receiptOrder.reprintCount || 0}</small>
            </div>

            <button
              type="button"
              className="receipt-print-btn"
              onClick={() => printReceipt()}
            >
              {t("Print")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
