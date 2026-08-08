import { createContext, useContext, useMemo, useState } from "react";

const LanguageContext = createContext({ language: "fr", setLanguage: () => {}, t: (key) => key });

const DICTIONARY = {
  fr: {
    overview: "Vue d'ensemble", growth: "Croissance", day: "Journée", routine: "Routine", notes: "Notes",
    refresh: "Actualiser", homeAssistant: "Tableau de bord Home Assistant", child: "Enfant",
    dayPeriod: "Jour", weekPeriod: "Semaine", monthPeriod: "30 jours", halfyearPeriod: "6 mois", yearPeriod: "1 an", allPeriod: "Total",
    track: "Suivi", measurements: "Mesures", note: "Note", feeding: "Repas", pumping: "Tirage", sleep: "Sommeil", diaper: "Changes", tummy: "Temps sur le ventre", temperature: "Température", weight: "Poids", height: "Taille", save: "Enregistrer", timer: "Chronomètre",
  },
  en: {
    overview: "Overview", growth: "Growth", day: "Day", routine: "Routine", notes: "Notes",
    refresh: "Refresh", homeAssistant: "Home Assistant dashboard", child: "Child",
    dayPeriod: "Day", weekPeriod: "Week", monthPeriod: "30 days", halfyearPeriod: "6 months", yearPeriod: "1 year", allPeriod: "Total",
    track: "Tracking", measurements: "Measurements", note: "Note", feeding: "Feedings", pumping: "Pumping", sleep: "Sleep", diaper: "Diapers", tummy: "Tummy time", temperature: "Temperature", weight: "Weight", height: "Height", save: "Save", timer: "Timer",
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem("baby-buddy-language") || "fr");
  const changeLanguage = (value) => { setLanguage(value); localStorage.setItem("baby-buddy-language", value); };
  const value = useMemo(() => ({ language, setLanguage: changeLanguage, t: (key) => DICTIONARY[language]?.[key] || DICTIONARY.fr[key] || key }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
