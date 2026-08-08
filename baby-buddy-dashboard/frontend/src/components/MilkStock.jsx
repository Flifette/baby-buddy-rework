import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api";
import SectionCard from "./SectionCard";
import { Icons } from "./Icons";
import { colors } from "../utils/colors";
import { formatVolume } from "../utils/units";
import { usePeriod } from "../utils/period";
import CustomTooltip from "./CustomTooltip";
import ChartDetailBar from "./ChartDetailBar";

const PERIOD_DAYS = { day: 1, week: 7, month: 30, halfyear: 183, year: 365, all: null };
const dayKey = (value) => new Date(value).toISOString().slice(0, 10);
const formatKey = (value, days) => new Date(value).toLocaleDateString("fr-FR", days === null ? { day: "2-digit", month: "short" } : days > 31 ? { month: "short", year: "2-digit" } : { day: "2-digit", month: "short" });
const responseList = (response) => Array.isArray(response) ? response : (Array.isArray(response?.results) ? response.results : []);

export default function MilkStock({ childId, onViewEntries }) {
  const { period } = usePeriod();
  const [data, setData] = useState({ pumping: [], feedings: [] });
  const [selectedBar, setSelectedBar] = useState(null);
  useEffect(() => {
    if (!childId) return;
    const days = PERIOD_DAYS[period];
    const filters = { child: childId, limit: 5000, ordering: "-start" };
    if (days) { const start = new Date(); start.setDate(start.getDate() - (days - 1)); filters.start_min = `${start.toISOString().slice(0, 10)}T00:00:00`; }
    Promise.all([api.getPumping(filters), api.getFeedings(filters)]).then(([pumping, feedings]) => setData({ pumping: responseList(pumping), feedings: responseList(feedings) })).catch(() => setData({ pumping: [], feedings: [] }));
  }, [childId, period]);
  const result = useMemo(() => {
    const consumed = data.feedings.filter((entry) => entry.type === "breast milk" && entry.method === "bottle" && entry.amount);
    const keys = new Map();
    [...data.pumping, ...consumed].forEach((entry) => { const key = dayKey(entry.start || entry.end); if (!keys.has(key)) keys.set(key, { key, label: formatKey(entry.start || entry.end, PERIOD_DAYS[period] ?? null), tire: 0, consomme: 0 }); });
    data.pumping.forEach((entry) => { const row = keys.get(dayKey(entry.start || entry.end)); if (row) row.tire += Number(entry.amount || 0); });
    consumed.forEach((entry) => { const row = keys.get(dayKey(entry.start || entry.end)); if (row) row.consomme += Number(entry.amount || 0); });
    const chart = [...keys.values()].sort((a, b) => a.key.localeCompare(b.key)).map((row) => ({ ...row, solde: row.tire - row.consomme }));
    const tire = chart.reduce((sum, row) => sum + row.tire, 0); const consomme = chart.reduce((sum, row) => sum + row.consomme, 0);
    return { chart, tire, consomme, stock: tire - consomme };
  }, [data, period]);
  const handleChartClick = (event) => { if (event?.activePayload?.[0]) { const p = event.activePayload[0]; setSelectedBar({ label: event.activeLabel, value: p.value, key: p.dataKey }); } };
  return <SectionCard title="Tirage de lait maternel" icon={<Icons.Pump />} color={colors.pumping}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14, textAlign: "center" }}>
      <div><strong style={{ color: colors.pumping }}>{formatVolume(result.tire)}</strong><br /><small>Tiré</small></div><div><strong>{formatVolume(result.consomme)}</strong><br /><small>Au biberon</small></div><div><strong style={{ color: result.stock < 0 ? "var(--error-color)" : colors.growth }}>{formatVolume(result.stock)}</strong><br /><small>Stock estimé</small></div>
    </div>
    <div style={{ height: 180 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={result.chart} onClick={handleChartClick}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-dim)" }} axisLine={false} tickLine={false} /><YAxis hide /><Tooltip content={<CustomTooltip />} /><Bar dataKey="tire" name="Tiré" fill={colors.pumping} radius={[5, 5, 0, 0]} cursor="pointer" /><Bar dataKey="consomme" name="Au biberon" fill={colors.feeding} radius={[5, 5, 0, 0]} cursor="pointer" /></BarChart></ResponsiveContainer></div>
    {selectedBar && <ChartDetailBar label={selectedBar.label} value={formatVolume(selectedBar.value)} unit="" color={selectedBar.key === "consomme" ? colors.feeding : colors.pumping} onViewEntries={() => { onViewEntries?.(selectedBar.label); setSelectedBar(null); }} onDismiss={() => setSelectedBar(null)} />}
  </SectionCard>;
}
