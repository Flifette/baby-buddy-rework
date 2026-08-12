import fr from "../locales/fr.js";
import en from "../locales/en.js";

export const LANGUAGES = ["fr", "en"];
export const LOCALES = { fr: "fr-FR", en: "en-US" };
export const TRANSLATIONS = { fr, en };

export function normalizeLanguage(value) {
  return LANGUAGES.includes(value) ? value : "fr";
}

export function translate(key, params = {}, language = "fr") {
  const normalized = normalizeLanguage(language);
  const value = TRANSLATIONS[normalized]?.[key] ?? TRANSLATIONS.fr[key];
  if (typeof value === "function") return value(params);
  return value ?? key;
}

export function localeFor(language) {
  return LOCALES[normalizeLanguage(language)];
}
