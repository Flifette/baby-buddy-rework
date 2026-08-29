import { useMemo, useState } from "react";
import { Icons } from "../components/Icons";
import { colors } from "../utils/colors";
import { useLanguage } from "../utils/i18n";
import { measurableFeedingAmount } from "../utils/feedings";
import { useUnits } from "../utils/units";
import { formatDuration, formatTime, localDateFromKey, localDateKey } from "../utils/formatters";
const TYPES = {
  feeding: ["feeding", colors.feeding, Icons.Bottle],
  pumping: ["pumping", colors.pumping, Icons.Pump],
  milkWaste: ["milkWaste", colors.milkWaste, Icons.BottleOff],
  sleep: ["sleep", colors.sleep, Icons.Moon],
  diaper: ["diaperSingle", colors.diaper, Icons.Droplet],
  tummy: ["tummy", colors.tummy, Icons.BabyCrawl],
  temp: ["temperature", colors.temp, Icons.Temp],
  weight: ["weight", colors.growth, Icons.Weight],
  height: ["height", colors.height, Icons.Ruler],
  note: ["note", colors.note, Icons.StickyNote],
};

export default function DayTab({ feedings = [], pumping = [], milkWaste = [], changes = [], sleepEntries = [], tummyTimes = [], temperatures = [], weights = [], heights = [], notes = [], onEditEntry }) {
  const { language, locale, t } = useLanguage();
  const units = useUnits();
  const [day, setDay] = useState(new Date());
  const [hovered, setHovered] = useState(null);
  const selected = localDateKey(day);
  const todayKey = localDateKey(new Date());
  const events = useMemo(() => [
    ...feedings.map((e) => {
      const amount = measurableFeedingAmount(e);
      return { ...e, activityType: "feeding", at: e.start, text: amount ? `${amount} ${units.volume}` : t("activity.feeding") };
    }),
    ...pumping.map((e) => ({ ...e, activityType: "pumping", at: e.start, text: e.amount ? `${e.amount} ${units.volume}` : t("activity.pumping") })),
    ...milkWaste.map((e) => ({ ...e, activityType: "milkWaste", at: e.time, text: e.amount ? `${e.amount} ${units.volume}` : t("activity.milkWaste") })),
    ...changes.map((e) => ({ ...e, activityType: "diaper", at: e.time, text: e.wet && e.solid ? t("day.wetSolid") : e.wet ? t("day.wet") : t("day.solid") })),
    ...sleepEntries.map((e) => ({ ...e, activityType: "sleep", at: e.start, text: formatDuration(e.duration, language) })),
    ...tummyTimes.map((e) => ({ ...e, activityType: "tummy", at: e.start, text: t("activity.tummy") })),
    ...temperatures.map((e) => ({ ...e, activityType: "temp", at: e.time, text: `${e.temperature ?? e.value ?? "—"} ${units.temp}` })),
    ...weights.map((e) => ({ ...e, activityType: "weight", at: e.date, text: `${e.weight ?? e.value ?? "—"} ${units.weight}` })),
    ...heights.map((e) => ({ ...e, activityType: "height", at: e.date, text: `${e.height ?? e.value ?? "—"} ${units.length}` })),
    ...notes.map((e) => ({ ...e, activityType: "note", at: e.time, text: e.note || t("activity.note") })),
  ].filter((e) => e.at && localDateKey(e.at) === selected).sort((a, b) => new Date(a.at) - new Date(b.at)), [selected, feedings, pumping, milkWaste, changes, sleepEntries, tummyTimes, temperatures, weights, heights, notes, language, t, units]);

  const shift = (amount) => setDay((current) => {
    const candidate = new Date(current.getFullYear(), current.getMonth(), current.getDate() + amount, 12);
    return localDateKey(candidate) <= todayKey ? candidate : current;
  });

  const selectDay = (event) => {
    const candidate = localDateFromKey(event.target.value);
    if (candidate && event.target.value <= todayKey) setDay(candidate);
  };

  return (
    <div className="day-page fade-in">
      <div className="day-header"><div><h2>{t("nav.day")}</h2><span>{t("day.subtitle")}</span></div><Icons.Activity /></div>
      <div className="day-controls">
        <button type="button" onClick={() => shift(-1)} aria-label={t("day.previousDate")}>‹</button>
        <label className="day-date-picker" title={t("day.chooseDate")}>
          <Icons.Calendar />
          <strong>{day.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}</strong>
          <input type="date" value={selected} max={todayKey} onChange={selectDay} aria-label={t("day.chooseDate")} />
        </label>
        <button type="button" onClick={() => shift(1)} disabled={selected >= todayKey} aria-label={t("day.nextDate")}>›</button>
        <button type="button" className="day-today" disabled={selected === todayKey} onClick={() => setDay(new Date())}>{t("common.today")}</button>
      </div>
      <div className="day-timeline">
        {events.length ? events.map((event, index) => {
          const [labelKey, color, Icon] = TYPES[event.activityType] || TYPES.note;
          const label = t(`activity.${labelKey}`);
          const eventKey = `${event.activityType}-${event.id || index}`;
          const side = index % 2 === 0 ? "left" : "right";
          const eventTime = formatTime(event.at, language);
          const tooltip = `${label} · ${eventTime} · ${event.text}`;
          return (
            <div className={`day-event day-event-${side}`} key={eventKey}>
              <div className="day-event-center">
                <span className="day-event-time">{eventTime}</span>
                <span className="day-event-dot" style={{ "--day-color": color }}><Icon /></span>
              </div>
              <div className={`day-event-content day-event-content-${side}`}>
                <span className="day-event-branch" style={{ "--day-color": color }} />
                <button className="day-event-card" style={{ "--day-color": color }} onMouseEnter={() => setHovered(eventKey)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(eventKey)} onBlur={() => setHovered(null)} onClick={() => onEditEntry?.(event.activityType, event)}>
                  <strong>{label}</strong><span>{event.text}</span>
                </button>
                {hovered === eventKey && <div className="day-event-tooltip" role="tooltip">{tooltip}</div>}
              </div>
            </div>
          );
        }) : <div className="day-empty">{t("day.noActivity")}</div>}
      </div>
    </div>
  );
}
