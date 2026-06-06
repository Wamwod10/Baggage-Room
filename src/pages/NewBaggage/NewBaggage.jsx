import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  Eye,
  Luggage,
  MoveRight,
  Printer,
  Save,
  Search,
  Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import baggageService from "../../services/baggageService";
import lockerService from "../../services/lockerService";
import shiftService from "../../services/shiftService";
import settingsService from "../../services/settingsService";
import { useAuth } from "../../store/AuthContext";
import { getBranchNames } from "../../utils/branches";
import { convertFromUZS, formatMoneyByCurrency } from "../../utils/currency";
import ReceiptPreview from "../../components/ReceiptPreview/ReceiptPreview";
import GlassSelect from "../../components/GlassSelect/GlassSelect";
import telegramService from "../../services/telegramService";
import StateBlock from "../../components/StateBlock/StateBlock";
import { ListSkeleton } from "../../components/Skeleton/Skeleton";
import usePageResource from "../../hooks/usePageResource";
import { useTranslation } from "../../i18n/useTranslation";
import "./newBaggage.scss";

const toInputDateTime = (date = new Date()) => {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 16);
};

const getInitialForm = (defaultBranch, defaultCurrency = "UZS") => ({
  client: "",
  phone: "",
  passport: "",
  branch: defaultBranch,
  lockers: [],
  checkIn: toInputDateTime(),
  tariffPreset: "1",
  customHours: "",
  currency: defaultCurrency,
  payment: "Naqd",
  discount: "0",
  note: "",
  realPaidAmount: "",
  paymentReason: "",
  finalEdit: false,
});

