const BACKGROUND_KEY = "br_background_style";
const DEFAULT_BACKGROUND = "aurora";

export const BACKGROUND_OPTIONS = Object.freeze([
  { id: "aurora", label: "Aurora", image: "/backgrounds/aurora-blue.png" },
  { id: "emerald", label: "Emerald", image: "/backgrounds/emerald-night.png" },
  { id: "sunset", label: "Sunset", image: "/backgrounds/sunset-noir.png" },
  { id: "steel", label: "Steel", image: "/backgrounds/steel-night.png" },
]);

export const readBackgroundStyle = () => {
  try {
    const saved = localStorage.getItem(BACKGROUND_KEY);
    return BACKGROUND_OPTIONS.some((item) => item.id === saved) ? saved : DEFAULT_BACKGROUND;
  } catch {
    return DEFAULT_BACKGROUND;
  }
};

export const applyBackgroundStyle = (id) => {
  const next = BACKGROUND_OPTIONS.some((item) => item.id === id) ? id : DEFAULT_BACKGROUND;
  document.body.dataset.background = next;
  try {
    localStorage.setItem(BACKGROUND_KEY, next);
  } catch {
    // Keep the visual preference for this session even when storage is unavailable.
  }
  return next;
};

export const initializeUiPreferences = () => applyBackgroundStyle(readBackgroundStyle());
