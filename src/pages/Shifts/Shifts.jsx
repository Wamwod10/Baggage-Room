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
import telegramService from "../../services/telegramService";
import { getBranchByName, getBranchNames } from "../../utils/branches";
import StateBlock from "../../components/StateBlock/StateBlock";
import { ListSkeleton } from "../../components/Skeleton/Skeleton";
import GlassSelect from "../../components/GlassSelect/GlassSelect";
import usePageResource from "../../hooks/usePageResource";
import { useTranslation } from "../../i18n/useTranslation";
import { animateButtonIcon } from "../../utils/animateButtonIcon";
import { formatMoneyByCurrency } from "../../utils/currency";
import "./shifts.scss";

const emptyShiftData = {
  shifts: [],
  currentShift: null,
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
  const branchConfig = getBranchByName(branchName);
  const shiftOptions = branchConfig?.shifts || [];

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
  const [closingInkassaRecipient, setClosingInkassaRecipient] = useState("");
  const [closingInkassaAmount, setClosingInkassaAmount] = useState("");
  const [reportShift, setReportShift] = useState(null);
  const [formError, setFormError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const {
    data: shiftData = emptyShiftData,
    isLoading,
    error,
    retry,
  } = usePageResource(
    async () => {
      const [shifts, currentShift] = await Promise.all([
        shiftService.getAll(branchName),
        shiftService.getCurrent(branchName),
      ]);
      return { shifts: asArray(shifts), currentShift: currentShift || null };
    },
    [effectiveBranch, branchName, refreshKey],
    emptyShiftData,
  );

  const safeShiftData = shiftData && typeof shiftData === "object" ? shiftData : emptyShiftData;
  const shifts = asArray(safeShiftData.shifts);
  const currentShift = safeShiftData.currentShift || null;
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
      orders: 0,
      baggage: 0,
      revenue: Number(currentShift.totalRevenue || 0),
      expenses: Number(currentShift.expenseAmount || currentShift.totalExpense || 0),
      netProfit: Number(currentShift.totalRevenue || 0) - Number(currentShift.expenseAmount || currentShift.totalExpense || 0),
      cash: Number(currentShift.cashRevenue || 0),
      card: Number(currentShift.cardRevenue || 0),
      clickPayme: 0,
      transfer: Number(currentShift.transferRevenue || 0),
      debt: Number(currentShift.debtAmount || 0),
      inkassa: Number(currentShift.inkassaAmount || currentShift.totalInkassa || 0),
      cashLeft: Number(currentShift.systemExpectedCash || currentShift.expectedCash || currentShift.openingCash || 0),
    };
  }, [currentShift, refreshKey]);

  const formatCurrencyMap = (items = {}) =>
    Object.entries(items || {})
      .filter(([, amount]) => Number(amount || 0) > 0)
      .map(([currency, amount]) => formatMoneyByCurrency(amount, currency))
      .join(" / ") || formatMoney(0);

  const handleOpenShift = async () => {
    if (!adminName.trim()) {
      setFormError(t("Admin ismini kiriting."));
      return;
    }

    if (!selectedShiftTime) {
      setFormError(t("Shift vaqtini tanlang."));
      return;
    }

    if (openingCash !== "" && Number(openingCash) < 0) {
      setFormError(t("Opening cash manfiy bo'lishi mumkin emas."));
      return;
    }

    try {
      const openedShift = await shiftService.open({
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

      try {
        const telegramResult = await telegramService.sendShiftOpened(openedShift);
        setStatusMessage(
          telegramResult?.skipped
            ? `${t("Kassa ochildi")}. ${t("Telegram yuborilmadi")}: ${telegramResult.reason}.`
            : `${t("Kassa ochildi")}. ${t("Telegram xabar yuborildi.")}`,
        );
      } catch (error) {
        setStatusMessage(`${t("Kassa ochildi")}. ${t("Telegram yuborilmadi")}: ${error.message || t("xatolik yuz berdi")}.`);
      }
    } catch (error) {
      setFormError(error.message || t("Kassani ochishda xatolik yuz berdi."));
    }
  };

  const sendInkassaNotification = async (item) => {
    try {
      await telegramService.sendInkassa(item);
    } catch {
      // Telegram is best-effort.
    }
  };

  const createInkassaRecord = async ({ recipient, amount }) => {
    if (!currentShift) throw new Error(t("Bu filialda ochiq smena yo'q"));

    const item = await financeService.createInkassa({
      branch: branchName,
      admin: currentShift?.admin || adminName || "Admin",
      recipient: recipient.trim(),
      amount,
      currency: "UZS",
    });

    await sendInkassaNotification(item);
    return item;
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
    if (closingCash !== "" && Number(closingCash) < 0) {
      setFormError(t("Closing cash manfiy bo'lishi mumkin emas."));
      return;
    }

    const closeInkassaAmount = Number(closingInkassaAmount || 0);

    if (closingInkassaAmount !== "" && (!Number.isFinite(closeInkassaAmount) || closeInkassaAmount < 0)) {
      setFormError(t("Inkassa summasi manfiy bo'lishi mumkin emas."));
      return;
    }

    if (closeInkassaAmount > 0) {
      const inkassaError = validateInkassa(closingInkassaRecipient, closeInkassaAmount);

      if (inkassaError) {
        setFormError(inkassaError);
        return;
      }
    }

    try {
      if (closeInkassaAmount > 0) {
        await createInkassaRecord({
          recipient: closingInkassaRecipient,
          amount: closeInkassaAmount,
        });
      }

      const closedShift = await shiftService.close(branchName, {
        closingCash,
        handoverTo: handoverTo.trim(),
      });

      setClosingCash("");
      setHandoverTo("");
      setClosingInkassaRecipient("");
      setClosingInkassaAmount("");
      setFormError("");
      refreshData();
      setReportShift(closedShift);

      try {
        const telegramResult = await telegramService.sendShiftClosed(closedShift);
        setStatusMessage(
          telegramResult?.skipped
            ? `${t("Kassa yopildi")}. ${t("Telegram yuborilmadi")}: ${telegramResult.reason}.`
            : `${t("Kassa yopildi")}. ${t("Telegram xabar yuborildi.")}`,
        );
      } catch (error) {
        setStatusMessage(`${t("Kassa yopildi")}. ${t("Telegram yuborilmadi")}: ${error.message || t("xatolik yuz berdi")}.`);
      }
    } catch (error) {
      setFormError(error.message || t("Kassani yopishda xatolik yuz berdi."));
    }
  };

  const handleInkassa = async () => {
    const amount = Number(inkassaAmount || 0);
    const inkassaError = validateInkassa(inkassaRecipient, amount);

    if (!currentShift) {
      setFormError(t("Bu filialda ochiq smena yo'q"));
      return;
    }

    if (inkassaError) {
      setFormError(inkassaError);
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
    }
  };

  const getReportText = (shift) => {
    if (!shift) return "";

    return `
${t("Smenani topshirdi")}:
${fallback(shift.admin)} -> ${fallback(shift.handoverToName || shift.handoverTo)}

${t("Bugungi")}:
${t("Umumiy savdo")}: ${formatMoney(shift.totalRevenue)}
Cash: ${formatCurrencyMap(shift.report?.cashByCurrency)}
Terminal: ${formatCurrencyMap(shift.report?.terminalByCurrency)}
${t("Qarz")}: ${formatCurrencyMap(shift.report?.debtByCurrency)}

${t("Oldingi smenadan qabul")}: ${formatMoney(shift.acceptedAmount)}
${t("Rasxod")}: ${formatMoney(shift.totalExpense)}
${t("Inkassa")}: ${formatMoney(shift.totalInkassa)}
${t("Kassada qolgan")}: ${formatMoney(shift.cashLeft || shift.closingCash)}
`.trim();
  };

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(getReportText(reportShift));
      setStatusMessage(t("Report copy qilindi"));
    } catch {
      setStatusMessage(t("Copy qilishda xatolik"));
    }
  };

  return (
    <section className="page shifts-page">
      <div className="page-header compact-header">
        <div>
          <h1>{t("Kassa / Shift")}</h1>
          <p>{t("Kassani ochish, yopish, inkassa va daily reportlarni boshqarish")}</p>
        </div>

        <button className="shift-refresh-btn" onClick={refreshData}>
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
                <GlassSelect value={branchName} onChange={(event) => setControlBranch(event.target.value)} disabled={Boolean(effectiveBranch)}>
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
                <input type="number" min="0" value={acceptedAmount} onChange={(event) => setAcceptedAmount(event.target.value)} placeholder={t("Masalan: 200000")} />
              </label>
              <label>
                <span>{t("Opening cash")}</span>
                <input type="number" min="0" value={openingCash} onChange={(event) => setOpeningCash(event.target.value)} placeholder={t("Masalan: 200000")} />
              </label>
              <button className="open-shift-btn" onClick={handleOpenShift}>
                <PlayCircle size={17} />
                {t("Kassani ochish")}
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
                <input type="number" min="0" value={closingCash} onChange={(event) => setClosingCash(event.target.value)} placeholder={t("Masalan: 1500000")} />
              </label>
              <div className="close-inkassa-panel">
                <div className="close-inkassa-title">
                  <span>{t("Kassa yopishda inkassa")}</span>
                  <small>{t("Ixtiyoriy")}</small>
                </div>
                <label>
                  <span>{t("Inkassa kimga")}</span>
                  <input value={closingInkassaRecipient} onChange={(event) => setClosingInkassaRecipient(event.target.value)} placeholder={t("Masalan: bosh kassir")} />
                </label>
                <label>
                  <span>{t("Summa")}</span>
                  <input type="number" min="0" value={closingInkassaAmount} onChange={(event) => setClosingInkassaAmount(event.target.value)} placeholder={t("Masalan: 500000")} />
                </label>
              </div>
              <button className="close-shift-btn" onClick={handleCloseShift}>
                <Square size={16} />
                {t("Kassani yopish")}
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
            <div><span>{t("Karta")}</span><b>{formatMoney(currentStats.card)}</b></div>
            <div><span>Click/Payme</span><b>{formatMoney(currentStats.clickPayme)}</b></div>
            <div><span>{t("O'tkazma")}</span><b>{formatMoney(currentStats.transfer)}</b></div>
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
                <input type="number" min="0" value={inkassaAmount} onChange={(event) => setInkassaAmount(event.target.value)} placeholder={t("Masalan: 500000")} />
              </label>
              <button type="button" onClick={handleInkassa}>{t("Inkassa qilish")}</button>
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
              <button onClick={() => setReportShift(null)}>{t("Close")}</button>
            </div>

            <div className="telegram-report-box">
              <h3>{t("Smenani topshirdi")}:</h3>
              <p>{fallback(reportShift.admin)} {"->"} {fallback(reportShift.handoverToName || reportShift.handoverTo)}</p>
              <div className="report-line" />
              <p>{t("Umumiy savdo")}: {formatMoney(reportShift.totalRevenue)}</p>
              <p>Cash: {formatCurrencyMap(reportShift.report?.cashByCurrency)}</p>
              <p>Terminal: {formatCurrencyMap(reportShift.report?.terminalByCurrency)}</p>
              <p>{t("Qarz")}: {formatCurrencyMap(reportShift.report?.debtByCurrency)}</p>
              <p>{t("Oldingi smenadan qabul")}: {formatMoney(reportShift.acceptedAmount)}</p>
              <p>{t("Rasxod")}: {formatMoney(reportShift.totalExpense)}</p>
              <p>{t("Inkassa")}: {formatMoney(reportShift.totalInkassa)}</p>
              <p>{t("Kassada qolgan")}: {formatMoney(reportShift.cashLeft || reportShift.closingCash)}</p>
            </div>

            <button className="report-copy-btn" onClick={handleCopyReport}>
              {t("Copy report")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

