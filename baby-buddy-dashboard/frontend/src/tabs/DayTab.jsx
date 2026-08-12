import { useMemo, useState } from "react";
import { Icons } from "../components/Icons";
import { colors } from "../utils/colors";
import { useLanguage } from "../utils/i18n";
import { useUnits } from "../utils/units";
import { formatTime } from "../utils/formatters";

const pad = (n) => String(n).padStart(2, "0");
const dateKey = (value) => { const d = new Date(value); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
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
  const selected = dateKey(day);
  const events = useMemo(() => [
    ...feedings.map((e) => ({ ...e, type: "feeding", at: e.start, text: e.amount ? `${e.amount} ${units.volume}` : t("activity.feeding") })),
    ...pumping.map((e) => ({ ...e, type: "pumping", at: e.start, text: e.amount ? `${e.amount} ${units.volume}` : t("activity.pumping") })),
    ...milkWaste.map((e) => ({ ...e, type: "milkWaste", at: e.time, text: e.amount ? `${e.amount} ${units.volume}` : t("activity.milkWaste") })),
    ...changes.map((e) => ({ ...e, type: "diaper", at: e.time, text: e.wet && e.solid ? t("day.wetSolid") : e.wet ? t("day.wet") : t("day.solid") })),
    ...sleepEntries.map((e) => ({ ...e, type: "sleep", at: e.start, text: t("activity.sleep") })),
    ...tummyTimes.map((e) => ({ ...e, type: "tummy", at: e.start, text: t("activity.tummy") })),
    ...temperatures.map((e) => ({ ...e, type: "temp", at: e.time, text: `${e.temperature ?? e.value ?? "—"} ${units.temp}` })),
    ...weights.map((e) => ({ ...e, type: "weight", at: e.date, text: `${e.weight ?? e.value ?? "—"} ${units.weight}` })),
    ...heights.map((e) => ({ ...e, type: "height", at: e.date, text: `${e.height ?? e.value ?? "—"} ${units.length}` })),
    ...notes.map((e) => ({ ...e, type: "note", at: e.time, text: e.note || t("activity.note") })),
  ].filter((e) => e.at && dateKey(e.at) === selected).sort((a, b) => new Date(a.at) - new Date(b.at)), [selected, feedings, pumping, milkWaste, changes, sleepEntries, tummyTimes, temperatures, weights, heights, notes, t, units]);

  const shift = (amount) => setDay((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + amount));

  return (
    <div className="day-page fade-in">
      <div className="day-header"><div><h2>{t("nav.day")}</h2><span>{t("day.subtitle")}</span></div><Icons.Activity /></div>
      <div className="day-controls"><button onClick={() => shift(-1)}>‹</button><strong>{day.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}</strong><button onClick={() => shift(1)}>›</button><button className="day-today" onClick={() => setDay(new Date())}>{t("common.today")}</button></div>
      <div className="day-timeline">
        {events.length ? events.map((event, index) => {
          const [labelKey, color, Icon] = TYPES[event.type] || TYPES.note;
          const label = t(`activity.${labelKey}`);
          const eventKey = `${event.type}-${event.id || index}`;
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
                <button className="day-event-card" style={{ "--day-color": color }} onMouseEnter={() => setHovered(eventKey)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(eventKey)} onBlur={() => setHovered(null)} onClick={() => onEditEntry?.(event.type, event)}>
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
