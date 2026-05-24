import { useState } from "react";
import { Printer, Save } from "lucide-react";
import baggageService from "../../services/baggageService";
import shiftService from "../../services/shiftService";
import settingsService from "../../services/settingsService";
import { useAuth } from "../../store/AuthContext";
import { getBranchNames } from "../../utils/branches";
import ReceiptPreview from "../../components/ReceiptPreview/ReceiptPreview";
import telegramService from "../../services/telegramService";
import StateBlock from "../../components/StateBlock/StateBlock";
import { ListSkeleton } from "../../components/Skeleton/Skeleton";
import usePageResource from "../../hooks/usePageResource";
import { useTranslation } from "../../i18n/useTranslation";
import "./newBaggage.scss";

const getInitialForm = (defaultBranch = getBranchNames()[0] || "") => {
  let pricing = { Medium: 0 };

  try {
    pricing = {
      ...pricing,
      ...(settingsService.get().pricing || {}),
    };
  } catch {
    pricing = { Medium: 0 };
  }

  return {
    client: "",
    phone: "",
    passport: "",
    branch: defaultBranch,
    size: "Medium",
    count: 1,
    checkIn: "",
    checkOut: "",
    price: String(pricing.Medium || 0),
    discount: "0",
    payment: "Naqd",
    note: "",
  };
};

