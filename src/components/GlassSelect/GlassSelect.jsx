import { Children, isValidElement, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import "./glassSelect.scss";

const textFromChildren = (children) =>
  Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return child;
      if (isValidElement(child)) return textFromChildren(child.props.children);
      return "";
    })
    .join("");

export default function GlassSelect({
  children,
  className = "",
  disabled = false,
  name,
  onChange,
  value,
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const selectRef = useRef(null);
  const menuRef = useRef(null);
  const options = useMemo(
    () =>
      Children.toArray(children)
        .filter((child) => isValidElement(child))
        .map((child) => {
          const label = textFromChildren(child.props.children);
          const optionValue = child.props.value ?? label;

          return {
            disabled: Boolean(child.props.disabled),
            label,
            value: String(optionValue),
          };
        }),
    [children],
  );
  const selected = options.find((option) => option.value === String(value)) || options[0];

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        !selectRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const updateMenuPosition = () => {
      const rect = selectRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportPadding = 12;
      const availableWidth = window.innerWidth - viewportPadding * 2;
      const width = Math.min(rect.width, availableWidth);
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        window.innerWidth - width - viewportPadding,
      );

      setMenuStyle({
        left,
        top: rect.bottom + 8,
        width,
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  const handleSelect = (option) => {
    if (option.disabled) return;

    setOpen(false);
    onChange?.({
      target: {
        name,
        value: option.value,
      },
    });
  };

  return (
    <div
      className={`glass-select ${open ? "is-open" : ""} ${disabled ? "is-disabled" : ""} ${className}`.trim()}
      ref={selectRef}
    >
      <button
        type="button"
        className="glass-select__trigger"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label || ""}</span>
        <ChevronDown size={16} />
      </button>

      {open && !disabled && createPortal(
        <div className="glass-select__menu" ref={menuRef} style={menuStyle}>
          {options.map((option) => (
            <button
              type="button"
              key={`${option.value}-${option.label}`}
              className={option.value === String(value) ? "active" : ""}
              disabled={option.disabled}
              onClick={() => handleSelect(option)}
            >
              {option.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
