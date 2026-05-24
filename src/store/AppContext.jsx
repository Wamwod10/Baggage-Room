/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from "react";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() =>
    document.body.classList.contains("dark") ? "dark" : "light"
  );

  const toggleSidebar = () => {
    setSidebarOpen((value) => !value);
  };

  const toggleTheme = () => {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      document.body.classList.toggle("dark", nextTheme === "dark");
      return nextTheme;
    });
  };

  const value = useMemo(
    () => ({
      sidebarOpen,
      theme,
      setSidebarOpen,
      toggleSidebar,
      toggleTheme,
    }),
    [sidebarOpen, theme]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp must be used inside AppProvider");
  }

  return context;
}
