import {
  AlertCircle,
  Archive,
  BarChart3,
  Bell,
  Briefcase,
  FileSearch,
  RefreshCcw,
} from "lucide-react";
import "./stateBlock.scss";

const icons = {
  analytics: BarChart3,
  baggage: Briefcase,
  bell: Bell,
  empty: Archive,
  error: AlertCircle,
  search: FileSearch,
};

export default function StateBlock({
  type = "empty",
  icon,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}) {
  const Icon = icon || icons[type] || icons.empty;

  return (
    <div className={`state-block ${type} ${compact ? "compact" : ""}`}>
      <div className="state-block-icon">
        <Icon size={compact ? 20 : 26} />
      </div>

      <div>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>

      {actionLabel && onAction && (
        <button type="button" onClick={onAction}>
          {type === "error" && <RefreshCcw size={16} />}
          {actionLabel}
        </button>
      )}
    </div>
  );
}
