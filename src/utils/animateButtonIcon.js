export function animateButtonIcon(event) {
  const icon = event.currentTarget.querySelector("svg");

  if (!icon) return;

  icon.classList.remove("icon-spin-once");
  void icon.getBoundingClientRect();
  icon.classList.add("icon-spin-once");

  icon.addEventListener(
    "animationend",
    () => {
      icon.classList.remove("icon-spin-once");
    },
    { once: true },
  );
}
