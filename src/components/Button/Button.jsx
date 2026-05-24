import "./button.scss";

export default function Button({
  type = "button",
  variant = "primary",
  className = "",
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={["button", `button--${variant}`, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
