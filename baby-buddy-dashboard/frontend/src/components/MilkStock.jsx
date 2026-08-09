import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import SectionCard from "./SectionCard";
import CustomTooltip from "./CustomTooltip";
import ChartDetailBar from "./ChartDetailBar";
import { Icons } from "./Icons";
import { colors } from "../utils/colors";
import { formatTime } from "../utils/formatters";
import { formatVolume } from "../utils/units";
import { usePeriod } from "../utils/period";

const PERIOD_DAYS = { day: 1, week: 7, month: 30, halfyear: 183, year: 365, all: null };

function dayKey(value) {
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function hourLabel(value) {
  return new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatKey(value, days) {
  return new Date(value).toLocaleDateString(
    "fr-FR",
    days === null
      ? { day: "2-digit", month: "short", year: "2-digit" }
      : days > 31
        ? { month: "short", year: "2-digit" }
        : { day: "2-digit", month: "short" },
  );
}

function FixedTimeBar({ x = 0, y = 0, width = 0, height = 0, fill, value }) {
  if (!Number(value) || height <= 0) return null;
  const fixedWidth = 10;
  return <rect x={x + width / 2 - fixedWidth / 2} y={y} width={fixedWidth} height={height} fill={fill} rx="4" ry="4" />;
}

export default function MilkStock({ pumping = [], feedings = [], milkWaste = [], onEditWaste }) {
  const { period } = usePeriod();
  const [selectedBar, setSelectedBar] = useState(null);

  useEffect(() => setSelectedBar(null), [period]);

  const result = useMemo(() => {
    const days = PERIOD_DAYS[period];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (days) start.setDate(start.getDate() - (days - 1));
    const end = new Date();
    end.setHours(24, 0, 0, 0);
    const inPeriod = (value) => {
      if (!value) return false;
      if (days === null) return true;
      const timestamp = new Date(value).getTime();
      return timestamp >= start.getTime() && timestamp < end.getTime();
    };

    const periodPumping = pumping.filter((entry) => inPeriod(entry.start || entry.end));
    const periodConsumed = feedings.filter((entry) => entry.type === "breast milk" && entry.method === "bottle" && entry.amount && inPeriod(entry.start || entry.end));
    const periodWaste = milkWaste.filter((entry) => inPeriod(entry.time));
    let chart;

    if (period === "day") {
      chart = [
        ...periodPumping.map((entry) => ({ timestamp: new Date(entry.start || entry.end).getTime(), amount: Number(entry.amount || 0), key: "tire", name: "Tiré", color: colors.pumping })),
        ...periodConsumed.map((entry) => ({ timestamp: new Date(entry.start || entry.end).getTime(), amount: Number(entry.amount || 0), key: "consomme", name: "Lait maternel au biberon", color: colors.feeding })),
        ...periodWaste.map((entry) => ({ timestamp: new Date(entry.time).getTime(), amount: Number(entry.amount || 0), key: "jete", name: "Lait non bu", color: colors.milkWaste })),
      ].sort((left, right) => left.timestamp - right.timestamp);
    } else {
      const keys = new Map();
      const ensureRow = (value) => {
        const key = dayKey(value);
        if (!keys.has(key)) keys.set(key, { key, label: formatKey(value, days), tire: 0, consomme: 0, jete: 0 });
        return keys.get(key);
      };
      periodPumping.forEach((entry) => { ensureRow(entry.start || entry.end).tire += Number(entry.amount || 0); });
      periodConsumed.forEach((entry) => { ensureRow(entry.start || entry.end).consomme += Number(entry.amount || 0); });
      periodWaste.forEach((entry) => { ensureRow(entry.time).jete += Number(entry.amount || 0); });
      chart = [...keys.values()].sort((left, right) => left.key.localeCompare(right.key));
    }

    const tire = periodPumping.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const consomme = periodConsumed.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const jete = periodWaste.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    return { chart, tire, consomme, jete, stock: tire - consomme, waste: periodWaste, dayDomain: [start.getTime(), end.getTime()] };
  }, [feedings, milkWaste, period, pumping]);

  const handleBarClick = (data, key, name) => {
    const source = data?.payload || data;
    const value = Number(source?.[key] ?? data?.value ?? 0);
    if (!value) return;
    const timeOrDate = period === "day" ? hourLabel(source.timestamp) : source.label;
    setSelectedBar({ key, label: `${name} · ${timeOrDate}`, value });
  };

  const handleDayBarClick = (data) => {
    const source = data?.payload || data;
    const value = Number(source?.amount ?? data?.value ?? 0);
    if (!value || !source?.key) return;
    setSelectedBar({ key: source.key, label: `${source.name} · ${hourLabel(source.timestamp)}`, value });
  };

  const selectedColor = selectedBar?.key === "jete" ? colors.milkWaste : selectedBar?.key === "consomme" ? colors.feeding : colors.pumping;

  return (
    <SectionCard title="Stock de lait" icon={<Icons.Pump />} color={colors.pumping}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 12, marginBottom: 14, textAlign: "center" }}>
        <div><strong style={{ color: colors.pumping }}>{formatVolume(result.tire)}</strong><br /><small>Tiré</small></div>
        <div><strong style={{ color: colors.feeding }}>{formatVolume(result.consomme)}</strong><br /><small>Lait maternel au biberon</small></div>
        <div><strong style={{ color: colors.milkWaste }}>{formatVolume(result.jete)}</strong><br /><small>Non bu</small></div>
        <div><strong style={{ color: result.stock < 0 ? "var(--error-color)" : colors.growth }}>{formatVolume(result.stock)}</strong><br /><small>Stock estimé</small></div>
      </div>
      {result.chart.length > 0 ? (
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={result.chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey={period === "day" ? "timestamp" : "label"} type={period === "day" ? "number" : "category"} scale={period === "day" ? "time" : "auto"} domain={period === "day" ? result.dayDomain : undefined} tickFormatter={period === "day" ? hourLabel : undefined} tick={{ fontSize: 10, fill: "var(--text-dim)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis hide />
              <Tooltip content={<CustomTooltip labelFormatter={period === "day" ? hourLabel : undefined} />} />
              {period === "day" ? (
                <Bar dataKey="amount" name="Quantité" shape={<FixedTimeBar />} cursor="pointer" onClick={handleDayBarClick}>
                  {result.chart.map((entry, index) => <Cell key={`${entry.key}-${entry.timestamp}-${index}`} fill={entry.color} />)}
                </Bar>
              ) : (<>
                <Bar dataKey="tire" name="Tiré" fill={colors.pumping} radius={[5, 5, 0, 0]} cursor="pointer" onClick={(data) => handleBarClick(data, "tire", "Tiré")} />
                <Bar dataKey="consomme" name="Lait maternel au biberon" fill={colors.feeding} radius={[5, 5, 0, 0]} cursor="pointer" onClick={(data) => handleBarClick(data, "consomme", "Lait maternel au biberon")} />
                <Bar dataKey="jete" name="Lait non bu" fill={colors.milkWaste} radius={[5, 5, 0, 0]} cursor="pointer" onClick={(data) => handleBarClick(data, "jete", "Lait non bu")} />
              </>)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: 20 }}>Aucun mouvement de stock sur cette période</div>
      )}
      {selectedBar && <ChartDetailBar label={selectedBar.label} value={formatVolume(selectedBar.value)} unit="" color={selectedColor} onDismiss={() => setSelectedBar(null)} />}
      {result.waste.length > 0 && (
        <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
          <div style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Lait non bu</div>
          {result.waste.slice(0, 5).map((entry) => (
            <button key={entry.id} type="button" className="entry-clickable" onClick={() => onEditWaste?.(entry)} style={{ width: "100%", border: "none", background: "transparent", color: "var(--text)", padding: "7px 4px", display: "flex", justifyContent: "space-between", gap: 12, cursor: "pointer" }}>
              <span>{formatTime(entry.time)}{entry.note ? ` · ${entry.note}` : ""}</span>
              <strong style={{ color: colors.milkWaste, whiteSpace: "nowrap" }}>− {formatVolume(entry.amount)}</strong>
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
