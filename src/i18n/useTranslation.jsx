/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from "react";
import settingsService from "../services/settingsService";
import {
  FALLBACK_LANGUAGE,
  getCurrencyLabel,
  getLocale,
  normalizeLanguage,
  translate,
} from "./translations";
import { formatTashkentDateTime } from "../utils/formatDate";

const I18nContext = createContext(null);

const readLanguage = () => {
  try {
    return normalizeLanguage(settingsService.get()?.language);
  } catch {
    return FALLBACK_LANGUAGE;
  }
};

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(readLanguage);

  const setLanguage = (nextLanguage) => {
    const normalizedLanguage = normalizeLanguage(nextLanguage);

    setLanguageState(normalizedLanguage);

    try {
      const settings = settingsService.get();
      settingsService.save({
        ...settings,
        language: normalizedLanguage,
      });
    } catch {
      // UI still switches language even if settings persistence fails.
    }
  };

  const value = useMemo(() => {
    const locale = getLocale(language);
    const currencyLabel = getCurrencyLabel(language);

    const formatNumber = (valueToFormat) =>
      Number(valueToFormat || 0).toLocaleString(locale);

    const formatMoney = (valueToFormat) =>
      `${formatNumber(valueToFormat)} ${currencyLabel}`;

    const formatDateTime = (valueToFormat) => {
      if (!valueToFormat) return "-";
      return formatTashkentDateTime(valueToFormat, locale);
    };

    return {
      language,
      locale,
      currencyLabel,
      setLanguage,
      t: (key, params) => translate(key, language, params),
      formatNumber,
      formatMoney,
      formatDateTime,
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useTranslation must be used inside I18nProvider");
  }

  return context;
}
