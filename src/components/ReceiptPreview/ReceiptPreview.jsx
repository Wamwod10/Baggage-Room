import { useEffect } from "react";
import { Printer, X } from "lucide-react";
import { useTranslation } from "../../i18n/useTranslation";
import { printReceipt } from "../../utils/printReceipt";
import "./receiptPreview.scss";

export default function ReceiptPreview({ order, onClose }) {
  const { t, formatMoney, formatDateTime } = useTranslation();

  useEffect(() => {
    if (!order) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [order, onClose]);

  if (!order) return null;

  const totalPrice =
    Number(order.finalPrice || 0) + Number(order.overtimeAmount || 0);

  return (
    <div className="receipt-preview-backdrop" onClick={onClose}>
      <div
        className="receipt-preview-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="receipt-preview-head no-print">
          <div>
            <h2>{t("Thermal chek preview")}</h2>
            <p>{t("80mm printer uchun professional format")}</p>
          </div>

          <button type="button" onClick={onClose} aria-label={t("Close")}>
            <X size={18} />
          </button>
        </div>

        <div className="receipt-actions no-print">
          <button type="button" onClick={onClose} className="receipt-close-btn">
            {t("Close")}
          </button>

          <button
            type="button"
            onClick={() => printReceipt()}
            className="receipt-print-btn"
          >
            {t("Print chek")}
          </button>
        </div>

        <div className="thermal-receipt" id="thermal-receipt">
          <div className="receipt-brand">
            <div className="receipt-logo">BR</div>
            <h3>BAGGAGE ROOM</h3>
            <p>{order.branch ? t(order.branch) : "-"}</p>
          </div>

          <div className="receipt-divider" />

          <div className="receipt-status">
            <span>✓ {t("Order qabul qilindi")}</span>
          </div>

          <div className="receipt-row">
            <span>{t("Order ID")}</span>
            <b>{order.id || "-"}</b>
          </div>

          <div className="receipt-row">
            <span>{t("Sana")}</span>
            <b>{formatDateTime(new Date())}</b>
          </div>

          <div className="receipt-row">
            <span>{t("Admin")}</span>
            <b>{order.adminName || order.admin || "-"}</b>
          </div>

          <div className="receipt-divider" />

          <div className="receipt-section-title">{t("Client")}</div>

          <div className="receipt-row">
            <span>{t("Ism")}</span>
            <b>{order.client || "-"}</b>
          </div>

          <div className="receipt-row">
            <span>{t("Phone")}</span>
            <b>{order.phone || "-"}</b>
          </div>

          <div className="receipt-row">
            <span>{t("Passport")}</span>
            <b>{order.passport || "-"}</b>
          </div>

          <div className="receipt-divider" />

          <div className="receipt-section-title">{t("Baggage")}</div>

          <div className="receipt-row">
            <span>{t("Size")}</span>
            <b>{order.size ? t(order.size) : "-"}</b>
          </div>

          <div className="receipt-row">
            <span>{t("Count")}</span>
            <b>
              {order.count || 0} {t("ta")}
            </b>
          </div>

          <div className="receipt-row">
            <span>{t("Check-in")}</span>
            <b>{formatDateTime(order.checkIn)}</b>
          </div>

          <div className="receipt-row">
            <span>{t("Check-out")}</span>
            <b>{formatDateTime(order.checkOut)}</b>
          </div>

          {order.note && (
            <div className="receipt-note">
              <span>{t("Note")}:</span>
              <p>{order.note}</p>
            </div>
          )}

          <div className="receipt-divider" />

          <div className="receipt-section-title">{t("Payment")}</div>

          <div className="receipt-row">
            <span>{t("Payment type")}</span>
            <b>{order.payment ? t(order.payment) : "-"}</b>
          </div>

          <div className="receipt-row">
            <span>{t("Base price")}</span>
            <b>{formatMoney(order.finalPrice)}</b>
          </div>

          <div className="receipt-row">
            <span>{t("Overtime")}</span>
            <b>{formatMoney(order.overtimeAmount)}</b>
          </div>

          <div className="receipt-total-row">
            <span>{t("Total")}</span>
            <b>{formatMoney(totalPrice)}</b>
          </div>

          <div className="receipt-divider" />

          <div className="receipt-barcode">
            <span>{order.id || "ORDER"}</span>
          </div>

          <div className="receipt-qr-placeholder">
            <span>QR</span>
            <small>{order.id || "-"}</small>
          </div>

          <div className="receipt-footer">
            <p>{t("Chekni saqlab qo'ying")}</p>
            <small>{t("Bagajni olishda Order ID talab qilinadi")}</small>
          </div>
        </div>

        <button
          type="button"
          className="receipt-preview-print no-print"
          onClick={() => printReceipt()}
        >
          <Printer size={17} />
          {t("Print chek")}
        </button>
      </div>
    </div>
  );
}
