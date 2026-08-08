import { createContext, useContext } from "react";

const labels = {
  metric: { volume: "mL", weight: "kg", length: "cm", temp: "°C" },
  imperial: { volume: "oz", weight: "lb", length: "in", temp: "°F" },
};

export const UnitContext = createContext("metric");

export function useUnits() {
  const system = useContext(UnitContext);
  return labels[system] || labels.metric;
}

export function formatVolume(value, system = "metric") {
  const amount = Number(value || 0);
  if (system === "imperial") return `${(amount / 29.5735).toFixed(amount < 30 ? 1 : 0)} oz`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(amount >= 10000 ? 1 : 2).replace(/\.0+$/, "")} L`;
  // Keep metric volumes simple and consistent: mL below one litre, L at or above one litre.
  return `${Math.round(amount)} mL`;
}
