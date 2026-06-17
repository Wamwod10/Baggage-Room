import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  Eye,
  Luggage,
  Minus,
  MoveRight,
  Plus,
  Printer,
  Save,
  Search,
  X,
  Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import baggageService from "../../services/baggageService";
import lockerService from "../../services/lockerService";
import shiftService from "../../services/shiftService";
import settingsService from "../../services/settingsService";
import { useAuth } from "../../store/AuthContext";
import { getBranchNames } from "../../utils/branches";
import { convertFromUZS, formatMoneyByCurrency, fromMinorUnits, toMinorUnits } from "../../utils/currency";
import { addHoursToIso, formatTashkentInputDateTime, parseTashkentInputToIso } from "../../utils/formatDate";
import { cleanNumericInput, cleanPhoneInput, formatNumberInput, formatPhoneInput } from "../../utils/inputFormat";
import { PAYMENT_OPTIONS, getPaymentLabel } from "../../utils/paymentLabels";
import ReceiptPreview from "../../components/ReceiptPreview/ReceiptPreview";
import GlassSelect from "../../components/GlassSelect/GlassSelect";
import telegramService from "../../services/telegramService";
import StateBlock from "../../components/StateBlock/StateBlock";
import { ListSkeleton } from "../../components/Skeleton/Skeleton";
import usePageResource from "../../hooks/usePageResource";
import { useTranslation } from "../../i18n/useTranslation";
import "./newBaggage.scss";

