import "./statusBadge.scss";
import { useTranslation } from "../../i18n/useTranslation";

const statusLabels = {
  active: "Aktiv",
  completed: "Yakunlangan",
  overdue: "Kechikkan",
  pending: "Kutilmoqda",
};

export default function StatusBadge({ status = "pending", children }) {
  const { t } = useTranslation();
  return (
    <span className={`status-badge status-badge--${status}`}>
      {children || t(statusLabels[status] || status)}
    </span>
  );
}
