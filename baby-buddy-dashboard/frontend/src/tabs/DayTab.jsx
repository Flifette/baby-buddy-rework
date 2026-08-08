import { useMemo, useState } from "react";
import { Icons } from "../components/Icons";
import { colors } from "../utils/colors";

const pad = (n) => String(n).padStart(2, "0");
const dateKey = (value) => { const d = new Date(value); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const timeLabel = (value) => { const d = new Date(value); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const TYPES = {
  feeding: ["Repas", colors.feeding, Icons.Bottle],
  pumping: ["Tirage", colors.pumping, Icons.Pump],
  milkWaste: ["Lait non bu", colors.milkWaste, Icons.BottleOff],
  sleep: ["Sommeil", colors.sleep, Icons.Moon],
  diaper: ["Change", colors.diaper, Icons.Droplet],
  tummy: ["Temps sur le ventre", colors.tummy, Icons.BabyCrawl],
  temp: ["Température", colors.temp, Icons.Temp],
  weight: ["Poids", colors.growth, Icons.Weight],
  height: ["Taille", colors.height, Icons.Ruler],
  note: ["Note", colors.note, Icons.StickyNote],
};

export default function DayTab({ feedings = [], pumping = [], milkWaste = [], changes = [], sleepEntries = [], tummyTimes = [], temperatures = [], weights = [], heights = [], notes = [], onEditEntry }) {
  const [day, setDay] = useState(new Date());
  const [hovered, setHovered] = useState(null);
  const selected = dateKey(day);
  const events = useMemo(() => [
    ...feedings.map((e) => ({ ...e, type: "feeding", at: e.start, text: e.amount ? `${e.amount} mL` : "Repas" })),
    ...pumping.map((e) => ({ ...e, type: "pumping", at: e.start, text: e.amount ? `${e.amount} mL` : "Tirage" })),
    ...milkWaste.map((e) => ({ ...e, type: "milkWaste", at: e.time, text: e.amount ? `${e.amount} mL` : "Lait non bu" })),
    ...changes.map((e) => ({ ...e, type: "diaper", at: e.time, text: e.wet && e.solid ? "Humide et solide" : e.wet ? "Humide" : "Solide" })),
    ...sleepEntries.map((e) => ({ ...e, type: "sleep", at: e.start, text: "Sommeil" })),
    ...tummyTimes.map((e) => ({ ...e, type: "tummy", at: e.start, text: "Temps sur le ventre" })),
    ...temperatures.map((e) => ({ ...e, type: "temp", at: e.time, text: `${e.temperature ?? e.value ?? "—"} °C` })),
    ...weights.map((e) => ({ ...e, type: "weight", at: e.date, text: `${e.weight ?? e.value ?? "—"} kg` })),
    ...heights.map((e) => ({ ...e, type: "height", at: e.date, text: `${e.height ?? e.value ?? "—"} cm` })),
    ...notes.map((e) => ({ ...e, type: "note", at: e.time, text: e.note || "Note" })),
  ].filter((e) => e.at && dateKey(e.at) === selected).sort((a, b) => new Date(a.at) - new Date(b.at)), [selected, feedings, pumping, milkWaste, changes, sleepEntries, tummyTimes, temperatures, weights, heights, notes]);

  const shift = (amount) => setDay((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + amount));

  return (
    <div className="day-page fade-in">
      <div className="day-header"><div><h2>Journée</h2><span>Chronologie des activités du jour</span></div><Icons.Activity /></div>
      <div className="day-controls"><button onClick={() => shift(-1)}>‹</button><strong>{day.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</strong><button onClick={() => shift(1)}>›</button><button className="day-today" onClick={() => setDay(new Date())}>Aujourd’hui</button></div>
      <div className="day-timeline">
        {events.length ? events.map((event, index) => {
          const [label, color, Icon] = TYPES[event.type] || TYPES.note;
          const eventKey = `${event.type}-${event.id || index}`;
          const side = index % 2 === 0 ? "left" : "right";
          const tooltip = `${label} · ${timeLabel(event.at)} · ${event.text}`;
          return (
            <div className={`day-event day-event-${side}`} key={eventKey}>
              <div className="day-event-center">
                <span className="day-event-time">{timeLabel(event.at)}</span>
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
        }) : <div className="day-empty">Aucune activité enregistrée pour cette journée.</div>}
      </div>
    </div>
  );
}
