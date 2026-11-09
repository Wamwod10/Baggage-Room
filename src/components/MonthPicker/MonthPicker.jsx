import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { formatMonthLabel, getCurrentTashkentMonth, getMonthParts, makeMonthKey, MONTH_NAMES_UZ } from "./monthUtils";
import "./monthPicker.scss";

// Custom popover rather than browser's native month input: themeable, keyboard
// accessible, and rendered above tables and cards without clipping.
export default function MonthPicker({ value = "", onChange, label = "Oy bo‘yicha" }) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => getMonthParts(value)?.year || getMonthParts(getCurrentTashkentMonth())?.year || 2026);
  const [position, setPosition] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const popoverId = useId();
  const selected = getMonthParts(value);
  const nowKey = getCurrentTashkentMonth();

  useEffect(() => {
    if (!open) return undefined;

    const closeOutside = (event) => {
      if (!triggerRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const closeEscape = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const pad = 12;
      const width = Math.min(326, window.innerWidth - pad * 2);
      const left = Math.max(pad, Math.min(trigger.left, window.innerWidth - pad - width));
      const roomBelow = window.innerHeight - trigger.bottom;
      const top = roomBelow >= 335 || trigger.top < 345
        ? trigger.bottom + 9
        : Math.max(pad, trigger.top - 325);
      setPosition({ top, left, width, maxHeight: Math.max(190, window.innerHeight - top - pad) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const choose = (month) => {
    const next = makeMonthKey(year, month);
    if (!next) return;
    onChange?.(next);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const jumpToday = () => {
    onChange?.(nowKey);
    setYear(getMonthParts(nowKey)?.year || year);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const clear = () => {
    onChange?.("");
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="month-picker">
      <button
        ref={triggerRef}
        type="button"
        className={`month-picker__trigger${open ? " is-open" : ""}`}
        aria-label={`${label}: ${formatMonthLabel(value)}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => {
          if (!open) {
            setYear(getMonthParts(value)?.year || getMonthParts(nowKey)?.year || 2026);
            setPosition(null);
          }
          setOpen((current) => !current);
        }}
      >
        <CalendarDays size={17} aria-hidden="true" />
        <span className="month-picker__label">{label}</span>
        <span className={`month-picker__value${value ? " is-selected" : ""}`}>{formatMonthLabel(value)}</span>
        <ChevronDown size={16} className="month-picker__chevron" aria-hidden="true" />
      </button>
      {open && position && createPortal(
        <div
          className="month-picker__panel"
          id={popoverId}
          role="dialog"
          aria-label="Oy va yilni tanlash"
          ref={panelRef}
          style={position}
        >
          <div className="month-picker__panel-head">
            <div>
              <span className="month-picker__eyebrow">SAVDO TARIXI</span>
              <span className="month-picker__heading">Oy va yilni tanlang</span>
            </div>
            <div className="month-picker__year-control" aria-label="Yil tanlash">
              <button type="button" aria-label="Oldingi yil" disabled={year <= 2000} onClick={() => setYear((y) => Math.max(2000, y - 1))}>
                <ChevronLeft size={17} />
              </button>
              <strong aria-live="polite">{year}</strong>
              <button type="button" aria-label="Keyingi yil" disabled={year >= 2099} onClick={() => setYear((y) => Math.min(2099, y + 1))}>
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
          <div className="month-picker__grid" aria-label={`${year}-yil oylari`}>
            {MONTH_NAMES_UZ.map((name, index) => {
              const month = index + 1;
              const key = makeMonthKey(year, month);
              const isSelected = value === key;
              const isCurrent = nowKey === key;
              return (
                <button
                  type="button"
                  key={key}
                  className={`month-picker__month${isSelected ? " is-selected" : ""}${isCurrent ? " is-current" : ""}`}
                  aria-pressed={isSelected}
                  aria-label={`${name} ${year}${isCurrent ? ", joriy oy" : ""}`}
                  onClick={() => choose(month)}
                >
                  {name}
                  {isSelected && <Check size={13} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <div className="month-picker__footer">
            <button type="button" className="month-picker__clear" onClick={clear}>Barcha oylar</button>
            <button type="button" className="month-picker__today" onClick={jumpToday}>Joriy oy</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
