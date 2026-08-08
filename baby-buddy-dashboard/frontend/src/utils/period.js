import { createContext, useContext } from "react";
export const PERIODS = [["day", "Jour"], ["week", "Semaine"], ["month", "30 jours"], ["halfyear", "6 mois"], ["year", "1 an"], ["all", "Total"]];
export const PeriodContext = createContext({ period: "week", setPeriod: () => {} });
export const usePeriod = () => useContext(PeriodContext);