const getInitialForm = (defaultBranch, defaultCurrency = "UZS") => ({
  client: "",
  phone: "",
  passport: "",
  branch: defaultBranch,
  lockers: [],
  baggageCounts: {},
  checkIn: formatTashkentInputDateTime(),
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

const emptyCustomerHistory = { visits: 0, orders: [], activeOrders: [], duplicateOrders: [] };
const asArray = (value) => (Array.isArray(value) ? value : []);
const XL_BRANCHES = new Set([
  "Toshkent Shimoliy vokzal",
  "Toshkent Janubiy vokzal",
  "Samarqand vokzal",
]);
const MULTI_ORDER_LOCKER_BRANCHES = XL_BRANCHES;
const priceForHours = (tariff, hours, isCustom = false) => {
  const h = Number(hours || 1);
  if (!tariff) return 0;
  if (isCustom) return Number(tariff.price1h || 0) * Math.max(1, Math.ceil(h || 1));
  if (h <= 1) return Number(tariff.price1h || 0);
  if (h <= 12) return Number(tariff.price12h || 0);
  if (h <= 24) return Number(tariff.price24h || 0);
  if (h <= 48) return Number(tariff.price48h || 0);
  if (h <= 72) return Number(tariff.price72h || 0);
  return Number(tariff.price72h || 0) + Math.ceil((h - 72) / 24) * Number(tariff.after72hPrice || 0);
};

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
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(() =>
    getInitialForm(defaultBranch, settings.defaultCurrency || "UZS"),
  );
  const [selectedLocker, setSelectedLocker] = useState(null);
  const [serviceLocker, setServiceLocker] = useState(null);
  const [serviceReason, setServiceReason] = useState("");
  const [message, setMessage] = useState("");
  const [customerHistory, setCustomerHistory] = useState(emptyCustomerHistory);
  const [savingAction, setSavingAction] = useState("");

  const {
    data: pageData = { lockers: [], orders: [], orderCount: 0, tariffs: [] },
    isLoading,
    error,
    retry,
  } = usePageResource(
    async () => {
      const [lockers, orders, allOrders, tariffs] = await Promise.all([
        lockerService.getAll(effectiveBranch || branch),
        baggageService.getAll(effectiveBranch || branch),
        baggageService.getAll(),
        settingsService.getTariffs(effectiveBranch || branch),
      ]);
      const safeLockers = asArray(lockers);
      const safeOrders = asArray(orders);
      const safeAllOrders = asArray(allOrders);
      return { lockers: safeLockers, orders: safeOrders, orderCount: safeAllOrders.length, tariffs };
    },
    [effectiveBranch, branch, refreshKey],
    { lockers: [], orders: [], orderCount: 0, tariffs: [] },
  );

  const safePageData = useMemo(
    () => (pageData && typeof pageData === "object" ? pageData : { lockers: [], orders: [], orderCount: 0, tariffs: [] }),
    [pageData],
  );
  const pageLockers = useMemo(() => asArray(safePageData.lockers), [safePageData.lockers]);
  const pageOrders = useMemo(() => asArray(safePageData.orders), [safePageData.orders]);
  const selectedLockers = useMemo(() => asArray(form.lockers), [form.lockers]);
  const baggageCounts = useMemo(
    () => (form.baggageCounts && typeof form.baggageCounts === "object" ? form.baggageCounts : {}),
    [form.baggageCounts],
  );
  const safeCustomerHistory = useMemo(() => {
    if (customerHistory && typeof customerHistory === "object" && !Array.isArray(customerHistory)) {
      return customerHistory;
    }

    const orders = asArray(customerHistory);
    return {
      ...emptyCustomerHistory,
      orders,
      activeOrders: orders.filter((order) => order.status === "Aktiv" || order.status === "Kechikdi"),
      visits: orders.length,
    };
  }, [customerHistory]);
  const customerActiveOrders = useMemo(() => asArray(safeCustomerHistory.activeOrders), [safeCustomerHistory.activeOrders]);
  const customerDuplicateOrders = useMemo(() => asArray(safeCustomerHistory.duplicateOrders), [safeCustomerHistory.duplicateOrders]);
  const tariffBySize = useMemo(() => {
    const rows = asArray(safePageData.tariffs).filter((tariff) => tariff.branch === currentBranch);
    return Object.fromEntries(rows.map((tariff) => [tariff.size, tariff]));
  }, [currentBranch, safePageData.tariffs]);
  const branchTariffHours = [1, 12, 24, 48, 72];
  const baggageSizes = useMemo(
    () => ["S", "M", "L", ...(XL_BRANCHES.has(currentBranch) ? ["XL"] : [])],
    [currentBranch],
  );
  const currencies = useMemo(() => {
    const configuredCurrencies = asArray(settings.currencies);
    return configuredCurrencies.length ? configuredCurrencies : ["UZS", "USD", "RUB", "EUR"];
  }, [settings.currencies]);
  const nextOrderId = useMemo(
    () => `BR-${String(Number(safePageData.orderCount || 0) + 1).padStart(6, "0")}`,
    [safePageData.orderCount],
  );
  const selectedHours = useMemo(
    () => Math.max(
      1,
      Number(form.tariffPreset === "custom" ? form.customHours : form.tariffPreset) || 1,
    ),
    [form.customHours, form.tariffPreset],
  );
  const isCustomTariff = form.tariffPreset === "custom";
  const exchangeRate = useMemo(
    () => (form.currency === "UZS" ? 1 : Number(settings.exchangeRates?.[form.currency] || 0)),
    [form.currency, settings.exchangeRates],
  );
  const baggageItems = useMemo(() => {
    const locker = selectedLockers[0];
    if (!locker) return [];

    return baggageSizes
      .map((size) => ({
        lockerId: locker.id || locker.lockerId,
        number: locker.number,
        size,
        count: Number(baggageCounts[size] || 0),
        currency: form.currency,
        tariffHours: selectedHours,
      }))
      .filter((item) => item.count > 0);
  }, [baggageCounts, baggageSizes, form.currency, selectedHours, selectedLockers]);
  const originalAmountUZS = useMemo(() => {
    return baggageItems.reduce((total, item) => total + priceForHours(tariffBySize[item.size], selectedHours, isCustomTariff) * item.count, 0);
  }, [baggageItems, isCustomTariff, selectedHours, tariffBySize]);
  const calculatedAmount = useMemo(
    () => convertFromUZS(originalAmountUZS, form.currency, settings.exchangeRates),
    [form.currency, originalAmountUZS, settings.exchangeRates],
  );
  const discount = useMemo(() => toMinorUnits(form.discount || 0, form.currency), [form.currency, form.discount]);
  const finalAmount = useMemo(() => Math.max(calculatedAmount - discount, 0), [calculatedAmount, discount]);
  const realPaidAmount = useMemo(
    () => (form.finalEdit ? toMinorUnits(form.realPaidAmount || 0, form.currency) : form.payment === "Qarz" ? 0 : finalAmount),
    [finalAmount, form.currency, form.finalEdit, form.payment, form.realPaidAmount],
  );
  const totalBaggageCount = useMemo(
    () => baggageItems.reduce((total, item) => total + Number(item.count || 0), 0),
    [baggageItems],
  );
  const checkOut = useMemo(() => {
    return addHoursToIso(parseTashkentInputToIso(form.checkIn), selectedHours);
  }, [form.checkIn, selectedHours]);
  const formatSizePrice = (size) => {
    const amountUZS = priceForHours(tariffBySize[size], selectedHours, isCustomTariff);
    const amount = convertFromUZS(amountUZS, form.currency, settings.exchangeRates);
    return formatMoneyByCurrency(amount, form.currency);
  };
  const canCreateOrderOnLocker = (locker) => {
    if (!locker) return false;
    if (locker.status === "Bosh") return true;
    return MULTI_ORDER_LOCKER_BRANCHES.has(currentBranch) && ["Band", "Kechikkan"].includes(locker.status);
  };

  useEffect(() => {
    let active = true;
    baggageService
      .getCustomerHistory({
        phone: form.phone,
        passport: form.passport,
        branchName: effectiveBranch,
      })
      .then((items) => {
        if (active) setCustomerHistory(items && typeof items === "object" ? items : emptyCustomerHistory);
      })
      .catch(() => {
        if (active) setCustomerHistory(emptyCustomerHistory);
      });
    return () => {
      active = false;
    };
  }, [form.phone, form.passport, effectiveBranch]);

  const lockers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return pageLockers
      .filter((locker) => locker.branch === currentBranch)
      .filter((locker) => {
        const status = locker.status;
        const matchesFilter =
          filter === "all" ||
          (filter === "free" && status === "Bosh") ||
          (filter === "busy" && status === "Band") ||
          (filter === "delayed" && status === "Kechikkan") ||
          (filter === "service" && status === "Servisda");
        const matchesSearch = !query || String(locker.number).includes(query);

        return matchesFilter && matchesSearch;
      });
  }, [pageLockers, currentBranch, filter, search]);

  const branchLockers = useMemo(
    () => pageLockers.filter((locker) => locker.branch === currentBranch),
    [currentBranch, pageLockers],
  );
  const ordersByKey = useMemo(() => {
    const lookup = new Map();
    for (const order of pageOrders) {
      if (order?.id) lookup.set(order.id, order);
      if (order?.orderNumber) lookup.set(order.orderNumber, order);
    }
    return lookup;
  }, [pageOrders]);
  const selectedOrder = useMemo(
    () => selectedLocker?.activeOrder || ordersByKey.get(selectedLocker?.activeOrderId) || null,
    [ordersByKey, selectedLocker],
  );
  const lockerStats = useMemo(() => ({
    total: branchLockers.length,
    free: branchLockers.filter((locker) => locker.status === "Bosh").length,
    busy: branchLockers.filter((locker) => locker.status === "Band").length,
    delayed: branchLockers.filter((locker) => locker.status === "Kechikkan").length,
  }), [branchLockers]);

  const updateForm = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateBaggageCount = (size, delta) => {
    setForm((prev) => {
      const counts = prev.baggageCounts && typeof prev.baggageCounts === "object" ? prev.baggageCounts : {};
      const nextCount = Math.max(0, Number(counts[size] || 0) + delta);
      return {
        ...prev,
        baggageCounts: {
          ...counts,
          [size]: nextCount,
        },
      };
    });
  };

  const openOrderPanel = (locker) => {
    setForm({
      ...getInitialForm(currentBranch, settings.defaultCurrency || "UZS"),
      lockers: [{ id: locker.id, lockerId: locker.id, number: locker.number, size: locker.size, price: locker.price }],
      baggageCounts: {},
    });
    setSelectedLocker(locker);
    setMessage("");
  };

  const openServiceModal = (locker) => {
    setServiceLocker(locker);
    setServiceReason(locker.serviceReason || "");
  };

  const handleBlockLocker = async () => {
    if (!serviceLocker) return;

    const locker = serviceLocker;
    const reason = serviceReason.trim();
    try {
      await lockerService.block(locker.branch, locker.number, {
        reason,
        admin: user?.fullName,
      });
    } catch (error) {
      setMessage(error.message || t("Yacheykani servisga o'tkazishda xatolik yuz berdi."));
      return;
    }
    if (selectedLocker?.id === locker.id) {
      setSelectedLocker(null);
      setForm(getInitialForm(defaultBranch, settings.defaultCurrency || "UZS"));
    }
    setServiceLocker(null);
    setServiceReason("");
    setRefreshKey((value) => value + 1);

    void telegramService.sendLockerBlock(locker, reason).catch(() => {
      // Telegram is best-effort from the local frontend.
    });
  };

  const handleUnblockLocker = async (locker) => {
    try {
      await lockerService.unblock(locker.branch, locker.number, {
        admin: user?.fullName,
      });
    } catch (error) {
      setMessage(error.message || t("Yacheykani qaytarishda xatolik yuz berdi."));
      return;
    }
    setRefreshKey((value) => value + 1);
  };

  const handleSave = async (print = false) => {
    if (savingAction) return;
    const nextAction = print ? "print" : "save";
    setSavingAction(nextAction);
    setMessage("");

    const fail = (text) => {
      setMessage(text);
      setSavingAction("");
    };
    const phoneRegex = /^\+?\d[\d\s-]{8,}$/;

    if (!form.client.trim()) {
      fail(t("Ism familiya majburiy."));
      return;
    }

    if (!phoneRegex.test(form.phone.trim())) {
      fail(t("Telefon raqamini to'g'ri kiriting. Masalan: +998 90 123 45 67"));
      return;
    }

    if (!selectedLockers.length) {
      fail(t("Kamida bitta yacheyka tanlang."));
      return;
    }

    if (!totalBaggageCount) {
      fail(t("Kamida bitta bagaj razmerini tanlang."));
      return;
    }

    if (baggageItems.some((item) => !tariffBySize[item.size])) {
      fail(t("Tanlangan bagaj razmeri uchun backend tarifi topilmadi."));
      return;
    }

    if (form.currency !== "UZS" && (!Number.isFinite(exchangeRate) || exchangeRate <= 0)) {
      fail(t("Tanlangan valyuta uchun kurs kiritilmagan."));
      return;
    }

    if (discount < 0 || discount > calculatedAmount) {
      fail(t("Skidka manfiy bo'lmasligi va umumiy summadan oshmasligi kerak."));
      return;
    }

    if (realPaidAmount !== finalAmount && form.payment !== "Qarz" && !form.paymentReason.trim()) {
      fail(t("Summani o'zgartirish sababini kiriting."));
      return;
    }

    let currentShift;

    try {
      currentShift = await shiftService.getCurrent(currentBranch);
    } catch (error) {
      fail(error?.message || t("Ochiq shiftni tekshirishda xatolik yuz berdi."));
      return;
    }

    if (!currentShift) {
      fail(t("Avval kassani oching. Ochiq shift topilmadi."));
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
        baggageItems,
        size: baggageItems.map((item) => `${item.size} x${item.count}`).join(", "),
        count: totalBaggageCount,
        checkIn: parseTashkentInputToIso(form.checkIn),
        checkOut,
        tariffHours: selectedHours,
        customHours: isCustomTariff ? selectedHours : undefined,
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
        debtAmount: form.payment === "Qarz" ? finalAmount - realPaidAmount : 0,
        paymentEditReason: form.paymentReason.trim(),
        note: form.note,
        admin: user?.fullName || "Admin",
        printed: print,
      });
    } catch (error) {
      fail(error?.message || t("Orderni saqlashda xatolik yuz berdi."));
      return;
    }

    if (print) {
      setReceiptOrder(order);
    }

    const orderLabel = order?.orderNumber || "-";
    setMessage(
      (print
        ? `${orderLabel} ${t("saqlandi va chek chiqarishga tayyor")}`
        : `${orderLabel} ${t("muvaffaqiyatli saqlandi")}`),
    );
    setSelectedLocker(null);
    setForm(getInitialForm(defaultBranch, settings.defaultCurrency || "UZS"));
    setRefreshKey((value) => value + 1);
    setSavingAction("");
  };

  const getStatusLabel = (status) => {
    if (status === "Bosh") return t("Bo'sh");
    if (status === "Band") return t("Band");
    if (status === "Kechikkan") return t("Kechikkan");
    if (status === "Servisda") return t("Servisda");
    return t(status || "-");
  };

  const handleCardClick = (locker) => {
    if (canCreateOrderOnLocker(locker)) {
      openOrderPanel(locker);
      return;
    }

    setSelectedLocker(locker);
  };

  const statusFilters = [
    ["all", t("Hammasi")],
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
          <p>{t("Aeroportda bo'sh yacheyka, vokzallarda band yacheyka ham order yaratadi.")}</p>
        </div>
      );
    }

    if (!canCreateOrderOnLocker(selectedLocker)) {
      return (
        <div className="locker-detail-panel">
          <div className="panel-locker-summary">
            <div>
              <span>{t("Yacheyka")}</span>
              <h2>#{selectedLocker.number}</h2>
            </div>
          </div>

          <div className={`panel-status ${selectedLocker.status}`}>
            {getStatusLabel(selectedLocker.status)}
          </div>

          {selectedOrder ? (
            <div className="panel-order-detail">
              <div>
                <span>{t("Order")}</span>
                <b>{selectedOrder.orderNumber || "-"}</b>
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
                <b>{t(getPaymentLabel(selectedOrder.payment))}</b>
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
            <b>{totalBaggageCount || 0} {t("ta")}</b>
          </div>

          <div className="panel-mini-actions">
            {selectedLocker.status === "Bosh" && (
              <button type="button" onClick={() => openServiceModal(selectedLocker)}>
                <Wrench size={15} />
                {t("Servisga o'tkazish")}
              </button>
            )}
          </div>

          {customerActiveOrders.length > 0 && (
            <div className="duplicate-warning">
              {t("Bu mijozda aktiv baggage mavjud")}: {customerActiveOrders.map((item) => item.orderNumber || "-").join(", ")}
            </div>
          )}

          {Number(safeCustomerHistory.visits || customerDuplicateOrders.length || 0) > 0 && (
            <div className="customer-history-box">
              <span>{t("Customer history")}</span>
              <b>{Number(safeCustomerHistory.visits || customerDuplicateOrders.length || 0)} {t("order")}</b>
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
                <input
                  inputMode="tel"
                  value={formatPhoneInput(form.phone)}
                  onChange={(event) => updateForm("phone", cleanPhoneInput(event.target.value))}
                  placeholder="+998 90 123 45 67"
                />
              </label>
              <label>
                <span>{t("Passport / ID")}</span>
                <input value={form.passport} onChange={(event) => updateForm("passport", event.target.value)} />
              </label>
            </div>
          </div>

          <div className="panel-section">
            <div className="baggage-size-head">
              <h3>{t("Bagaj razmerlari")}</h3>
              <span>{totalBaggageCount || 0} {t("ta")}</span>
            </div>
            <div className="baggage-size-picker">
              {baggageSizes.map((size) => {
                const count = Number(baggageCounts[size] || 0);
                return (
                  <div className="baggage-size-control" key={size}>
                    <div className="baggage-size-info">
                      <strong>{size}</strong>
                      <span>{formatSizePrice(size)}</span>
                    </div>
                    <div className="baggage-size-stepper">
                      <button
                        type="button"
                        onClick={() => updateBaggageCount(size, -1)}
                        disabled={!count}
                        aria-label={`${size} -`}
                      >
                        <Minus size={15} />
                      </button>
                      <b className={count > 0 ? "active" : ""}>{count}</b>
                      <button
                        type="button"
                        onClick={() => updateBaggageCount(size, 1)}
                        aria-label={`${size} +`}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {baggageItems.length > 0 && (
              <div className="baggage-size-summary">
                <span>{t("Yacheyka")}: #{selectedLockers[0]?.number || "-"}</span>
                <b>{baggageItems.map((item) => `${item.size}: ${item.count} ${t("ta")}`).join(" / ")}</b>
              </div>
            )}
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
                  {branchTariffHours.map((hours) => (
                    <option key={hours} value={hours}>{hours} {t("soat")}</option>
                  ))}
                  <option value="custom">{t("Qo'lda soat")}</option>
                </GlassSelect>
              </label>
              {form.tariffPreset === "custom" && (
                <label>
                  <span>{t("Soat")}</span>
                  <input
                    inputMode="numeric"
                    value={formatNumberInput(form.customHours)}
                    onChange={(event) => updateForm("customHours", cleanNumericInput(event.target.value))}
                  />
                </label>
              )}
              <label>
                <span>{t("Currency")}</span>
                <GlassSelect value={form.currency} onChange={(event) => updateForm("currency", event.target.value)}>
                  {currencies.map((currency) => (
                    <option value={currency} key={currency}>{currency}</option>
                  ))}
                </GlassSelect>
              </label>
              <label>
                <span>{t("To'lov turi")}</span>
                <GlassSelect value={form.payment} onChange={(event) => updateForm("payment", event.target.value)}>
                  {PAYMENT_OPTIONS.map((option) => (
                    <option value={option.value} key={option.value}>{t(option.label)}</option>
                  ))}
                </GlassSelect>
              </label>
              <label>
                <span>{t("Skidka")}</span>
                <input
                  inputMode="decimal"
                  value={formatNumberInput(form.discount, { decimal: form.currency !== "UZS" })}
                  onChange={(event) => updateForm("discount", cleanNumericInput(event.target.value, { decimal: form.currency !== "UZS" }))}
                />
              </label>
              <label>
                <span>{t("Real olingan summa")}</span>
                <input
                  inputMode="decimal"
                  value={formatNumberInput(form.finalEdit ? form.realPaidAmount : form.payment === "Qarz" ? "0" : fromMinorUnits(finalAmount, form.currency), { decimal: form.currency !== "UZS" })}
                  onFocus={() => updateForm("finalEdit", true)}
                  onChange={(event) => updateForm("realPaidAmount", cleanNumericInput(event.target.value, { decimal: form.currency !== "UZS" }))}
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
            <button className="save-btn" type="button" onClick={() => handleSave(false)} disabled={Boolean(savingAction)}>
              <Save size={17} />
              {savingAction === "save" ? t("Loading") : t("Save")}
            </button>
            <button className="print-btn" type="button" onClick={() => handleSave(true)} disabled={Boolean(savingAction)}>
              <Printer size={17} />
              {savingAction === "print" ? t("Loading") : t("Saqlash + Chek")}
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
        <div className="local-message">
          {error?.message || t("Ma'lumotlarni yuklashda xatolik yuz berdi.")}
          <button type="button" onClick={retry}>{t("Qayta urinish")}</button>
        </div>
      )}

      {message && <div className="local-message">{message}</div>}

      <div className={`locker-pos-layout ${selectedLocker ? "has-panel" : ""}`}>
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
                <span>{t("Status")}</span>
                {statusFilters.map(([value, label]) => (
                  <button type="button" key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>
                ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="card new-baggage-loading">
              <ListSkeleton rows={5} />
            </div>
          ) : (
            <div className="locker-grid">
              {lockers.map((locker) => {
                const activeOrderObj = ordersByKey.get(locker.activeOrderId);
                const lockerOrderLabel = activeOrderObj?.orderNumber || "-";
                return (
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
                    </div>
                    <div className={`locker-status-badge ${locker.status}`}>{getStatusLabel(locker.status)}</div>
                    {locker.activeOrderId && <div className="locker-order-link">{lockerOrderLabel}</div>}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside
          className={`locker-side-panel card ${selectedLocker ? "is-open" : ""}`}
          aria-hidden={!selectedLocker}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="side-panel-head">
            <div>
              <span>{t("Checkout")}</span>
              <h2>{selectedLocker ? `#${selectedLocker.number}` : t("Panel")}</h2>
            </div>
            {selectedLocker && (
              <button
                className="side-panel-clear"
                type="button"
                onClick={() => {
                  setSelectedLocker(null);
                  setForm(getInitialForm(defaultBranch, settings.defaultCurrency || "UZS"));
                }}
                aria-label={t("Clear")}
              >
                <X size={17} />
                <span>{t("Clear")}</span>
              </button>
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
                <p>#{serviceLocker.number}</p>
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
