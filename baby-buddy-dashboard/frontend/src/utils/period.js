import { createContext, useContext } from "react";
export const PERIODS = ["day", "week", "month", "halfyear", "year", "all"];
export const PeriodContext = createContext({ period: "week", setPeriod: () => {} });
export const usePeriod = () => useContext(PeriodContext);
