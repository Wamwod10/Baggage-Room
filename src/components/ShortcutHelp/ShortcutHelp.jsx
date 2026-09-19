import { Keyboard, X } from "lucide-react";
import { useEffect } from "react";
import "./shortcutHelp.scss";

export const SHORTCUTS = Object.freeze([
  ["N", "Yangi bagaj"],
  ["/", "Qidiruv"],
  ["A", "Aktiv bagajlar"],
  ["P", "Pickup (tanlangan order/modal ichida)"],
  ["Ctrl + Enter", "Saqlash / Tasdiqlash"],
  ["Esc", "Modalni yopish"],
  ["Shift + ?", "Shortcutlar oynasi"],
]);

export default function ShortcutHelp({ open, onClose, t = (value) => value }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="shortcut-help__backdrop" onMouseDown={onClose}>
      <section className="shortcut-help" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div className="shortcut-help__icon"><Keyboard size={22} /></div>
          <div><h3>{t("Keyboard shortcuts")}</h3><p>{t("Operator uchun tezkor tugmalar")}</p></div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="shortcut-help__list">
          {SHORTCUTS.map(([key, label]) => (
            <div key={key}><span>{t(label)}</span><kbd>{key}</kbd></div>
          ))}
        </div>
        <small>{t("Input ichida yozayotganda global shortcutlar ishlamaydi.")}</small>
      </section>
    </div>
  );
}
