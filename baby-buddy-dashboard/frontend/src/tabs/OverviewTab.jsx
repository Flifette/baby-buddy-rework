import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import StatCard from "../components/StatCard";
import SectionCard from "../components/SectionCard";
import TimelineItem from "../components/TimelineItem";
import DiaperBadge from "../components/DiaperBadge";
import CustomTooltip from "../components/CustomTooltip";
import ChartDetailBar from "../components/ChartDetailBar";
import DayActivitiesModal from "../components/DayActivitiesModal";
import { Icons } from "../components/Icons";
import { colors } from "../utils/colors";
import {
  toFeedingTimeline,
  toDiaperTimeline,
  toSleepBlocks,
  aggregateByDayOfWeek,
  aggregateSleepByDay,
  aggregateTummyByDay,
  aggregateByPeriod,
  getEntriesForDay,
  parseDuration,
  applyMilkWasteToFeedings,
} from "../utils/formatters";
import { useUnits, formatVolume } from "../utils/units";

const COLLAPSED_COUNT = 2;

export default function OverviewTab({ feedings, weeklyFeedings: weeklyFeedingsRaw, sleepEntries, weeklySleep, changes, tummyTimes, weeklyTummyTimes, pumping = [], milkWaste = [], period = "week", onEditEntry, visibleTiles = {} }) {
  const units = useUnits();
  const [expanded, setExpanded] = useState({});
  const [dayModal, setDayModal] = useState(null);
  const [selectedBar, setSelectedBar] = useState(null);
  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const netFeedings = applyMilkWasteToFeedings(feedings, milkWaste);
  const feedingTimeline = toFeedingTimeline(netFeedings, formatVolume);
  const diaperTimeline = toDiaperTimeline(changes);
  const sleepBlocks = toSleepBlocks(sleepEntries);
  const weeklyFeedings = aggregateByPeriod(netFeedings, "feeding", period);
  const sleepByDay = aggregateByPeriod(sleepEntries, "sleep", period);
  const tummyByDay = aggregateByPeriod(tummyTimes, "tummy", period);

  const totalMilkWaste = milkWaste.reduce((s, entry) => s + Number(entry.amount || 0), 0);
  const totalFeeding = netFeedings.reduce((s, f) => s + Number(f.amount || 0), 0);
  const hasFeedingVolume = feedings.some((f) => Number(f.amount || 0) > 0);
  const totalPumping = pumping.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalPumpingConsumed = feedings
    .filter((f) => f.type === "breast milk" && f.method === "bottle")
    .reduce((s, f) => s + Number(f.amount || 0), 0);
  const pumpingTimeline = pumping
    .slice()
    .sort((a, b) => new Date(b.end || b.start || 0) - new Date(a.end || a.start || 0))
    .map((p) => {
      const value = p.end || p.start;
      const date = value ? new Date(value) : null;
      const side = p.notes?.match(/^Sein\s*:\s*([^—]+)/)?.[1]?.trim();
      return { entry: p,
        time: date ? date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—",
        label: `${formatVolume(Number(p.amount || 0))} Tirage${side ? ` · ${side}` : ""}`,
        detail: date ? date.toLocaleDateString("fr-FR") : "",
      };
    });
  const totalSleep = sleepEntries.reduce(
    (s, e) => s + parseDuration(e.duration),
    0
  );
  const totalDiapers = changes.length;
  const avgTummy =
    tummyTimes.length > 0
      ? tummyTimes.reduce((s, t) => s + parseDuration(t.duration) * 60, 0) /
        tummyTimes.length
      : 0;

  const wetCount = changes.filter((c) => c.wet && !c.solid).length;
  const solidCount = changes.filter((c) => c.solid && !c.wet).length;
  const bothCount = changes.filter((c) => c.wet && c.solid).length;

  const handleChartClick = (data, type) => {
    if (!data || !data.activeLabel) return;
    const label = data.activeLabel;
    const value = data.activePayload?.[0]?.value;
    setSelectedBar({ type, label, value });
  };

  const openDayModal = (day, type) => {
    let dayData = [];
    if (type === "feeding") {
      dayData = getEntriesForDay(feedings, day, "start");
    } else if (type === "sleep") {
      dayData = getEntriesForDay(sleepEntries, day, "start");
    } else if (type === "tummy") {
      dayData = getEntriesForDay(tummyTimes, day, "start");
    }
    setSelectedBar(null);
    setDayModal({ day, type, data: dayData });
  };

  return (
    <>
      {/* Quick Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        {visibleTiles.feedingSummary !== false ? (<div className="fade-in fade-in-1">
          <StatCard
            icon={<Icons.Bottle />}
            label="Repas"
            value={hasFeedingVolume ? formatVolume(totalFeeding) : `${feedings.length}`}
            sub={`${feedings.length} repas sur cette période`}
            color={colors.feeding}
          />
         </div>) : null}
         {visibleTiles.sleepSummary !== false ? (<div className="fade-in fade-in-2">
          <StatCard
            icon={<Icons.Moon />}
            label="Sommeil"
            value={`${totalSleep.toFixed(1)} H`}
            sub="Sur cette période"
            color={colors.sleep}
          />
        </div>) : null}
        {visibleTiles.diaperSummary !== false ? (<div className="fade-in fade-in-3">
          <StatCard
            icon={<Icons.Droplet />}
            label="Changes"
            value={totalDiapers}
            sub={`${wetCount} humides · ${solidCount} solides · ${bothCount} mixtes`}
            color={colors.diaper}
          />
        </div>) : null}
        {visibleTiles.pumpingSummary !== false ? (<div className="fade-in fade-in-4">
          <StatCard
            icon={<Icons.Pump />}
            label="Tirage de lait"
            value={formatVolume(totalPumping)}
            sub={`${pumping.length} tirages sur cette période`}
            color={colors.pumping}
          />
        </div>) : null}
      </div>

      {/* Main Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        {/* Feeding Timeline */}
        {visibleTiles.feedings !== false ? (<div className="fade-in fade-in-3">
          <SectionCard title="Repas récents" icon={<Icons.Bottle />} color={colors.feeding}>
            {feedingTimeline.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {(expanded.feedings ? feedingTimeline : feedingTimeline.slice(0, COLLAPSED_COUNT)).map((f, i, arr) => (
                  <div key={i} className="entry-clickable" onClick={() => onEditEntry?.("feeding", f.entry)}>
                    <TimelineItem
                      time={f.time}
                      label={f.label}
                      detail={f.detail}
                      color={colors.feeding}
                      isLast={i === arr.length - 1}
                    />
                  </div>
                ))}
                {feedingTimeline.length > COLLAPSED_COUNT && (
                  <button className="expand-toggle" onClick={() => toggle("feedings")}>
                    {expanded.feedings ? "Réduire" : `Afficher ${feedingTimeline.length - COLLAPSED_COUNT} de plus`}
                  </button>
                )}
              </div>
            ) : (
              <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: 20 }}>
                Aucun repas enregistré sur cette période
              </div>
            )}
            {period !== "day" && weeklyFeedings.some((d) => d.amount > 0) && (
              <>
                <div style={{ marginTop: 16, height: 120 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyFeedings} barSize={18} onClick={(data) => handleChartClick(data, "feeding")}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#252836" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="amount" fill={colors.feeding} radius={[6, 6, 0, 0]} opacity={0.85} cursor="pointer" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {selectedBar?.type === "feeding" && (
                  <ChartDetailBar
                    label={selectedBar.label}
                    value={selectedBar.value}
                    unit={units.volume}
                    color={colors.feeding}
                    onViewEntries={() => openDayModal(selectedBar.label, "feeding")}
                    onDismiss={() => setSelectedBar(null)}
                  />
                )}
              </>
            )}
          </SectionCard>
        </div>) : null}

        {/* Sleep */}
        {visibleTiles.sleep !== false ? (<div className="fade-in fade-in-4">
          <SectionCard title="Sommeil" icon={<Icons.Moon />} color={colors.sleep}>
            {sleepBlocks.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {(expanded.sleep ? sleepBlocks : sleepBlocks.slice(0, COLLAPSED_COUNT)).map((s, i, arr) => (
                  <div key={i} className="entry-clickable" onClick={() => onEditEntry?.("sleep", s.entry)}>
                    <TimelineItem
                      time={`${s.start}–${s.end}`}
                      label={`${s.duration.toFixed(1)} H${s.nap ? " · Sieste" : ""}`}
                      detail={`${s.start} à ${s.end}`}
                      color={colors.sleep}
                      isLast={i === arr.length - 1}
                    />
                  </div>
                ))}
                {sleepBlocks.length > COLLAPSED_COUNT && (
                  <button className="expand-toggle" onClick={() => toggle("sleep")}>
                    {expanded.sleep ? "Réduire" : `Afficher ${sleepBlocks.length - COLLAPSED_COUNT} de plus`}
                  </button>
                )}
              </div>
            ) : (
              <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: 20 }}>
                Aucun sommeil enregistré sur cette période
              </div>
            )}
            {period !== "day" && sleepByDay.some((d) => d.hours > 0) && (
              <>
                <div style={{ marginTop: 16, height: 120 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sleepByDay} barSize={18} onClick={(data) => handleChartClick(data, "sleep")}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#252836" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="hours" fill={colors.sleep} radius={[6, 6, 0, 0]} opacity={0.85} cursor="pointer" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {selectedBar?.type === "sleep" && (
                  <ChartDetailBar
                    label={selectedBar.label}
                    value={selectedBar.value}
                    unit="H"
                    color={colors.sleep}
                    onViewEntries={() => openDayModal(selectedBar.label, "sleep")}
                    onDismiss={() => setSelectedBar(null)}
                  />
                )}
              </>
            )}
          </SectionCard>
        </div>) : null}

        {/* Diapers */}
        {visibleTiles.diapers !== false ? (<div className="fade-in fade-in-5">
          <SectionCard title="Changes" icon={<Icons.Droplet />} color={colors.diaper}>
            {diaperTimeline.length > 0 ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(expanded.diapers ? diaperTimeline : diaperTimeline.slice(0, COLLAPSED_COUNT)).map((d, i) => (
                    <div
                      key={i}
                      className="entry-clickable"
                      onClick={() => onEditEntry?.("diaper", d.entry)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: 10,
                        background: i === 0 ? `${colors.diaper}08` : "transparent",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <DiaperBadge type={d.type} />
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{d.time}</span>
                      </div>
                      <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--mono)" }}>
                        {d.ago}
                      </span>
                    </div>
                  ))}
                  {diaperTimeline.length > COLLAPSED_COUNT && (
                    <button className="expand-toggle" onClick={() => toggle("diapers")}>
                      {expanded.diapers ? "Réduire" : `Afficher ${diaperTimeline.length - COLLAPSED_COUNT} de plus`}
                    </button>
                  )}
                </div>
                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    gap: 12,
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#3B82F6" }}>{wetCount}</div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Humides</div>
                  </div>
                  <div style={{ width: 1, background: "var(--border)" }} />
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#D97706" }}>{solidCount}</div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Solides</div>
                  </div>
                  <div style={{ width: 1, background: "var(--border)" }} />
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#8B5CF6" }}>{bothCount}</div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Mixtes</div>
                  </div>
                  <div style={{ width: 1, background: "var(--border)" }} />
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{totalDiapers}</div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Total</div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: 20 }}>
                Aucun change enregistré sur cette période
              </div>
            )}
          </SectionCard>
        </div>) : null}

        {/* Pumping */}
        {visibleTiles.pumping !== false ? (<div className="fade-in fade-in-6">
          <SectionCard title="Tirage de lait" icon={<Icons.Pump />} color={colors.pumping}>
            {pumpingTimeline.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {(expanded.pumping ? pumpingTimeline : pumpingTimeline.slice(0, COLLAPSED_COUNT)).map((p, i, arr) => (
                  <div key={`${p.time}-${i}`} className="entry-clickable" onClick={() => onEditEntry?.("pumping", p.entry)}><TimelineItem time={p.time} label={p.label} detail={p.detail} color={colors.pumping} isLast={i === arr.length - 1} /></div>
                ))}
                {pumpingTimeline.length > COLLAPSED_COUNT && (
                  <button className="expand-toggle" onClick={() => toggle("pumping")}>
                    {expanded.pumping ? "Réduire" : `Afficher ${pumpingTimeline.length - COLLAPSED_COUNT} de plus`}
                  </button>
                )}
                <div style={{ marginTop: 16, display: "flex", gap: 12, padding: "12px 16px", borderRadius: 12, background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700, color: colors.pumping }}>{formatVolume(totalPumping)}</div><div style={{ fontSize: 11, color: "var(--text-dim)" }}>Tiré</div></div>
                  <div style={{ width: 1, background: "var(--border)" }} />
                  <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700, color: colors.feeding }}>{formatVolume(totalPumpingConsumed)}</div><div style={{ fontSize: 11, color: "var(--text-dim)" }}>Lait maternel au biberon</div></div>
                  <div style={{ width: 1, background: "var(--border)" }} />
                  <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700, color: colors.milkWaste }}>{formatVolume(totalMilkWaste)}</div><div style={{ fontSize: 11, color: "var(--text-dim)" }}>Non bu</div></div>
                  <div style={{ width: 1, background: "var(--border)" }} />
                  <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700, color: colors.growth }}>{formatVolume(totalPumping - totalPumpingConsumed)}</div><div style={{ fontSize: 11, color: "var(--text-dim)" }}>Stock</div></div>
                </div>
              </div>
            ) : (
              <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: 20 }}>
                Aucun tirage enregistré sur cette période
              </div>
            )}
          </SectionCard>
        </div>) : null}

        {/* Tummy Time (masqué) */}
        {visibleTiles.tummy === true ? (<div className="fade-in fade-in-6">
          <SectionCard title="Temps sur le ventre" icon={<Icons.BabyCrawl />} color={colors.tummy}>
            {tummyByDay.some((d) => d.minutes > 0) ? (
              <>
                <div style={{ height: 140 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tummyByDay} barSize={22} onClick={(data) => handleChartClick(data, "tummy")}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#252836" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="minutes" fill={colors.tummy} radius={[6, 6, 0, 0]} opacity={0.8} cursor="pointer" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {selectedBar?.type === "tummy" ? (
                  <ChartDetailBar
                    label={selectedBar.label}
                    value={selectedBar.value}
                    unit="min"
                    color={colors.tummy}
                    onViewEntries={() => openDayModal(selectedBar.label, "tummy")}
                    onDismiss={() => setSelectedBar(null)}
                  />
                ) : (
                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: `${colors.tummy}08`,
                      border: `1px solid ${colors.tummy}15`,
                    }}
                  >
                    <Icons.TrendUp />
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Moyenne{" "}
                      <strong style={{ color: colors.tummy }}>{Math.round(avgTummy)} min</strong>{" "}
                      par séance
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: 20 }}>
                Aucun temps sur le ventre enregistré sur cette période
              </div>
            )}
          </SectionCard>
        </div>) : null}
      </div>

      {/* Day Activities Modal */}
      {dayModal && (
        <DayActivitiesModal
          day={dayModal.day}
          type={dayModal.type}
          data={dayModal.data}
          onEditEntry={onEditEntry}
          onClose={() => setDayModal(null)}
        />
      )}
    </>
  );
}
