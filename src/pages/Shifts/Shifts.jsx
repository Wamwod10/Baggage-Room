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
import baggageService from "../../services/baggageService";
import expenseService from "../../services/expenseService";
import { useAuth } from "../../store/AuthContext";
import telegramService from "../../services/telegramService";
import { getBranchByName, getBranchNames } from "../../utils/branches";
import StateBlock from "../../components/StateBlock/StateBlock";
import { ListSkeleton } from "../../components/Skeleton/Skeleton";
import usePageResource from "../../hooks/usePageResource";
import { useTranslation } from "../../i18n/useTranslation";
import { animateButtonIcon } from "../../utils/animateButtonIcon";
import "./shifts.scss";

const emptyShiftData = {
  shifts: [],
  currentShift: null,
};
const emptyShifts = [];

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
  const [closingCash, setClosingCash] = useState("");
  const [reportShift, setReportShift] = useState(null);
  const [formError, setFormError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const {
    data: shiftData = emptyShiftData,
    isLoading,
    error,
    retry,
  } = usePageResource(
    () => ({
      shifts: shiftService.getAll(effectiveBranch),
      currentShift: shiftService.getCurrent(branchName),
    }),
    [effectiveBranch, branchName, refreshKey],
    emptyShiftData,
  );

  const shifts = shiftData.shifts || emptyShifts;
  const currentShift = shiftData.currentShift || null;
  const selectedShiftTime = shiftOptions.some(
    (item) => item.label === shiftTime,
  )
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
    void shiftData;

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
      };
    }

    const openedTime = new Date(currentShift.openedAt).getTime();

    const shiftOrders = baggageService
      .getAll(branchName)
      .filter((order) => new Date(order.createdAt).getTime() >= openedTime);

    const shiftExpenses = expenseService
      .getAll(branchName)
      .filter((expense) => new Date(expense.createdAt).getTime() >= openedTime);

    const getOrderTotal = (order) =>
      Number(order.finalPrice || 0) + Number(order.overtimeAmount || 0);

    const revenue = shiftOrders.reduce(
      (sum, order) => sum + getOrderTotal(order),
      0,
    );
    const expenses = shiftExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0,
    );
    const paymentTotal = (paymentType) =>
      shiftOrders
        .filter((order) => order.payment === paymentType)
        .reduce((sum, order) => sum + getOrderTotal(order), 0);

    return {
      orders: shiftOrders.length,
      baggage: shiftOrders.reduce(
        (sum, order) => sum + Number(order.count || 0),
        0,
      ),
      revenue,
      expenses,
      netProfit: revenue - expenses,
      cash: paymentTotal("Naqd"),
      card: paymentTotal("Karta"),
      clickPayme: paymentTotal("Click/Payme"),
      transfer: paymentTotal("O'tkazma") + paymentTotal("O‘tkazma"),
    };
  }, [branchName, currentShift, shiftData]);

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
      const openedShift = shiftService.open({
        branch: branchName,
        admin: adminName.trim(),
        shiftTime: selectedShiftTime,
        openingCash,
      });

      setAdminName("");
      setOpeningCash("");
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
        setStatusMessage(
          `${t("Kassa ochildi")}. ${t("Telegram yuborilmadi")}: ${
            error.message || t("xatolik yuz berdi")
          }.`,
        );
      }
    } catch (error) {
      setFormError(error.message || t("Kassani ochishda xatolik yuz berdi."));
    }
  };

  const handleCloseShift = async () => {
    if (closingCash !== "" && Number(closingCash) < 0) {
      setFormError(t("Closing cash manfiy bo'lishi mumkin emas."));
      return;
    }

    try {
      const updatedShifts = shiftService.close(branchName, { closingCash });
      const closedShift = updatedShifts.find(
        (shift) => shift.branch === branchName && shift.closedAt,
      );

      setClosingCash("");
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
        setStatusMessage(
          `${t("Kassa yopildi")}. ${t("Telegram yuborilmadi")}: ${
            error.message || t("xatolik yuz berdi")
          }.`,
        );
      }
    } catch (error) {
      setFormError(error.message || t("Kassani yopishda xatolik yuz berdi."));
    }
  };

  const getReportText = (shift) => {
    if (!shift) return "";

    return `
📊 ${t("Kassa yopildi")}

🏢 ${t("Filial")}: ${t(shift.branch)}
👤 ${t("Admin")}: ${shift.admin}
🕘 ${t("Shift")}: ${shift.shiftTime || "-"}
🕒 ${t("Opened")}: ${formatDateTime(shift.openedAt)}
🔒 ${t("Closed")}: ${formatDateTime(shift.closedAt)}

💰 ${t("Revenue")}: ${formatMoney(shift.totalRevenue)}
📉 ${t("Expenses")}: ${formatMoney(shift.totalExpense)}
✅ ${t("Net profit")}: ${formatMoney(shift.netProfit)}
💵 ${t("Opening cash")}: ${formatMoney(shift.openingCash)}
🏁 ${t("Closing cash")}: ${formatMoney(shift.closingCash)}
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
          <p>{t("Kassani ochish, yopish va daily reportlarni boshqarish")}</p>
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
            <div
              className={
                currentShift
                  ? "shift-status-icon open"
                  : "shift-status-icon closed"
              }
            >
              {currentShift ? <Clock3 size={21} /> : <Lock size={21} />}
            </div>

            <div>
              <h2>{currentShift ? t("Kassa ochiq") : t("Kassa yopiq")}</h2>
              <p>
                {currentShift
                  ? `${t(currentShift.branch)} · ${currentShift.admin} · ${
                      currentShift.shiftTime || "-"
                    }`
                  : t("Hozir aktiv shift mavjud emas")}
              </p>
            </div>
          </div>

          {currentShift && (
            <div className="shift-open-time">
              <span>{t("Opened")}</span>
              <b>{formatDateTime(currentShift.openedAt)}</b>
            </div>
          )}
        </div>

        <div className="shift-mini-stat card">
          <span>{t("Revenue")}</span>
          <b>{formatMoney(currentStats.revenue)}</b>
        </div>

        <div className="shift-mini-stat card">
          <span>{t("Net profit")}</span>
          <b>{formatMoney(currentStats.netProfit)}</b>
        </div>

        <div className="shift-mini-stat card">
          <span>{t("Orders")}</span>
          <b>
            {currentStats.orders} {t("ta")}
          </b>
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
                <select
                  value={branchName}
                  onChange={(event) => setControlBranch(event.target.value)}
                  disabled={Boolean(effectiveBranch)}
                >
                  {(effectiveBranch ? [effectiveBranch] : branchNames).map(
                    (branch) => (
                      <option key={branch} value={branch}>
                        {t(branch)}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                <span>{t("Admin ismi")}</span>
                <input
                  value={adminName}
                  onChange={(event) => setAdminName(event.target.value)}
                  placeholder={t("Masalan: Aliyev Sardor")}
                />
              </label>

              <label>
                <span>{t("Shift vaqti")}</span>
                <select
                  value={selectedShiftTime}
                  onChange={(event) => setShiftTime(event.target.value)}
                  disabled={!shiftOptions.length}
                >
                  {shiftOptions.length ? (
                    shiftOptions.map((item) => (
                      <option key={item.label} value={item.label}>
                        {item.label}
                      </option>
                    ))
                  ) : (
                    <option value="">{t("Shift vaqti topilmadi")}</option>
                  )}
                </select>
              </label>

              <label>
                <span>{t("Opening cash")}</span>
                <input
                  type="number"
                  min="0"
                  value={openingCash}
                  onChange={(event) => setOpeningCash(event.target.value)}
                  placeholder={t("Masalan: 200000")}
                />
              </label>

              <button className="open-shift-btn" onClick={handleOpenShift}>
                <PlayCircle size={17} />
                {t("Kassani ochish")}
              </button>
            </div>
          ) : (
            <div className="shift-form">
              <div className="shift-current-box">
                <div>
                  <span>{t("Admin")}</span>
                  <b>{currentShift.admin}</b>
                </div>

                <div>
                  <span>{t("Shift vaqti")}</span>
                  <b>{currentShift.shiftTime || "-"}</b>
                </div>

                <div>
                  <span>{t("Opening cash")}</span>
                  <b>{formatMoney(currentShift.openingCash)}</b>
                </div>

                <div>
                  <span>{t("Baggage count")}</span>
                  <b>
                    {currentStats.baggage} {t("ta")}
                  </b>
                </div>
              </div>

              <label>
                <span>{t("Closing cash")}</span>
                <input
                  type="number"
                  min="0"
                  value={closingCash}
                  onChange={(event) => setClosingCash(event.target.value)}
                  placeholder={t("Masalan: 1500000")}
                />
              </label>

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
            <div>
              <span>{t("Naqd")}</span>
              <b>{formatMoney(currentStats.cash)}</b>
            </div>
            <div>
              <span>{t("Karta")}</span>
              <b>{formatMoney(currentStats.card)}</b>
            </div>
            <div>
              <span>Click/Payme</span>
              <b>{formatMoney(currentStats.clickPayme)}</b>
            </div>
            <div>
              <span>{t("O'tkazma")}</span>
              <b>{formatMoney(currentStats.transfer)}</b>
            </div>
            <div>
              <span>{t("Expenses")}</span>
              <b className="danger">{formatMoney(currentStats.expenses)}</b>
            </div>
          </div>
        </div>
      </div>

      <div className="shift-history card">
        <div className="shift-history-head">
          <h2>{t("Shift history")}</h2>
          <span>
            {shifts.length} {t("ta")}
          </span>
        </div>

        <div className="shift-history-table">
          <div className="shift-history-table-head">
            <span>{t("Branch/Admin")}</span>
            <span>{t("Shift")}</span>
            <span>{t("Opened")}</span>
            <span>{t("Closed")}</span>
            <span>{t("Revenue")}</span>
            <span>{t("Expense")}</span>
            <span>{t("Net profit")}</span>
            <span>{t("Status")}</span>
          </div>

          {isLoading && !error && <ListSkeleton rows={5} />}

          {!isLoading && !error && shifts.length === 0 && (
            <StateBlock
              type="empty"
              title={t("Shift history yo'q")}
              description={t(
                "Kassa ochilib-yopilganda shift tarixi shu yerda ko'rinadi.",
              )}
            />
          )}

          {!isLoading &&
            !error &&
            shifts.map((shift) => (
              <div className="shift-history-row" key={shift.id}>
                <div>
                  <b>{t(shift.branch)}</b>
                  <small>{shift.admin}</small>
                </div>

                <div>
                  <span>{shift.shiftTime || "-"}</span>
                </div>

                <div>
                  <span>{formatDateTime(shift.openedAt)}</span>
                </div>

                <div>
                  <span>
                    {shift.closedAt ? formatDateTime(shift.closedAt) : "-"}
                  </span>
                </div>

                <div>
                  <b>{formatMoney(shift.totalRevenue)}</b>
                </div>

                <div>
                  <b className="danger">{formatMoney(shift.totalExpense)}</b>
                </div>

                <div>
                  <b>{formatMoney(shift.netProfit)}</b>
                </div>

                <div>
                  <strong className={shift.status === "OPEN" ? "open" : "closed"}>
                    {t(shift.status)}
                  </strong>
                </div>
              </div>
            ))}
        </div>
      </div>

      {reportShift && (
        <div
          className="shift-report-backdrop"
          onClick={() => setReportShift(null)}
        >
          <div
            className="shift-report-modal card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shift-report-head">
              <div>
                <h2>{t("Daily report preview")}</h2>
                <p>{t("Telegramga yuboriladigan hisobot formati")}</p>
              </div>

              <button onClick={() => setReportShift(null)}>{t("Close")}</button>
            </div>

            <div className="telegram-report-box">
              <h3>📊 {t("Kassa yopildi")}</h3>
              <p>🏢 {t("Filial")}: {t(reportShift.branch)}</p>
              <p>👤 {t("Admin")}: {reportShift.admin}</p>
              <p>🕘 {t("Shift")}: {reportShift.shiftTime || "-"}</p>
              <p>🕒 {t("Opened")}: {formatDateTime(reportShift.openedAt)}</p>
              <p>🔒 {t("Closed")}: {formatDateTime(reportShift.closedAt)}</p>

              <div className="report-line" />

              <p>💰 {t("Revenue")}: {formatMoney(reportShift.totalRevenue)}</p>
              <p>📉 {t("Expenses")}: {formatMoney(reportShift.totalExpense)}</p>
              <p>✅ {t("Net profit")}: {formatMoney(reportShift.netProfit)}</p>
              <p>💵 {t("Opening cash")}: {formatMoney(reportShift.openingCash)}</p>
              <p>🏁 {t("Closing cash")}: {formatMoney(reportShift.closingCash)}</p>
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
