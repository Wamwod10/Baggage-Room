import { useMemo, useState } from "react";
import { Plus, Trash2, Wallet } from "lucide-react";
import expenseService from "../../services/expenseService";
import { useAuth } from "../../store/AuthContext";
import { getBranchNames } from "../../utils/branches";
import StateBlock from "../../components/StateBlock/StateBlock";
import { ListSkeleton } from "../../components/Skeleton/Skeleton";
import usePageResource from "../../hooks/usePageResource";
import { useTranslation } from "../../i18n/useTranslation";
import "./expenses.scss";

const getInitialForm = (defaultBranch = getBranchNames()[0] || "") => ({
  category: "Printer qog'ozi",
  amount: "",
  branch: defaultBranch,
  note: "",
});

export default function Expenses() {
  const { t, formatMoney, formatDateTime } = useTranslation();
  const { effectiveBranch } = useAuth();
  const branchNames = getBranchNames();
  const availableBranches = effectiveBranch ? [effectiveBranch] : branchNames;
  const defaultBranch = availableBranches[0] || "";
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState(() => getInitialForm(defaultBranch));
  const [formError, setFormError] = useState("");

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

  const totalExpense = useMemo(() => {
    return expenses.reduce((sum, item) => sum + Number(item?.amount || 0), 0);
  }, [expenses]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddExpense = (event) => {
    event.preventDefault();

    const amount = Number(form.amount);

    if (!form.category.trim()) {
      setFormError("Kategoriya tanlanishi kerak.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Harajat summasi 0 dan katta bo'lishi kerak.");
      return;
    }

    const branch = effectiveBranch || form.branch || defaultBranch;

    try {
      expenseService.create({
        ...form,
        branch,
        amount,
      });
    } catch {
      setFormError("Harajatni saqlashda xatolik yuz berdi.");
      return;
    }

    setRefreshKey((value) => value + 1);
    setFormError("");
    setForm(getInitialForm(defaultBranch));
  };

  const handleDelete = (id) => {
    try {
      expenseService.delete(id);
      setRefreshKey((value) => value + 1);
    } catch {
      setFormError("Harajatni o'chirishda xatolik yuz berdi.");
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

          <label>
            <span>{t("Kategoriya")}</span>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
            >
              <option>Printer qog'ozi</option>
              <option>{t("Cleaning")}</option>
              <option>{t("Internet")}</option>
              <option>{t("Taxi")}</option>
              <option>{t("Other")}</option>
            </select>
          </label>

          <label>
            <span>{t("Summa")}</span>
            <input
              name="amount"
              type="number"
              min="1"
              value={form.amount}
              onChange={handleChange}
              placeholder="Masalan: 50000"
            />
          </label>

          <label>
            <span>{t("Filial")}</span>
            <select
              name="branch"
              value={effectiveBranch || form.branch || defaultBranch}
              onChange={handleChange}
              disabled={Boolean(effectiveBranch)}
            >
              {availableBranches.map((branch) => (
                <option key={branch} value={branch}>
                  {t(branch)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{t("Note")}</span>
            <textarea
              name="note"
              value={form.note}
              onChange={handleChange}
              placeholder="Izoh..."
            />
          </label>

          <button type="submit" className="expense-submit">
            <Plus size={17} />
            {t("Qo'shish")}
          </button>
        </form>

        <div className="expense-list card">
          <div className="expense-list-head">
            <h2>{t("Harajatlar ro'yxati")}</h2>
            <span>{expenses.length} {t("ta")}</span>
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

            {!isLoading && !error && expenses.length === 0 && (
              <StateBlock
                type="empty"
                compact
                title={t("Harajatlar yo'q")}
                description={t("Filial bo'yicha harajat qo'shilganda shu yerda chiqadi.")}
              />
            )}

            {!isLoading && !error && expenses.map((expense) => (
              <div className="expense-item" key={expense.id}>
                <div>
                  <b>{expense.category || t("Kategoriya yo'q")}</b>
                  <span>{expense.branch ? t(expense.branch) : t("Filial tanlanmagan")}</span>
                  <small>{expense.createdAt ? formatDateTime(expense.createdAt) : t("Sana kiritilmagan")}</small>
                </div>

                <div className="expense-right">
                  <strong>{formatMoney(expense.amount)}</strong>
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
