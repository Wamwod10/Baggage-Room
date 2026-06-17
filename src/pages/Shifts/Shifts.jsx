import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Clock3,
  Lock,
  PlayCircle,
  RefreshCcw,
  Square,
} from "lucide-react";
import shiftService from "../../services/shiftService";
import financeService from "../../services/financeService";
import { useAuth } from "../../store/AuthContext";
import { getBranchByName, getBranchNames } from "../../utils/branches";
import StateBlock from "../../components/StateBlock/StateBlock";
import { ListSkeleton } from "../../components/Skeleton/Skeleton";
import GlassSelect from "../../components/GlassSelect/GlassSelect";
import usePageResource from "../../hooks/usePageResource";
import { useTranslation } from "../../i18n/useTranslation";
import { animateButtonIcon } from "../../utils/animateButtonIcon";
import { formatMoneyByCurrency } from "../../utils/currency";
import { cleanNumericInput, formatNumberInput } from "../../utils/inputFormat";
import "./shifts.scss";

const emptyShiftData = {
  shifts: [],
  currentShift: null,
  branchName: "",
};
const asArray = (value) => (Array.isArray(value) ? value : []);
const fallback = (value, empty = "-") =>
  value === undefined || value === null || value === "" ? empty : value;

export default function Shifts() {
  const { t, formatDateTime, formatMoney } = useTranslation();
  const { effectiveBranch } = useAuth();
  const branchNames = getBranchNames();
  const [controlBranch, setControlBranch] = useState(
    effectiveBranch || branchNames[0] || "",
  );
  const branchName = effectiveBranch || controlBranch;
  const shiftOptions = useMemo(() => getBranchByName(branchName)?.shifts || [], [branchName]);

  const [refreshKey, setRefreshKey] = useState(0);
  const [adminName, setAdminName] = useState("");
  const [shiftTime, setShiftTime] = useState(shiftOptions[0]?.label || "");
  const [openingCash, setOpeningCash] = useState("");
  const [receivedFrom, setReceivedFrom] = useState("");
  const [acceptedAmount, setAcceptedAmount] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [handoverTo, setHandoverTo] = useState("");
  const [inkassaRecipient, setInkassaRecipient] = useState("");
  const [inkassaAmount, setInkassaAmount] = useState("");
  const [closingSalaryReceiver, setClosingSalaryReceiver] = useState("");
  const [closingSalaryAmount, setClosingSalaryAmount] = useState("");
  const [reportShift, setReportShift] = useState(null);
  const [formError, setFormError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [pendingAction, setPendingAction] = useState("");

  const {
    data: shiftData = emptyShiftData,
    isLoading,
    error,
    retry,
  } = usePageResource(
    async () => {
      const requestedBranch = branchName;
      const [shifts, currentShift] = await Promise.all([
        shiftService.getAll(requestedBranch),
        shiftService.getCurrent(requestedBranch),
      ]);
      return { branchName: requestedBranch, shifts: asArray(shifts), currentShift: currentShift || null };
    },
    [effectiveBranch, branchName, refreshKey],
    emptyShiftData,
  );

  const safeShiftData = shiftData && typeof shiftData === "object" ? shiftData : emptyShiftData;
  const isCurrentBranchData = safeShiftData.branchName === branchName;
  const shifts = isCurrentBranchData ? asArray(safeShiftData.shifts) : [];
  const currentShift = isCurrentBranchData ? safeShiftData.currentShift || null : null;
  const selectedShiftTime = shiftOptions.some((item) => item.label === shiftTime)
    ? shiftTime
    : shiftOptions[0]?.label || "";

  useEffect(() => {
    if (!reportShift) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setReportShift(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [reportShift]);

  const refreshData = (event) => {
    if (event) {
      animateButtonIcon(event);
    }

    setRefreshKey((value) => value + 1);
  };

  const currentStats = useMemo(() => {
    void refreshKey;

    if (!currentShift) {
      return {
        orders: 0,
        baggage: 0,
        revenue: 0,
        expenses: 0,
        netProfit: 0,
        cash: 0,
        card: 0,
        clickPayme: 0,
        transfer: 0,
        debt: 0,
        inkassa: 0,
        cashLeft: 0,
      };
    }

    return {
      orders: Number(currentShift.ordersCount || currentShift.orders || 0),
      baggage: Number(currentShift.ordersCount || currentShift.orders || 0),
      revenue: Number(currentShift.totalRevenue || 0),
      expenses: Number(currentShift.expenseAmount || currentShift.totalExpense || 0),
      netProfit:
        Number(currentShift.totalRevenue || 0) -
        Number(currentShift.expenseAmount || currentShift.totalExpense || 0) -
        Number(currentShift.inkassaAmount || currentShift.totalInkassa || 0),
      cash: Number(currentShift.cashRevenue || 0),
      card: Number(currentShift.cardRevenue || 0),
      clickPayme: 0,
      transfer: Number(currentShift.transferRevenue || 0),
      debt: Number(currentShift.debtAmount || 0),
      inkassa: Number(currentShift.inkassaAmount || currentShift.totalInkassa || 0),
      cashLeft: Number(currentShift.systemExpectedCash ?? currentShift.expectedCash ?? currentShift.openingCash ?? 0),
    };
  }, [currentShift, refreshKey]);

  const formatCurrencyMap = (items = {}) =>
    Object.entries(items || {})
      .filter(([, amount]) => Number(amount || 0) > 0)
      .map(([currency, amount]) => formatMoneyByCurrency(amount, currency))
      .join(" / ") || formatMoney(0);

  const handleOpenShift = async () => {
    if (pendingAction) return;
    setPendingAction("open");
    setFormError("");
    setStatusMessage("");

    const fail = (text) => {
      setFormError(text);
      setPendingAction("");
    };

    if (!adminName.trim()) {
      fail(t("Admin ismini kiriting."));
      return;
    }

    if (!selectedShiftTime) {
      fail(t("Shift vaqtini tanlang."));
      return;
    }

    if (openingCash !== "" && Number(openingCash) < 0) {
      fail(t("Opening cash manfiy bo'lishi mumkin emas."));
      return;
    }

    try {
      await shiftService.open({
        branch: branchName,
        admin: adminName.trim(),
        shiftTime: selectedShiftTime,
        openingCash,
        receivedFrom: receivedFrom.trim(),
        acceptedAmount: acceptedAmount || openingCash,
      });

      setAdminName("");
      setOpeningCash("");
      setReceivedFrom("");
      setAcceptedAmount("");
      setFormError("");
      refreshData();

      setStatusMessage(`${t("Kassa ochildi")}.`);
    } catch (error) {
      setFormError(error.message || t("Kassani ochishda xatolik yuz berdi."));
    } finally {
      setPendingAction("");
    }
  };

  const createInkassaRecord = async ({ recipient, amount }) => {
    if (!currentShift) throw new Error(t("Bu filialda ochiq smena yo'q"));

    return financeService.createInkassa({
      branch: branchName,
      admin: currentShift?.admin || adminName || "Admin",
      recipient: recipient.trim(),
      amount,
      currency: "UZS",
    });
  };

  const validateInkassa = (recipient, amountValue) => {
    const amount = Number(amountValue || 0);

    if (!recipient.trim() || !Number.isFinite(amount) || amount <= 0) {
      return t("Inkassa uchun kimga berildi va summa majburiy.");
    }

    if (amount > currentStats.cashLeft) {
      return t("Inkassa summasi kassada qolgan puldan oshmasligi kerak.");
    }

    return "";
  };

  const handleCloseShift = async () => {
    if (pendingAction) return;
    setPendingAction("close");
    setFormError("");
    setStatusMessage("");

    const fail = (text) => {
      setFormError(text);
      setPendingAction("");
    };

    if (!handoverTo.trim()) {
      fail(t("Kimga topshirilishini kiriting."));
      return;
    }

    if (closingCash === "") {
      fail(t("Closing cash summasini kiriting."));
      return;
    }

    const closingCashAmount = Number(closingCash);

    if (!Number.isFinite(closingCashAmount)) {
      fail(t("Closing cash summasini to'g'ri kiriting."));
      return;
    }

    if (closingCash !== "" && Number(closingCash) < 0) {
      fail(t("Closing cash manfiy bo'lishi mumkin emas."));
      return;
    }

    const closeSalaryAmount = Number(closingSalaryAmount || 0);

    if (closingSalaryAmount !== "" && (!Number.isFinite(closeSalaryAmount) || closeSalaryAmount < 0)) {
      fail(t("Oylik summasi manfiy bo'lishi mumkin emas."));
      return;
    }

    if (closeSalaryAmount > 0 && !closingSalaryReceiver.trim()) {
      fail(t("Oylik uchun kimga berilganini kiriting."));
      return;
    }

    if (closeSalaryAmount > currentStats.cashLeft) {
      fail(t("Oylik summasi kassada qolgan puldan oshmasligi kerak."));
      return;
    }

    try {
      const closedShift = await shiftService.close(branchName, {
        closingCash,
        handoverTo: handoverTo.trim(),
        salaryAmount: closeSalaryAmount,
        salaryReceiver: closingSalaryReceiver.trim(),
      });

      setClosingCash("");
      setHandoverTo("");
      setClosingSalaryReceiver("");
      setClosingSalaryAmount("");
      setFormError("");
      refreshData();
      setReportShift(closedShift);

      setStatusMessage(`${t("Kassa yopildi")}.`);
    } catch (error) {
      setFormError(error.message || t("Kassani yopishda xatolik yuz berdi."));
    } finally {
      setPendingAction("");
    }
  };

  const handleInkassa = async () => {
    if (pendingAction) return;
    setPendingAction("inkassa");
    setFormError("");
    setStatusMessage("");

    const fail = (text) => {
      setFormError(text);
      setPendingAction("");
    };

    const amount = Number(inkassaAmount || 0);
    const inkassaError = validateInkassa(inkassaRecipient, amount);

    if (!currentShift) {
      fail(t("Bu filialda ochiq smena yo'q"));
      return;
    }

    if (inkassaError) {
      fail(inkassaError);
      return;
    }

    try {
      await createInkassaRecord({
        recipient: inkassaRecipient,
        amount,
      });

      setInkassaRecipient("");
      setInkassaAmount("");
      setFormError("");
      setStatusMessage(`${t("Inkassa saqlandi")}: ${formatMoney(amount)}`);
      refreshData();
    } catch (error) {
      setFormError(error.message || t("Inkassa saqlashda xatolik yuz berdi."));
    } finally {
      setPendingAction("");
    }
  };

  const getReportText = (shift) => {
    if (!shift) return "";
    const regularExpense = Math.max(Number(shift.totalExpense || 0) - Number(shift.salaryAmount || 0), 0);

    return `
${t("Smenani topshirdi")}:
${fallback(shift.admin)} -> ${fallback(shift.handoverToName || shift.handoverTo)}

${t("Bugungi")}:
${t("Umumiy savdo")}: ${formatMoney(shift.totalRevenue)}
${t("Naqd")}: ${formatCurrencyMap(shift.report?.cashByCurrency)}
${t("Terminal")}: ${formatCurrencyMap(shift.report?.terminalByCurrency)}
${t("Qarz")}: ${formatCurrencyMap(shift.report?.debtByCurrency)}

${t("Oldingi smenadan qabul")}: ${formatMoney(shift.acceptedAmount)}
${t("Rasxod")}: ${formatMoney(regularExpense)}
${t("Oylik")}: ${formatMoney(shift.salaryAmount)}
${t("Inkassa")}: ${formatMoney(shift.totalInkassa)}
${t("Kassada qolgan")}: ${formatMoney(shift.cashLeft ?? shift.closingCash ?? shift.systemExpectedCash ?? 0)}
`.trim();
  };

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(getReportText(reportShift));
      setStatusMessage(t("Hisobot nusxalandi"));
    } catch {
      setStatusMessage(t("Nusxalashda xatolik yuz berdi"));
    }
  };

  return (
    <section className="page shifts-page">
      <div className="page-header compact-header">
        <div>
          <h1>{t("Kassa / Shift")}</h1>
          <p>{t("Kassani ochish, yopish, inkassa va daily reportlarni boshqarish")}</p>
        </div>

        <button type="button" className="shift-refresh-btn" onClick={refreshData}>
          <RefreshCcw size={16} />
          {t("Refresh")}
        </button>
      </div>

      {error && (
        <StateBlock
          type="error"
          title={t("Shift ma'lumotlari yuklanmadi")}
          description={t("Kassa tarixini o'qishda xatolik yuz berdi.")}
          actionLabel={t("Qayta urinish")}
          onAction={retry}
        />
      )}

      {statusMessage && <div className="shift-message">{statusMessage}</div>}

      <div className="shift-top-grid">
        <div className="shift-status-card card">
          <div className="shift-status-left">
            <div className={currentShift ? "shift-status-icon open" : "shift-status-icon closed"}>
              {currentShift ? <Clock3 size={21} /> : <Lock size={21} />}
            </div>

            <div>
              <h2>{currentShift ? t("Kassa ochiq") : t("Kassa yopiq")}</h2>
              <p>
                {currentShift
                  ? `${t(fallback(currentShift.branch, "Ma'lumot yo'q"))} - ${fallback(currentShift.admin)} - ${fallback(currentShift.shiftTime)}`
                  : t("Bu filialda ochiq smena yo'q")}
              </p>
            </div>
          </div>

          {currentShift && (
            <div className="shift-open-time">
              <span>{t("Opened")}</span>
              <b>{currentShift.openedAt ? formatDateTime(currentShift.openedAt) : "-"}</b>
            </div>
          )}
        </div>

        <div className="shift-mini-stat card">
          <span>{t("Revenue")}</span>
          <b>{formatMoney(currentStats.revenue)}</b>
        </div>
        <div className="shift-mini-stat card">
          <span>{t("Qarz")}</span>
          <b>{formatMoney(currentStats.debt)}</b>
        </div>
        <div className="shift-mini-stat card">
          <span>{t("Kassada qolgan")}</span>
          <b>{formatMoney(currentStats.cashLeft)}</b>
        </div>
      </div>

      <div className="shift-main-grid">
        <div className="shift-control card">
          <div className="shift-card-title">
            <Banknote size={18} />
            <h2>{t("Kassa control")}</h2>
          </div>

          {formError && <div className="form-error">{formError}</div>}

          {!currentShift ? (
            <div className="shift-form">
              <label>
                <span>{t("Filial")}</span>
                <GlassSelect
                  value={branchName}
                  onChange={(event) => {
                    setControlBranch(event.target.value);
                    setFormError("");
                    setStatusMessage("");
                    setShiftTime(getBranchByName(event.target.value)?.shifts?.[0]?.label || "");
                  }}
                  disabled={Boolean(effectiveBranch)}
                >
                  {(effectiveBranch ? [effectiveBranch] : branchNames).map((branch) => (
                    <option key={branch} value={branch}>{t(branch)}</option>
                  ))}
                </GlassSelect>
              </label>
              <label>
                <span>{t("Admin ismi")}</span>
                <input value={adminName} onChange={(event) => setAdminName(event.target.value)} placeholder={t("Masalan: Aliyev Sardor")} />
              </label>
              <label>
                <span>{t("Shift vaqti")}</span>
                <GlassSelect value={selectedShiftTime} onChange={(event) => setShiftTime(event.target.value)} disabled={!shiftOptions.length}>
                  {shiftOptions.length ? (
                    shiftOptions.map((item) => <option key={item.label} value={item.label}>{item.label}</option>)
                  ) : (
                    <option value="">{t("Shift vaqti topilmadi")}</option>
                  )}
                </GlassSelect>
              </label>
              <label>
                <span>{t("Kimdan")}</span>
                <input value={receivedFrom} onChange={(event) => setReceivedFrom(event.target.value)} placeholder={t("Oldingi admin")} />
              </label>
              <label>
                <span>{t("Qabul qilingan summa")}</span>
                <input inputMode="numeric" value={formatNumberInput(acceptedAmount)} onChange={(event) => setAcceptedAmount(cleanNumericInput(event.target.value))} placeholder={t("Masalan: 200000")} />
              </label>
              <label>
                <span>{t("Opening cash")}</span>
                <input inputMode="numeric" value={formatNumberInput(openingCash)} onChange={(event) => setOpeningCash(cleanNumericInput(event.target.value))} placeholder={t("Masalan: 200000")} />
              </label>
              <button type="button" className="open-shift-btn" onClick={handleOpenShift} disabled={Boolean(pendingAction)}>
                <PlayCircle size={17} />
                {pendingAction === "open" ? t("Loading") : t("Kassani ochish")}
              </button>
            </div>
          ) : (
            <div className="shift-form">
              <div className="shift-current-box">
                <div><span>{t("Admin")}</span><b>{fallback(currentShift.admin)}</b></div>
                <div><span>{t("Kimdan")}</span><b>{fallback(currentShift.receivedFrom || currentShift.acceptedFromName)}</b></div>
                <div><span>{t("Qabul")}</span><b>{formatMoney(currentShift.acceptedAmount || currentShift.acceptedCash || 0)}</b></div>
                <div><span>{t("Baggage count")}</span><b>{currentStats.baggage} {t("ta")}</b></div>
              </div>
              <label>
                <span>{t("Kimga")}</span>
                <input value={handoverTo} onChange={(event) => setHandoverTo(event.target.value)} placeholder={t("Keyingi admin")} />
              </label>
              <label>
                <span>{t("Closing cash")}</span>
                <input inputMode="numeric" value={formatNumberInput(closingCash)} onChange={(event) => setClosingCash(cleanNumericInput(event.target.value))} placeholder={t("Masalan: 1500000")} />
              </label>
              <div className="close-inkassa-panel">
                <div className="close-inkassa-title">
                  <span>{t("Oylik")}</span>
                  <small>{t("Ixtiyoriy")}</small>
                </div>
                <label>
                  <span>{t("Kimga")}</span>
                  <input value={closingSalaryReceiver} onChange={(event) => setClosingSalaryReceiver(event.target.value)} placeholder={t("Masalan: xodim ismi")} />
                </label>
                <label>
                  <span>{t("Summa")}</span>
                  <input inputMode="numeric" value={formatNumberInput(closingSalaryAmount)} onChange={(event) => setClosingSalaryAmount(cleanNumericInput(event.target.value))} placeholder={t("Masalan: 300000")} />
                </label>
              </div>
              <button type="button" className="close-shift-btn" onClick={handleCloseShift} disabled={Boolean(pendingAction)}>
                <Square size={16} />
                {pendingAction === "close" ? t("Loading") : t("Kassani yopish")}
              </button>
            </div>
          )}
        </div>

        <div className="shift-payment card">
          <div className="shift-card-title">
            <Banknote size={18} />
            <h2>{t("Payment breakdown")}</h2>
          </div>

          <div className="payment-breakdown-list">
            <div><span>{t("Naqd")}</span><b>{formatMoney(currentStats.cash)}</b></div>
            <div><span>{t("Terminal")}</span><b>{formatMoney(currentStats.card)}</b></div>
            <div><span>Click/Payme</span><b>{formatMoney(currentStats.clickPayme)}</b></div>
            <div><span>{t("Qarz")}</span><b className="danger">{formatMoney(currentStats.debt)}</b></div>
            <div><span>{t("Expenses")}</span><b className="danger">{formatMoney(currentStats.expenses)}</b></div>
            <div><span>{t("Inkassa")}</span><b className="danger">{formatMoney(currentStats.inkassa)}</b></div>
            <div><span>{t("Kassada qolgan")}</span><b>{formatMoney(currentStats.cashLeft)}</b></div>
          </div>

          {currentShift && (
            <div className="inkassa-box standalone">
              <div className="inkassa-box__head">
                <div>
                  <h3>{t("Inkassa")}</h3>
                  <p>{t("Smena davomida kassadan pul chiqarish")}</p>
                </div>
                <b>{formatMoney(currentStats.cashLeft)}</b>
              </div>
              <label>
                <span>{t("Inkassa kimga")}</span>
                <input value={inkassaRecipient} onChange={(event) => setInkassaRecipient(event.target.value)} placeholder={t("Masalan: bosh kassir")} />
              </label>
              <label>
                <span>{t("Summa")}</span>
                <input inputMode="numeric" value={formatNumberInput(inkassaAmount)} onChange={(event) => setInkassaAmount(cleanNumericInput(event.target.value))} placeholder={t("Masalan: 500000")} />
              </label>
              <button type="button" onClick={handleInkassa} disabled={Boolean(pendingAction)}>
                {pendingAction === "inkassa" ? t("Loading") : t("Inkassa qilish")}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="shift-history card">
        <div className="shift-history-head">
          <h2>{t("Shift history")}</h2>
          <span>{shifts.length} {t("ta")}</span>
        </div>

        <div className="shift-history-table">
          <div className="shift-history-table-head">
            <span>{t("Branch/Admin")}</span>
            <span>{t("Shift")}</span>
            <span>{t("Opened")}</span>
            <span>{t("Closed")}</span>
            <span>{t("Revenue")}</span>
            <span>{t("Expense")}</span>
            <span>{t("Qarz")}</span>
            <span>{t("Net profit")}</span>
            <span>{t("Status")}</span>
          </div>

          {isLoading && !error && <ListSkeleton rows={5} />}

          {!isLoading && !error && shifts.length === 0 && (
            <StateBlock
              type="empty"
              title={t("Shift history yo'q")}
              description={t("Kassa ochilib-yopilganda shift tarixi shu yerda ko'rinadi.")}
            />
          )}

          {!isLoading && !error && shifts.map((shift) => (
            <div className="shift-history-row" key={shift.id}>
              <div><b>{t(fallback(shift.branch, "Ma'lumot yo'q"))}</b><small>{fallback(shift.admin)}</small></div>
              <div><span>{fallback(shift.shiftTime)}</span></div>
              <div><span>{shift.openedAt ? formatDateTime(shift.openedAt) : "-"}</span></div>
              <div><span>{shift.closedAt ? formatDateTime(shift.closedAt) : "-"}</span></div>
              <div><b>{formatMoney(shift.totalRevenue)}</b></div>
              <div><b className="danger">{formatMoney(shift.totalExpense)}</b></div>
              <div><b className="danger">{formatMoney(shift.totalDebt)}</b></div>
              <div><b>{formatMoney(shift.netProfit)}</b></div>
              <div><strong className={shift.status === "OPEN" ? "open" : "closed"}>{t(fallback(shift.status))}</strong></div>
            </div>
          ))}
        </div>
      </div>

      {reportShift && (
        <div className="shift-report-backdrop" onClick={() => setReportShift(null)}>
          <div className="shift-report-modal card" onClick={(event) => event.stopPropagation()}>
            <div className="shift-report-head">
              <div>
                <h2>{t("Daily report preview")}</h2>
                <p>{t("Telegramga yuboriladigan hisobot formati")}</p>
              </div>
              <button type="button" onClick={() => setReportShift(null)}>{t("Close")}</button>
            </div>

            <div className="telegram-report-box">
              <h3>{t("Smenani topshirdi")}:</h3>
              <p>{fallback(reportShift.admin)} {"->"} {fallback(reportShift.handoverToName || reportShift.handoverTo)}</p>
              <div className="report-line" />
              <p>{t("Umumiy savdo")}: {formatMoney(reportShift.totalRevenue)}</p>
              <p>{t("Naqd")}: {formatCurrencyMap(reportShift.report?.cashByCurrency)}</p>
              <p>{t("Terminal")}: {formatCurrencyMap(reportShift.report?.terminalByCurrency)}</p>
              <p>{t("Qarz")}: {formatCurrencyMap(reportShift.report?.debtByCurrency)}</p>
              <p>{t("Oldingi smenadan qabul")}: {formatMoney(reportShift.acceptedAmount)}</p>
              <p>{t("Rasxod")}: {formatMoney(Math.max(Number(reportShift.totalExpense || 0) - Number(reportShift.salaryAmount || 0), 0))}</p>
              <p>{t("Oylik")}: {formatMoney(reportShift.salaryAmount)}</p>
              <p>{t("Inkassa")}: {formatMoney(reportShift.totalInkassa)}</p>
              <p>{t("Kassada qolgan")}: {formatMoney(reportShift.cashLeft ?? reportShift.closingCash ?? reportShift.systemExpectedCash ?? 0)}</p>
            </div>

            <button type="button" className="report-copy-btn" onClick={handleCopyReport}>
              {t("Copy report")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
