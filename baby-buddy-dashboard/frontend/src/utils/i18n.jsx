import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { LOCALES, localeFor, normalizeLanguage, translate } from "./i18nCore.js";
export { LANGUAGES, LOCALES, TRANSLATIONS, localeFor, normalizeLanguage, translate } from "./i18nCore.js";

const LanguageContext = createContext({
  language: "fr",
  locale: LOCALES.fr,
  setLanguage: () => {},
  t: (key, params) => translate(key, params, "fr"),
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      return normalizeLanguage(localStorage.getItem("baby-buddy-language"));
    } catch {
      return "fr";
    }
  });

  const setLanguage = (value) => {
    const normalized = normalizeLanguage(value);
    setLanguageState(normalized);
    try {
      localStorage.setItem("baby-buddy-language", normalized);
    } catch {
      // Storage can be unavailable in hardened/private browser contexts.
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => ({
    language,
    locale: localeFor(language),
    setLanguage,
    t: (key, params) => translate(key, params, language),
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