export default function NewBaggage() {
  const { t, formatMoney } = useTranslation();
  const { user, effectiveBranch } = useAuth();
  const branchNames = getBranchNames();
  const isBranchAdmin = user?.role === "BRANCH_ADMIN";
  const availableBranches = effectiveBranch ? [effectiveBranch] : branchNames;
  const defaultBranch = availableBranches[0] || "";
  const [receiptOrder, setReceiptOrder] = useState(null);

  const [form, setForm] = useState(() => getInitialForm(defaultBranch));
  const [message, setMessage] = useState("");

  const {
    data: orderCount = 0,
    isLoading,
    error,
    retry,
  } = usePageResource(() => baggageService.getAll().length, [receiptOrder], 0);

  const nextOrderId = `BR-${String(orderCount + 1).padStart(6, "0")}`;

  const finalPrice = Math.max(
    Number(form.price || 0) * Number(form.count || 1) -
      Number(form.discount || 0),
    0,
  );

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (["count", "price", "discount"].includes(name)) {
      const numberValue = Number(value);

      if (value !== "" && (!Number.isFinite(numberValue) || numberValue < 0)) {
        return;
      }

      if (name === "count" && value !== "" && numberValue < 1) {
        return;
      }
    }

    if (name === "size") {
      let currentSettings = { pricing: {} };

      try {
        currentSettings = settingsService.get();
      } catch {
        setMessage(t("Settings ma'lumotlarini o'qishda xatolik yuz berdi."));
      }

      setForm((prev) => ({
        ...prev,
        size: value,
        price: String(currentSettings.pricing?.[value] || 0),
      }));

      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (print = false) => {
    const phoneRegex = /^\+?\d[\d\s-]{8,}$/;
    const checkInTime = form.checkIn ? new Date(form.checkIn).getTime() : null;
    const checkOutTime = form.checkOut
      ? new Date(form.checkOut).getTime()
      : null;

    if (!form.client.trim()) {
      setMessage(t("Ism familiya majburiy."));
      return;
    }

    if (!phoneRegex.test(form.phone.trim())) {
      setMessage(
        t("Telefon raqamini to'g'ri kiriting. Masalan: +998 90 123 45 67"),
      );
      return;
    }

    if (!form.checkIn || !form.checkOut) {
      setMessage(t("Check-in va check-out vaqtlari majburiy."));
      return;
    }

    if (
      Number.isNaN(checkInTime) ||
      Number.isNaN(checkOutTime) ||
      checkOutTime <= checkInTime
    ) {
      setMessage(t("Check-out vaqti check-in vaqtidan keyin bo'lishi kerak."));
      return;
    }

    if (Number(form.count || 0) <= 0 || Number(form.price || 0) < 0) {
      setMessage(
        t("Bagaj soni 0 dan katta, narx esa manfiy bo'lmasligi kerak."),
      );
      return;
    }

    const subtotal = Number(form.price || 0) * Number(form.count || 1);

    if (
      Number(form.discount || 0) < 0 ||
      Number(form.discount || 0) > subtotal
    ) {
      setMessage(
        t("Skidka manfiy bo'lmasligi va umumiy summadan oshmasligi kerak."),
      );
      return;
    }

    const orderBranch = effectiveBranch || form.branch;
    const currentShift = shiftService.getCurrent(orderBranch);

    if (!currentShift) {
      setMessage(t("Avval kassani oching. Ochiq shift topilmadi."));
      return;
    }

    let order;

    try {
      order = baggageService.create({
        ...form,
        branch: orderBranch,
        count: Number(form.count),
        price: Number(form.price),
        discount: Number(form.discount),
        finalPrice,
        printed: print,
      });
    } catch {
      setMessage(t("Orderni saqlashda xatolik yuz berdi."));
      return;
    }

    if (print) {
      setReceiptOrder(order);
    }

    let telegramNotice = ` ${t("Telegram xabar yuborildi.")}`;

    try {
      const telegramResult = await telegramService.sendNewOrder(order);

      if (telegramResult?.skipped) {
        telegramNotice = ` ${t("Telegram yuborilmadi")}: ${telegramResult.reason}.`;
      }
    } catch (error) {
      telegramNotice = ` ${t("Telegram yuborilmadi")}: ${
        error.message || t("xatolik yuz berdi")
      }.`;
    }

    setMessage(
      (print
        ? `${order.id} ${t("saqlandi va chek chiqarishga tayyor")}`
        : `${order.id} ${t("muvaffaqiyatli saqlandi")}`) + telegramNotice,
    );

    setForm(getInitialForm(defaultBranch));
  };

  return (
    <section className="page new-baggage-page">
      <div className="page-header compact-header">
        <div>
          <h1>{t("Yangi baggage")}</h1>
          <p>{t("Klient, bagaj va to'lov ma'lumotlarini kiriting")}</p>
        </div>

        <div className="order-chip">
          <span>{t("Order ID")}</span>
          <b>{nextOrderId}</b>
        </div>
      </div>

      {error && (
        <StateBlock
          type="error"
          title={t("Order formasi tayyorlanmadi")}
          description={t(
            "Local order ma'lumotlarini o'qishda xatolik yuz berdi.",
          )}
          actionLabel={t("Qayta urinish")}
          onAction={retry}
        />
      )}

      {message && <div className="local-message">{message}</div>}

      {isLoading && !error ? (
        <div className="card new-baggage-loading">
          <ListSkeleton rows={5} />
        </div>
      ) : (
        !error && (
          <div className="new-baggage-grid">
            <form className="new-baggage-card card">
              <div className="form-row-title">
                <h2>{t("Order form")}</h2>
                <p>
                  {t("Size tanlanganda narx avtomatik Settings'dan olinadi")}
                </p>
              </div>

              <div className="compact-form-grid">
                <label>
                  <span>{t("Ism familiya")}</span>
                  <input
                    name="client"
                    value={form.client}
                    onChange={handleChange}
                    placeholder={t("Masalan: Aliyev Sardor")}
                  />
                </label>

                <label>
                  <span>{t("Telefon")}</span>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+998 90 123 45 67"
                  />
                </label>

                <label>
                  <span>{t("Passport / ID")}</span>
                  <input
                    name="passport"
                    value={form.passport}
                    onChange={handleChange}
                    placeholder="AA1234567"
                  />
                </label>

                <label>
                  <span>{t("Filial")}</span>
                  <select
                    name="branch"
                    value={effectiveBranch || form.branch || defaultBranch}
                    onChange={handleChange}
                    disabled={isBranchAdmin || Boolean(effectiveBranch)}
                  >
                    {availableBranches.map((branch) => (
                      <option key={branch} value={branch}>
                        {t(branch)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>{t("Bagaj size")}</span>
                  <select name="size" value={form.size} onChange={handleChange}>
                    <option value="Small">{t("Small")}</option>
                    <option value="Medium">{t("Medium")}</option>
                    <option value="Large">{t("Large")}</option>
                    <option value="XL">XL</option>
                  </select>
                </label>

                <label>
                  <span>{t("Bagaj soni")}</span>
                  <input
                    name="count"
                    type="number"
                    value={form.count}
                    min="1"
                    onChange={handleChange}
                  />
                </label>

                <label>
                  <span>{t("Check-in")}</span>
                  <input
                    name="checkIn"
                    type="datetime-local"
                    value={form.checkIn}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  <span>{t("Check-out")}</span>
                  <input
                    name="checkOut"
                    type="datetime-local"
                    value={form.checkOut}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  <span>{t("Narx / 1 bagaj")}</span>
                  <input
                    name="price"
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  <span>{t("Skidka")}</span>
                  <input
                    name="discount"
                    type="number"
                    min="0"
                    value={form.discount}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  <span>{t("To'lov turi")}</span>
                  <select
                    name="payment"
                    value={form.payment}
                    onChange={handleChange}
                  >
                    <option value="Naqd">{t("Naqd")}</option>
                    <option value="Karta">{t("Karta")}</option>
                    <option value="Click/Payme">Click/Payme</option>
                    <option value="O'tkazma">{t("O'tkazma")}</option>
                  </select>
                </label>

                <label className="full">
                  <span>{t("Note")}</span>
                  <textarea
                    name="note"
                    value={form.note}
                    onChange={handleChange}
                    placeholder={t("Qo'shimcha izoh...")}
                  />
                </label>
              </div>
            </form>

            <aside className="order-summary-card card">
              <h2>{t("Summary")}</h2>

              <div className="summary-mini-list">
                <div>
                  <span>{t("Order ID")}</span>
                  <b>{nextOrderId}</b>
                </div>
                <div>
                  <span>{t("Size")}</span>
                  <b>{form.size}</b>
                </div>
                <div>
                  <span>{t("Count")}</span>
                  <b>
                    {form.count} {t("ta")}
                  </b>
                </div>
                <div>
                  <span>{t("Price / 1")}</span>
                  <b>{formatMoney(form.price)}</b>
                </div>
                <div>
                  <span>{t("Discount")}</span>
                  <b>{formatMoney(form.discount)}</b>
                </div>
                <div>
                  <span>{t("Payment")}</span>
                  <b>{t(form.payment)}</b>
                </div>
              </div>

              <div className="summary-total">
                <span>{t("Final price")}</span>
                <h3>{formatMoney(finalPrice)}</h3>
              </div>

              <div className="summary-buttons">
                <button
                  className="save-btn"
                  type="button"
                  onClick={() => handleSave(false)}
                >
                  <Save size={17} />
                  {t("Save")}
                </button>

                <button
                  className="print-btn"
                  type="button"
                  onClick={() => handleSave(true)}
                >
                  <Printer size={17} />
                  {t("Saqlash + Chek")}
                </button>
              </div>
            </aside>
          </div>
        )
      )}
      {receiptOrder && (
        <ReceiptPreview
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </section>
  );
}