export default function NewBaggage() {
  const { t, formatDateTime } = useTranslation();
  const navigate = useNavigate();
  const { user, effectiveBranch } = useAuth();
  const branchNames = getBranchNames();
  const availableBranches = effectiveBranch ? [effectiveBranch] : branchNames;
  const defaultBranch = availableBranches[0] || "";
  const settings = settingsService.get();
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [branch, setBranch] = useState(defaultBranch);
  const currentBranch = effectiveBranch || branch;
  const branchTariff = settings.branchTariffs?.[currentBranch] || {};
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(() =>
    getInitialForm(defaultBranch, settings.defaultCurrency || "UZS"),
  );
  const [selectedLocker, setSelectedLocker] = useState(null);
  const [serviceLocker, setServiceLocker] = useState(null);
  const [serviceReason, setServiceReason] = useState("");
  const [message, setMessage] = useState("");
  const [customerHistory, setCustomerHistory] = useState([]);

  const {
    data: pageData = { lockers: [], orders: [], orderCount: 0 },
    isLoading,
    error,
    retry,
  } = usePageResource(
    async () => {
      const [lockers, orders, allOrders] = await Promise.all([
        lockerService.getAll(effectiveBranch || branch),
        baggageService.getAll(effectiveBranch || branch),
        baggageService.getAll(),
      ]);
      return { lockers, orders, orderCount: allOrders.length };
    },
    [effectiveBranch, branch, refreshKey],
    { lockers: [], orders: [], orderCount: 0 },
  );

  const nextOrderId = `BR-${String(pageData.orderCount + 1).padStart(6, "0")}`;
  const selectedHours = Math.max(
    1,
    Number(form.tariffPreset === "custom" ? form.customHours : form.tariffPreset) || 1,
  );
  const selectedLockers = form.lockers || [];
  const isCustomTariff = form.tariffPreset === "custom";
  const originalAmountUZS = baggageService.calculateTariff({
    branch: currentBranch,
    lockers: selectedLockers,
    hours: selectedHours,
    isCustom: isCustomTariff,
  });
  const exchangeRate = Number(settings.exchangeRates?.[form.currency] || 1);
  const calculatedAmount = convertFromUZS(
    originalAmountUZS,
    form.currency,
    settings.exchangeRates,
  );
  const discount = Number(form.discount || 0);
  const finalAmount = Math.max(calculatedAmount - discount, 0);
  const realPaidAmount = form.finalEdit
    ? Number(form.realPaidAmount || 0)
    : finalAmount;
  const checkOut = useMemo(() => {
    const date = new Date(form.checkIn || new Date());
    date.setHours(date.getHours() + selectedHours);
    return date.toISOString();
  }, [form.checkIn, selectedHours]);

  useEffect(() => {
    let active = true;
    baggageService
      .getCustomerHistory({
        phone: form.phone,
        passport: form.passport,
        branchName: effectiveBranch,
      })
      .then((items) => {
        if (active) setCustomerHistory(items);
      })
      .catch(() => {
        if (active) setCustomerHistory([]);
      });
    return () => {
      active = false;
    };
  }, [form.phone, form.passport, effectiveBranch]);

  const lockers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (pageData.lockers || [])
      .filter((locker) => locker.branch === currentBranch)
      .filter((locker) => {
        const status = locker.status;
        const matchesFilter =
          filter === "all" ||
          locker.size === filter ||
          (filter === "free" && status === "Bosh") ||
          (filter === "busy" && status === "Band") ||
          (filter === "delayed" && status === "Kechikkan") ||
          (filter === "service" && status === "Servisda");
        const matchesSearch = !query || String(locker.number).includes(query);

        return matchesFilter && matchesSearch;
      });
  }, [pageData.lockers, currentBranch, filter, search]);

  const branchLockers = (pageData.lockers || []).filter(
    (locker) => locker.branch === currentBranch,
  );
  const freeLockers = branchLockers.filter((locker) => locker.status === "Bosh");
  const selectedOrder =
    selectedLocker?.activeOrder ||
    (pageData.orders || []).find((order) => order.id === selectedLocker?.activeOrderId) ||
    null;
  const lockerStats = {
    total: branchLockers.length,
    free: branchLockers.filter((locker) => locker.status === "Bosh").length,
    busy: branchLockers.filter((locker) => locker.status === "Band").length,
    delayed: branchLockers.filter((locker) => locker.status === "Kechikkan").length,
  };

  const updateForm = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const openOrderPanel = (locker) => {
    setForm({
      ...getInitialForm(currentBranch, settings.defaultCurrency || "UZS"),
      lockers: [{ id: locker.id, lockerId: locker.id, number: locker.number, size: locker.size, price: locker.price }],
    });
    setSelectedLocker(locker);
    setMessage("");
  };

  const toggleLocker = (locker) => {
    if (locker.status !== "Bosh") return;

    setForm((prev) => {
      const exists = prev.lockers.some(
        (item) => Number(item.number) === Number(locker.number),
      );
      const lockers = exists
        ? prev.lockers.filter((item) => Number(item.number) !== Number(locker.number))
        : [...prev.lockers, { id: locker.id, lockerId: locker.id, number: locker.number, size: locker.size, price: locker.price }];

      return { ...prev, lockers };
    });
  };

  const openServiceModal = (locker) => {
    setServiceLocker(locker);
    setServiceReason(locker.serviceReason || "");
  };

  const handleBlockLocker = async () => {
    if (!serviceLocker) return;

    const locker = serviceLocker;
    const reason = serviceReason.trim();
    await lockerService.block(locker.branch, locker.number, {
      reason,
      admin: user?.fullName,
    });
    if (selectedLocker?.id === locker.id) {
      setSelectedLocker(null);
      setForm(getInitialForm(defaultBranch, settings.defaultCurrency || "UZS"));
    }
    setServiceLocker(null);
    setServiceReason("");
    setRefreshKey((value) => value + 1);

    try {
      await telegramService.sendLockerBlock(locker, reason);
    } catch {
      // Telegram is best-effort from the local frontend.
    }
  };

  const handleUnblockLocker = async (locker) => {
    await lockerService.unblock(locker.branch, locker.number, {
      admin: user?.fullName,
    });
    setRefreshKey((value) => value + 1);
  };

  const handleSave = async (print = false) => {
    const phoneRegex = /^\+?\d[\d\s-]{8,}$/;

    if (!form.client.trim()) {
      setMessage(t("Ism familiya majburiy."));
      return;
    }

    if (!phoneRegex.test(form.phone.trim())) {
      setMessage(t("Telefon raqamini to'g'ri kiriting. Masalan: +998 90 123 45 67"));
      return;
    }

    if (!selectedLockers.length) {
      setMessage(t("Kamida bitta bosh yacheyka tanlang."));
      return;
    }

    if (discount < 0 || discount > calculatedAmount) {
      setMessage(t("Skidka manfiy bo'lmasligi va umumiy summadan oshmasligi kerak."));
      return;
    }

    if (realPaidAmount !== finalAmount && !form.paymentReason.trim()) {
      setMessage(t("Summani o'zgartirish sababini kiriting."));
      return;
    }

    const currentShift = await shiftService.getCurrent(currentBranch);

    if (!currentShift) {
      setMessage(t("Avval kassani oching. Ochiq shift topilmadi."));
      return;
    }

    let order;

    try {
      order = await baggageService.create({
        client: form.client.trim(),
        phone: form.phone.trim(),
        passport: form.passport.trim(),
        branch: currentBranch,
        lockers: selectedLockers,
        size: selectedLockers.map((locker) => locker.size).join(", "),
        count: selectedLockers.length,
        checkIn: new Date(form.checkIn).toISOString(),
        checkOut,
        tariffHours: selectedHours,
        tariffMode: isCustomTariff ? "custom" : "preset",
        price: calculatedAmount,
        calculatedAmount,
        exchangeRate,
        originalAmountUZS,
        finalAmount,
        discount,
        finalPrice: realPaidAmount,
        realPaidAmount,
        originalPrice: calculatedAmount,
        difference: realPaidAmount - finalAmount,
        currency: form.currency,
        payment: form.payment,
        debtAmount: form.payment === "Qarz" ? realPaidAmount : 0,
        paymentEditReason: form.paymentReason.trim(),
        note: form.note,
        admin: user?.fullName || "Admin",
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
      telegramNotice = ` ${t("Telegram yuborilmadi")}: ${error.message || t("xatolik yuz berdi")}.`;
    }

    setMessage(
      (print
        ? `${order.id} ${t("saqlandi va chek chiqarishga tayyor")}`
        : `${order.id} ${t("muvaffaqiyatli saqlandi")}`) + telegramNotice,
    );
    setSelectedLocker(null);
    setForm(getInitialForm(defaultBranch, settings.defaultCurrency || "UZS"));
    setRefreshKey((value) => value + 1);
  };

  const getStatusLabel = (status) => {
    if (status === "Bosh") return "BO'SH";
    if (status === "Band") return "BAND";
    if (status === "Kechikkan") return "KECHIKKAN";
    if (status === "Servisda") return "SERVIS";
    return String(status || "").toUpperCase();
  };

  const handleCardClick = (locker) => {
    if (locker.status === "Bosh") {
      openOrderPanel(locker);
      return;
    }

    setSelectedLocker(locker);
  };

  const sizeFilters = [
    ["all", t("Hammasi")],
    ["S", "S"],
    ["M", "M"],
    ["L", "L"],
  ];
  const statusFilters = [
    ["free", t("Bo'sh")],
    ["busy", t("Band")],
    ["delayed", t("Kechikkan")],
    ["service", t("Servisda")],
  ];

  const renderOrderPanel = () => {
    if (!selectedLocker) {
      return (
        <div className="locker-panel-empty">
          <Luggage size={38} />
          <h2>{t("Yacheyka tanlang")}</h2>
          <p>{t("Bo'sh yacheyka order yaratadi, band yacheyka order detail ko'rsatadi.")}</p>
        </div>
      );
    }

    if (selectedLocker.status !== "Bosh") {
      return (
        <div className="locker-detail-panel">
          <div className="panel-locker-summary">
            <div>
              <span>{t("Yacheyka")}</span>
              <h2>#{selectedLocker.number}</h2>
            </div>
            <b>{selectedLocker.size}</b>
          </div>

          <div className={`panel-status ${selectedLocker.status}`}>
            {getStatusLabel(selectedLocker.status)}
          </div>

          {selectedOrder ? (
            <div className="panel-order-detail">
              <div>
                <span>{t("Order")}</span>
                <b>{selectedOrder.id}</b>
              </div>
              <div>
                <span>{t("Client")}</span>
                <b>{selectedOrder.client || "-"}</b>
              </div>
              <div>
                <span>{t("Phone")}</span>
                <b>{selectedOrder.phone || "-"}</b>
              </div>
              <div>
                <span>{t("Check-out")}</span>
                <b>{formatDateTime(selectedOrder.checkOut)}</b>
              </div>
              <div>
                <span>{t("Payment")}</span>
                <b>{selectedOrder.payment || "-"}</b>
              </div>
              <div>
                <span>{t("Total")}</span>
                <b>{formatMoneyByCurrency(selectedOrder.realPaidAmount || selectedOrder.finalPrice, selectedOrder.currency)}</b>
              </div>
            </div>
          ) : (
            <StateBlock
              compact
              type="empty"
              title={t("Order topilmadi")}
              description={t("Bu yacheyka band, lekin order ma'lumoti topilmadi.")}
            />
          )}

          <div className="panel-actions">
            <button type="button" onClick={() => navigate(`/sales-history?order=${selectedLocker.activeOrderId || ""}`)}>
              <Eye size={16} />
              {t("Ko'rish")}
            </button>
            <button type="button" onClick={() => navigate("/active-baggage")}>
              <MoveRight size={16} />
              {t("Transfer / Pickup")}
            </button>
            {selectedLocker.status === "Servisda" && (
              <button type="button" onClick={() => handleUnblockLocker(selectedLocker)}>
                <Ban size={16} />
                {t("Ishga qaytarish")}
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="panel-scroll">
          <div className="panel-locker-summary">
            <div>
              <span>{t("Tanlangan")}</span>
              <h2>{selectedLockers.map((item) => `#${item.number}`).join(", ")}</h2>
            </div>
            <b>{selectedLockers.map((item) => item.size).join("/")}</b>
          </div>

          <div className="panel-mini-actions">
            <button type="button" onClick={() => openServiceModal(selectedLocker)}>
              <Wrench size={15} />
              {t("Servisga o'tkazish")}
            </button>
          </div>

          {customerHistory.activeOrders.length > 0 && (
            <div className="duplicate-warning">
              {t("Bu mijozda aktiv baggage mavjud")}: {customerHistory.activeOrders.map((item) => item.id).join(", ")}
            </div>
          )}

          {customerHistory.visits > 0 && (
            <div className="customer-history-box">
              <span>{t("Customer history")}</span>
              <b>{customerHistory.visits} {t("order")}</b>
            </div>
          )}

          <div className="panel-section">
            <h3>{t("Mijoz")}</h3>
            <div className="panel-form-grid">
              <label>
                <span>{t("Ism familiya")}</span>
                <input value={form.client} onChange={(event) => updateForm("client", event.target.value)} />
              </label>
              <label>
                <span>{t("Telefon")}</span>
                <input value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} placeholder="+998 90 123 45 67" />
              </label>
              <label>
                <span>{t("Passport / ID")}</span>
                <input value={form.passport} onChange={(event) => updateForm("passport", event.target.value)} />
              </label>
            </div>
          </div>

          <div className="panel-section">
            <h3>{t("Yacheykalar")}</h3>
            <div className="locker-pick-list">
              {freeLockers.map((locker) => {
                const active = selectedLockers.some((item) => Number(item.number) === Number(locker.number));
                return (
                  <button
                    type="button"
                    key={locker.id}
                    className={active ? "active" : ""}
                    onClick={() => toggleLocker(locker)}
                  >
                    #{locker.number} {locker.size}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="panel-section">
            <h3>{t("Tarif va to'lov")}</h3>
            <div className="panel-form-grid">
              <label>
                <span>{t("Check-in")}</span>
                <input type="datetime-local" value={form.checkIn} onChange={(event) => updateForm("checkIn", event.target.value)} />
              </label>
              <label>
                <span>{t("Tarif")}</span>
                <GlassSelect value={form.tariffPreset} onChange={(event) => updateForm("tariffPreset", event.target.value)}>
                  {(branchTariff.tariffs || [1, 12, 24, 48, 72]).map((hours) => (
                    <option key={hours} value={hours}>{hours} {t("soat")}</option>
                  ))}
                  <option value="custom">{t("Qo'lda soat")}</option>
                </GlassSelect>
              </label>
              {form.tariffPreset === "custom" && (
                <label>
                  <span>{t("Soat")}</span>
                  <input type="number" min="1" value={form.customHours} onChange={(event) => updateForm("customHours", event.target.value)} />
                </label>
              )}
              <label>
                <span>{t("Currency")}</span>
                <GlassSelect value={form.currency} onChange={(event) => updateForm("currency", event.target.value)}>
                  {(settings.currencies || ["UZS", "USD", "RUB", "EUR"]).map((currency) => (
                    <option value={currency} key={currency}>{currency}</option>
                  ))}
                </GlassSelect>
              </label>
              <label>
                <span>{t("To'lov turi")}</span>
                <GlassSelect value={form.payment} onChange={(event) => updateForm("payment", event.target.value)}>
                  <option value="Naqd">{t("Naqd")}</option>
                  <option value="Karta">{t("Karta")}</option>
                  <option value="Click/Payme">Click/Payme</option>
                  <option value="O'tkazma">{t("O'tkazma")}</option>
                  <option value="Qarz">{t("Qarz")}</option>
                </GlassSelect>
              </label>
              <label>
                <span>{t("Skidka")}</span>
                <input type="number" min="0" value={form.discount} onChange={(event) => updateForm("discount", event.target.value)} />
              </label>
              <label>
                <span>{t("Real olingan summa")}</span>
                <input
                  type="number"
                  min="0"
                  value={form.finalEdit ? form.realPaidAmount : finalAmount}
                  onFocus={() => updateForm("finalEdit", true)}
                  onChange={(event) => updateForm("realPaidAmount", event.target.value)}
                />
              </label>
              <label className="full">
                <span>{t("Sabab")}</span>
                <input value={form.paymentReason} onChange={(event) => updateForm("paymentReason", event.target.value)} />
              </label>
              <label className="full">
                <span>{t("Note")}</span>
                <textarea value={form.note} onChange={(event) => updateForm("note", event.target.value)} />
              </label>
            </div>
          </div>
        </div>

        <div className="panel-footer">
          <div className="panel-totals">
            <div>
              <span>{t("Hisoblangan")}</span>
              <b>{formatMoneyByCurrency(calculatedAmount, form.currency)}</b>
            </div>
            <div>
              <span>{t("Skidka")}</span>
              <b>{formatMoneyByCurrency(discount, form.currency)}</b>
            </div>
            <div className="payable">
              <span>{t("To'lovga")}</span>
              <b>{formatMoneyByCurrency(realPaidAmount, form.currency)}</b>
            </div>
          </div>
          <div className="panel-save-actions">
            <button className="save-btn" type="button" onClick={() => handleSave(false)}>
              <Save size={17} />
              {t("Save")}
            </button>
            <button className="print-btn" type="button" onClick={() => handleSave(true)}>
              <Printer size={17} />
              {t("Saqlash + Chek")}
            </button>
          </div>
        </div>
      </>
    );
  };

  return (
    <section className="page new-baggage-page">
      <div className="page-header compact-header">
        <div>
          <h1>{t("Yacheyka boshqaruvi")}</h1>
          <p>{t("Chapda yacheyka tanlang, o'ng panelda orderni yakunlang")}</p>
        </div>

        <div className="order-chip">
          <span>{t("Order ID")}</span>
          <b>{nextOrderId}</b>
        </div>
      </div>

      {error && (
        <StateBlock
          type="error"
          title={t("Yacheykalar yuklanmadi")}
          description={t("Local yacheyka ma'lumotlarini o'qishda xatolik yuz berdi.")}
          actionLabel={t("Qayta urinish")}
          onAction={retry}
        />
      )}

      {message && <div className="local-message">{message}</div>}

      <div className="locker-pos-layout">
        <div className="locker-left">
          <div className="locker-stats">
            <div className="locker-stat total"><span>{t("Jami")}</span><b>{lockerStats.total}</b></div>
            <div className="locker-stat free"><span>{t("Bo'sh")}</span><b>{lockerStats.free}</b></div>
            <div className="locker-stat busy"><span>{t("Band")}</span><b>{lockerStats.busy}</b></div>
            <div className="locker-stat delayed"><span>{t("Kechikkan")}</span><b>{lockerStats.delayed}</b></div>
          </div>

          <div className="locker-toolbar card">
            <label>
              <span>{t("Filial")}</span>
              <GlassSelect value={currentBranch} onChange={(event) => setBranch(event.target.value)} disabled={Boolean(effectiveBranch)}>
                {availableBranches.map((item) => (
                  <option key={item} value={item}>{t(item)}</option>
                ))}
              </GlassSelect>
            </label>

            <div className="locker-search">
              <Search size={16} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Yacheyka raqami...")} />
            </div>

            <div className="locker-filter-groups">
              <div className="locker-filter">
                <span>{t("Size")}</span>
                {sizeFilters.map(([value, label]) => (
                  <button type="button" key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>
                ))}
              </div>
              <div className="locker-filter">
                <span>{t("Status")}</span>
                {statusFilters.map(([value, label]) => (
                  <button type="button" key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>
                ))}
              </div>
            </div>
          </div>

          {isLoading && !error ? (
            <div className="card new-baggage-loading">
              <ListSkeleton rows={5} />
            </div>
          ) : (
            !error && (
              <div className="locker-grid">
                {lockers.map((locker) => (
                    <article
                      className={`locker-card card ${locker.status} ${selectedLocker?.id === locker.id ? "selected" : ""}`}
                      key={locker.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleCardClick(locker)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleCardClick(locker);
                        }
                      }}
                    >
                      <div className="locker-card-head">
                        <h2>#{locker.number}</h2>
                        <b className="locker-size-badge">{locker.size}</b>
                      </div>
                      <div className={`locker-status-badge ${locker.status}`}>{getStatusLabel(locker.status)}</div>
                      {locker.activeOrderId && <div className="locker-order-link">{locker.activeOrderId}</div>}
                    </article>
                  ))}
              </div>
            )
          )}
        </div>

        <aside className="locker-side-panel card">
          <div className="side-panel-head">
            <div>
              <span>{t("Checkout")}</span>
              <h2>{selectedLocker ? `#${selectedLocker.number}` : t("Panel")}</h2>
            </div>
            {selectedLocker && (
              <button type="button" onClick={() => setSelectedLocker(null)}>{t("Clear")}</button>
            )}
          </div>
          {renderOrderPanel()}
        </aside>
      </div>

      {receiptOrder && <ReceiptPreview order={receiptOrder} onClose={() => setReceiptOrder(null)} />}

      {serviceLocker && (
        <div className="locker-service-backdrop" onClick={() => setServiceLocker(null)}>
          <div className="locker-service-modal card" onClick={(event) => event.stopPropagation()}>
            <div className="locker-service-head">
              <div>
                <h2>{t("Yacheykani servisga olish")}</h2>
                <p>#{serviceLocker.number} {serviceLocker.size}</p>
              </div>
              <button type="button" onClick={() => setServiceLocker(null)}>
                {t("Close")}
              </button>
            </div>

            <label>
              <span>{t("Servis sababi")}</span>
              <textarea
                value={serviceReason}
                onChange={(event) => setServiceReason(event.target.value)}
                placeholder={t("Masalan: ta'mirlash, kalit muammosi")}
              />
            </label>

            <button type="button" className="locker-service-confirm" onClick={handleBlockLocker}>
              <Wrench size={16} />
              {t("Servisga o'tkazish")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
