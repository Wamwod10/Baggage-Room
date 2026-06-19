import "./appLoader.scss";
import { useTranslation } from "../../i18n/useTranslation";

export default function AppLoader({ label }) {
  const { t } = useTranslation();
  const displayLabel = label || `${t("Loading")}...`;

  return (
    <section className="app-loader" aria-busy="true" aria-live="polite">
      <div className="app-loader__card">
        <div className="app-loader__badge">BR</div>
        <div className="app-loader__copy">
          <span>{t("Baggage Room")}</span>
          <h1>{displayLabel}</h1>
        </div>
        <div className="app-loader__progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </section>
  );
}
