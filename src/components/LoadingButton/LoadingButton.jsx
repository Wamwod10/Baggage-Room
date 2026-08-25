import { LoaderCircle } from "lucide-react";
import "./loadingButton.scss";

export default function LoadingButton({
  type = "button",
  className = "",
  loading = false,
  loadingLabel = "Loading...",
  disabled = false,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={["loading-button", className].filter(Boolean).join(" ")}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      <span className="loading-button__content">
        <span className={loading ? "loading-button__idle is-hidden" : "loading-button__idle"}>
          {children}
        </span>
        <span className={loading ? "loading-button__loading" : "loading-button__loading is-hidden"}>
          <LoaderCircle className="loading-button__spinner" size={17} aria-hidden="true" />
          <span>{loadingLabel}</span>
        </span>
      </span>
    </button>
  );
}
