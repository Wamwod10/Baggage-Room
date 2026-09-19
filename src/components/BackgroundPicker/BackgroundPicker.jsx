import { Check, Palette } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BACKGROUND_OPTIONS, applyBackgroundStyle, readBackgroundStyle } from "../../utils/uiPreferences";
import settingsService from "../../services/settingsService";
import "./backgroundPicker.scss";

export default function BackgroundPicker({ t = (value) => value }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(readBackgroundStyle);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div className="background-picker" ref={rootRef}>
      <button
        type="button"
        className="header-icon-btn"
        onClick={() => setOpen((value) => !value)}
        aria-label={t("Orqa fon")}
        title={t("Orqa fon")}
      >
        <Palette size={18} />
      </button>

      {open && (
        <div className="background-picker__panel">
          <div className="background-picker__head">
            <b>{t("Orqa fon")}</b>
            <span>{t("Ko'rinishni tanlang")}</span>
          </div>
          <div className="background-picker__grid">
            {BACKGROUND_OPTIONS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`background-picker__option ${selected === item.id ? "active" : ""}`}
                onClick={() => {
                  const settings = settingsService.get();
                  if (settings.theme !== "dark") {
                    settingsService.save({ ...settings, theme: "dark" });
                    document.body.classList.add("dark");
                  }
                  setSelected(applyBackgroundStyle(item.id));
                  setOpen(false);
                }}
              >
                <span className="background-picker__preview" style={{ backgroundImage: `url(${item.image})` }} />
                <span>{item.label}</span>
                {selected === item.id && <Check size={15} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
