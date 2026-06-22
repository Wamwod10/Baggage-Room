import { useMemo, useState } from "react";
import { Plus, Trash2, Wallet } from "lucide-react";
import expenseService from "../../services/expenseService";
import { useAuth } from "../../store/AuthContext";
import { getBranchNames } from "../../utils/branches";
import StateBlock from "../../components/StateBlock/StateBlock";
import { ListSkeleton } from "../../components/Skeleton/Skeleton";
import GlassSelect from "../../components/GlassSelect/GlassSelect";
import usePageResource from "../../hooks/usePageResource";
import { useTranslation } from "../../i18n/useTranslation";
import { cleanNumericInput, formatNumberInput } from "../../utils/inputFormat";
import "./expenses.scss";
import { formatMoneyByCurrency } from "../../utils/currency";

const getInitialForm = (defaultBranch = getBranchNames()[0] || "") => ({
  category: "Printer qog'ozi",
  amount: "",
  currency: "UZS",
  branch: defaultBranch,
  note: "",
});
const asArray = (value) => (Array.isArray(value) ? value : []);

export default function Expenses() {
  const { t, formatMoney, formatDateTime } = useTranslation();
  const { effectiveBranch } = useAuth();
  const branchNames = getBranchNames();
  const defaultBranch = (effectiveBranch ? [effectiveBranch] : branchNames)[0] || "";
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState(() => getInitialForm(defaultBranch));
  const [formError, setFormError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: expenses = [],
    isLoading,
    error,
    retry,
  } = usePageResource(
    () => expenseService.getAll(effectiveBranch),
    [effectiveBranch, refreshKey],
    [],
  );

  const safeExpenses = useMemo(() => asArray(expenses), [expenses]);
  const totalExpense = useMemo(() => {
    return safeExpenses.reduce((sum, item) => sum + Number(item?.amount || 0), 0);
  }, [safeExpenses]);
  const branchOptions = useMemo(() => {
    return effectiveBranch ? [effectiveBranch] : branchNames;
  }, [branchNames, effectiveBranch]);
  const categoryOptions = useMemo(() => [
    "Printer qog'ozi",
    t("Cleaning"),
    t("Internet"),
    t("Taxi"),
    t("Other"),
  ], [t]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddExpense = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFormError("");
    setStatusMessage("");

    const fail = (text) => {
      setFormError(text);
      setIsSubmitting(false);
    };

    const amount = Number(cleanNumericInput(form.amount, { decimal: form.currency !== "UZS" }));

    if (!form.category.trim()) {
      fail(t("Kategoriya tanlanishi kerak."));
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      fail(t("Xarajat summasi 0 dan katta bo'lishi kerak."));
      return;
    }

    const branch = effectiveBranch || form.branch || defaultBranch;

    try {
      const createdExpense = await expenseService.create({
        ...form,
        branch,
        amount,
        currency: form.currency || "UZS",
      });
      setStatusMessage(`${createdExpense?.category || form.category} saqlandi: ${formatMoney(amount)}`);
    } catch (error) {
      fail(t(error.message || "Xarajatni saqlashda xatolik yuz berdi."));
      return;
    } finally {
      setIsSubmitting(false);
    }

    setRefreshKey((value) => value + 1);
    setFormError("");
    setForm(getInitialForm(defaultBranch));
  };

  const handleDelete = async (id) => {
    try {
      await expenseService.delete(id);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setFormError(t(error.message || "Xarajatni o'chirishda xatolik yuz berdi."));
    }
  };

  return (
    <section className="page expenses-page">
      <div className="page-header compact-header">
        <div>
          <h1>{t("Harajatlar")}</h1>
          <p>{t("Filial harajatlarini qo'shish va nazorat qilish")}</p>
        </div>

        <div className="expense-total-chip">
          <span>{t("Umumiy harajat")}</span>
          <b>{formatMoney(totalExpense)}</b>
        </div>
      </div>

      <div className="expenses-grid">
        <form className="expense-form card" onSubmit={handleAddExpense}>
          <div className="expense-title">
            <Wallet size={18} />
            <h2>{t("Harajat qo'shish")}</h2>
          </div>

          {formError && <div className="form-error">{formError}</div>}
          {statusMessage && <div className="expense-message">{statusMessage}</div>}

          <label>
            <span>{t("Kategoriya")}</span>
            <GlassSelect
              name="category"
              value={form.category}
              onChange={handleChange}
            >
              {categoryOptions.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </GlassSelect>
          </label>

          <label>
            <span>{t("Summa")}</span>
            <input
              name="amount"
              inputMode="decimal"
              value={formatNumberInput(form.amount, { decimal: form.currency !== "UZS" })}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  amount: cleanNumericInput(event.target.value, { decimal: prev.currency !== "UZS" }),
                }))
              }
              placeholder={t("Masalan: 50000")}
            />
          </label>

          <label>
            <span>{t("Currency")}</span>
            <GlassSelect name="currency" value={form.currency} onChange={handleChange}>
              <option value="UZS">UZS</option>
              <option value="USD">USD</option>
              <option value="RUB">RUB</option>
              <option value="EUR">EUR</option>
            </GlassSelect>
          </label>

          <label>
            <span>{t("Filial")}</span>
            <GlassSelect
              name="branch"
              value={effectiveBranch || form.branch || defaultBranch}
              onChange={handleChange}
              disabled={Boolean(effectiveBranch)}
            >
              {branchOptions.map((branch) => (
                <option key={branch} value={branch}>
                  {t(branch)}
                </option>
              ))}
            </GlassSelect>
          </label>

          <label>
            <span>{t("Note")}</span>
            <textarea
              name="note"
              value={form.note}
              onChange={handleChange}
              placeholder={t("Izoh...")}
            />
          </label>

          <button type="submit" className="expense-submit" disabled={isSubmitting}>
            <Plus size={17} />
            {isSubmitting ? t("Loading") : t("Qo'shish")}
          </button>
        </form>

        <div className="expense-list card">
          <div className="expense-list-head">
            <h2>{t("Harajatlar ro'yxati")}</h2>
            <span>{safeExpenses.length} {t("ta")}</span>
          </div>

          <div className="expense-items">
            {error && (
              <StateBlock
                type="error"
                compact
                title={t("Harajatlar yuklanmadi")}
                description={t("Harajatlar ro'yxatini o'qishda xatolik yuz berdi.")}
                actionLabel={t("Qayta urinish")}
                onAction={retry}
              />
            )}

            {isLoading && !error && <ListSkeleton rows={4} />}

            {!isLoading && !error && safeExpenses.length === 0 && (
              <StateBlock
                type="empty"
                compact
                title={t("Harajatlar yo'q")}
                description={t("Filial bo'yicha harajat qo'shilganda shu yerda chiqadi.")}
              />
            )}

            {!isLoading && !error && safeExpenses.map((expense) => (
              <div className="expense-item" key={expense.id}>
                <div>
                  <b>{expense.category || t("Kategoriya yo'q")}</b>
                  <span>{expense.branch ? t(expense.branch) : t("Filial tanlanmagan")}</span>
                  <small>{expense.createdAt ? formatDateTime(expense.createdAt) : t("Sana kiritilmagan")}</small>
                </div>

                <div className="expense-right">
                  <strong>
                    {formatMoneyByCurrency(expense.amount || 0, expense.currency || "UZS")}
                  </strong>
                  <button
                    type="button"
                    onClick={() => handleDelete(expense.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
