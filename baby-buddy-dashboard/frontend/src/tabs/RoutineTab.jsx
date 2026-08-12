import { useMemo, useState } from "react";
import { Icons } from "../components/Icons";
import { colors } from "../utils/colors";
import { formatTime, parseDuration } from "../utils/formatters";
import { useLanguage } from "../utils/i18n";

const FILTERS = [
  ["feeding", colors.feeding],
  ["pumping", colors.pumping],
  ["diaper", colors.diaper],
  ["sleep", colors.sleep],
  ["tummy", colors.tummy],
];

const pad = (n) => String(n).padStart(2, "0");
const dateKey = (value) => { const d = new Date(value); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const dateLabel = (key, locale) => new Date(`${key}T12:00:00`).toLocaleDateString(locale, { weekday: "short", day: "2-digit", month: "short" });
const durationMs = (value) => {
  const hours = parseDuration(value);
  return Number.isFinite(hours) ? hours * 60 * 60 * 1000 : 0;
};
const entryEnd = (entry, start) => {
  const duration = durationMs(entry.duration);
  const candidate = entry.end ? new Date(entry.end) : null;
  if (candidate && !Number.isNaN(candidate.getTime()) && candidate.getTime() > start.getTime() && candidate.getTime() - start.getTime() <= 24 * 60 * 60 * 1000) return candidate;
  return duration > 0 ? new Date(start.getTime() + duration) : start;
};

export default function RoutineTab({ feedings = [], pumping = [], changes = [], sleepEntries = [], tummyTimes = [], period = "week" }) {
  const { language, locale, t } = useLanguage();
  const hourLabel = (hour) => new Date(2000, 0, 1, hour).toLocaleTimeString(locale, { hour: "numeric" });
  const [filters, setFilters] = useState([]);
  const toggleFilter = (id) => {
    setFilters((current) => {
      return current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
    });
  };
  const entries = useMemo(() => [
    ...feedings.map((entry) => ({ ...entry, routineType: "feeding", at: entry.start })),
    ...pumping.map((entry) => ({ ...entry, routineType: "pumping", at: entry.start })),
    ...changes.map((entry) => ({ ...entry, routineType: "diaper", at: entry.time })),
    ...sleepEntries.map((entry) => ({ ...entry, routineType: "sleep", at: entry.start })),
    ...tummyTimes.map((entry) => ({ ...entry, routineType: "tummy", at: entry.start })),
  ].filter((entry) => entry.at && (!filters.length || filters.includes(entry.routineType))), [feedings, pumping, changes, sleepEntries, tummyTimes, filters]);

  const days = useMemo(() => {
    const keys = [...new Set(entries.flatMap((entry) => { const start = new Date(entry.at); const end = entryEnd(entry, start); return [dateKey(start), dateKey(end)]; }))].sort();
    if (keys.length) return keys;
    return [dateKey(new Date())];
  }, [entries]);

  const byCell = useMemo(() => {
    const map = new Map();
    const daySet = new Set(days);
    entries.forEach((entry) => {
      const start = new Date(entry.at);
      const end = entryEnd(entry, start);
      const isPoint = entry.routineType !== "sleep" && entry.routineType !== "tummy";
      if (isPoint) {
        const key = `${dateKey(start)}-${start.getHours()}`;
        if (daySet.has(dateKey(start))) {
          if (!map.has(key)) map.set(key, []);
          map.get(key).push(entry);
        }
        return;
      }
      const cursor = new Date(start);
      cursor.setMinutes(0, 0, 0);
      const last = new Date(end);
      last.setMinutes(0, 0, 0);
      for (let slot = cursor; slot <= last; slot = new Date(slot.getTime() + 60 * 60 * 1000)) {
        const day = dateKey(slot);
        const hour = slot.getHours();
        if (!daySet.has(day)) continue;
        const slotEnd = new Date(slot.getTime() + 60 * 60 * 1000);
        if (start < slotEnd && end >= slot) {
          const key = `${day}-${hour}`;
          if (!map.has(key)) map.set(key, []);
          map.get(key).push(entry);
        }
      }
    });
    return map;
  }, [entries, days]);

  return (
    <div className="routine-page fade-in">
      <div className="routine-header">
        <div>
          <h2>{t("nav.routine")}</h2>
          <span>{t("routine.subtitle")}</span>
        </div>
        <Icons.Activity />
      </div>
      <div className="routine-filters" role="group" aria-label={t("routine.filter")}>
        {FILTERS.map(([id, color]) => (
          <button key={id} className={`routine-filter${filters.includes(id) ? " routine-filter-active" : ""}`} style={filters.includes(id) && color ? { "--routine-accent": color } : undefined} onClick={() => toggleFilter(id)}>
            {id === "feeding" ? <Icons.Bottle /> : id === "pumping" ? <Icons.Pump /> : id === "diaper" ? <Icons.Droplet /> : id === "tummy" ? <Icons.BabyCrawl /> : <Icons.Moon />}
            {t(`activity.${id}`)}
          </button>
        ))}
      </div>
      <div className="routine-table-wrap">
        <div className="routine-table" style={{ gridTemplateColumns: `${language === "en" ? 52 : 44}px repeat(${days.length}, 28px)` }}>
          <div className="routine-corner">{t("routine.hour")}</div>
          {days.map((day) => <div key={day} className="routine-day">{dateLabel(day, locale)}</div>)}
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={`row-${hour}`} style={{ display: "contents" }}>
              <div key={`hour-${hour}`} className="routine-hour">{hourLabel(hour)}</div>
              {days.map((day) => {
                const cell = byCell.get(`${day}-${hour}`) || [];
                const slotStart = new Date(`${day}T${pad(hour)}:00:00`);
                const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
                return <div key={`${day}-${hour}`} className="routine-cell">
                  {cell.map((entry, index) => {
                    const start = new Date(entry.at);
                    const end = entryEnd(entry, start);
                    const isPoint = entry.routineType !== "sleep" && entry.routineType !== "tummy";
                    const startsHere = start >= slotStart && start < slotEnd;
                    const endsHere = end <= slotEnd;
                    const minuteOffset = `${(start.getMinutes() / 60) * 100}%`;
                    const topOffset = isPoint ? minuteOffset : (startsHere ? minuteOffset : "0%");
                    const bottomOffset = isPoint ? "auto" : (endsHere ? `${((60 - end.getMinutes()) / 60) * 100}%` : "0%");
                    return <span key={`${entry.id || index}`} className={`routine-mark${isPoint ? " routine-mark-point" : ""}`} style={{ background: colors[entry.routineType], zIndex: index + 1, "--routine-offset": minuteOffset, "--routine-top": topOffset, "--routine-bottom": bottomOffset, borderRadius: `${startsHere ? 5 : 0}px ${startsHere ? 5 : 0}px ${endsHere ? 5 : 0}px ${endsHere ? 5 : 0}px` }} title={`${t(`activity.${entry.routineType}`)} · ${formatTime(start, language)}`} />;
                  })}
                </div>;
              })}
            </div>
          ))}
        </div>
      </div>
      {!entries.length && <div className="routine-empty">{t("routine.noActivity")}</div>}
    </div>
  );
}
