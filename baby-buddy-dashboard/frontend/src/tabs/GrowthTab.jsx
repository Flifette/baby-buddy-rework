import { useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import SectionCard from "../components/SectionCard";
import MilkStock from "../components/MilkStock";
import CustomTooltip from "../components/CustomTooltip";
import ChartDetailBar from "../components/ChartDetailBar";
import DayActivitiesModal from "../components/DayActivitiesModal";
import { Icons } from "../components/Icons";
import { colors } from "../utils/colors";
import { useUnits } from "../utils/units";
import { toGrowthSeries, formatGrowthTick, dailyFeedingTotals, dailySleepTotals, dailyTummyTotals, getEntriesForDate, parseDuration } from "../utils/formatters";

const hourLabel = (value) => new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export default function GrowthTab({ weights, heights, monthlyFeedings, monthlySleep, tummyTimes = [], pumping = [], feedings = [], milkWaste = [], period = "week", onEditEntry, onEditMilkWaste, visibleTiles = {} }) {
  const units = useUnits();
  const [dayModal, setDayModal] = useState(null);
  const [selectedBar, setSelectedBar] = useState(null);
  const periodDays = { day: 1, week: 7, month: 30, halfyear: 183, year: 365 }[period];
  const cutoffDate = new Date();
  cutoffDate.setHours(0, 0, 0, 0);
  if (periodDays) cutoffDate.setDate(cutoffDate.getDate() - (periodDays - 1));
  const cutoff = periodDays ? cutoffDate.getTime() : 0;
  const inPeriod = (entry, key) => !cutoff || !entry?.[key] || new Date(entry[key]).getTime() >= cutoff;
  const periodWeights = (weights || []).filter((e) => inPeriod(e, "date"));
  const periodHeights = (heights || []).filter((e) => inPeriod(e, "date"));
  const periodFeedings = (monthlyFeedings || []).filter((e) => inPeriod(e, "start"));
  const periodSleep = (monthlySleep || []).filter((e) => inPeriod(e, "start"));
  const periodTummy = (tummyTimes || []).filter((e) => inPeriod(e, "start"));
  const weightSeries = toGrowthSeries(periodWeights, "weight");
  const heightSeries = toGrowthSeries(periodHeights, "height");
  // "Total" renders only dates that actually contain data instead of 3,650
  // empty daily points, which keeps Recharts responsive on long histories.
  const chartDays = periodDays || null;
  const feedingSeries = period === "day"
    ? periodFeedings.slice().sort((a, b) => new Date(a.start) - new Date(b.start)).map((entry) => ({ date: hourLabel(entry.start), timestamp: new Date(entry.start).getTime(), amount: Number(entry.amount || 0), entry }))
    : dailyFeedingTotals(periodFeedings, chartDays);
  const sleepSeries = period === "day"
    ? periodSleep.slice().sort((a, b) => new Date(a.start) - new Date(b.start)).map((entry) => ({ date: hourLabel(entry.start), timestamp: new Date(entry.start).getTime(), hours: parseDuration(entry.duration), entry }))
    : dailySleepTotals(periodSleep, chartDays);
  const tummySeries = period === "day"
    ? periodTummy.slice().sort((a, b) => new Date(a.start) - new Date(b.start)).map((entry) => ({ date: hourLabel(entry.start), timestamp: new Date(entry.start).getTime(), minutes: Math.round(parseDuration(entry.duration) * 60), entry }))
    : dailyTummyTotals(periodTummy, chartDays);
  const dayDomain = [cutoffDate.getTime(), cutoffDate.getTime() + 24 * 60 * 60 * 1000];

  const latestWeight = (weights || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const latestHeight = (heights || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  // Compute averages for stat cards
  const feedingDays = feedingSeries.filter((d) => d.amount > 0);
  const avgFeeding = feedingDays.length
    ? Math.round(feedingDays.reduce((s, d) => s + d.amount, 0) / feedingDays.length)
    : 0;
  const sleepDays = sleepSeries.filter((d) => d.hours > 0);
  const avgSleep = sleepDays.length
    ? (sleepDays.reduce((s, d) => s + d.hours, 0) / sleepDays.length).toFixed(1)
    : 0;
  const totalFeeding = feedingSeries.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalSleep = sleepSeries.reduce((sum, item) => sum + Number(item.hours || 0), 0).toFixed(1);
  const tummyDays = tummySeries.filter((item) => item.minutes > 0);
  const avgTummy = tummyDays.length ? Math.round(tummyDays.reduce((sum, item) => sum + item.minutes, 0) / tummyDays.length) : 0;
  const totalTummy = tummySeries.reduce((sum, item) => sum + Number(item.minutes || 0), 0);

  const handleChartClick = (data, type) => {
    if (!data || !data.activePayload?.[0]) return;
    const payload = data.activePayload[0];
    const rawLabel = data.activeLabel;
    const label = period === "day" && (type === "feeding" || type === "sleep" || type === "tummy") ? hourLabel(rawLabel) : rawLabel;
    const value = payload.value;
    const entry = payload.payload?.entry;
    setSelectedBar({ type, label, value, entry });
  };

  const openDayModal = (dateLabel, type) => {
    let dayData = [];
    if (type === "feeding") {
      dayData = getEntriesForDate(periodFeedings, dateLabel, "start");
    } else if (type === "sleep") {
      dayData = getEntriesForDate(periodSleep, dateLabel, "start");
    } else if (type === "pumping") {
      dayData = getEntriesForDate(pumping, dateLabel, "start");
    } else if (type === "tummy") {
      dayData = getEntriesForDate(periodTummy, dateLabel, "start");
    }
    setSelectedBar(null);
    setDayModal({ day: dateLabel, type, data: dayData });
  };

  return (
    <>
      {/* Latest Measurements */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        {visibleTiles.measurements !== false ? (<><div className="fade-in fade-in-1">
          <div
            style={{
              background: "var(--card-bg)",
              borderRadius: 16,
              padding: "20px 22px",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: `${colors.growth}18`,
                  color: colors.growth,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icons.Weight />
              </div>
              <span style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Poids
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
              {latestWeight ? `${latestWeight.weight} ${units.weight}` : "—"}
            </div>
            {latestWeight && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                {new Date(latestWeight.date).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        <div className="fade-in fade-in-2">
          <div
            style={{
              background: "var(--card-bg)",
              borderRadius: 16,
              padding: "20px 22px",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: `${colors.height}18`,
                  color: colors.height,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icons.Ruler />
              </div>
              <span style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Taille
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
              {latestHeight ? `${latestHeight.height} ${units.length}` : "—"}
            </div>
            {latestHeight && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                {new Date(latestHeight.date).toLocaleDateString()}
              </div>
            )}
          </div>
        </div></>) : null}

        <>{visibleTiles.feedingSummary !== false ? (<div className="fade-in fade-in-3">
          <div
            style={{
              background: "var(--card-bg)",
              borderRadius: 16,
              padding: "20px 22px",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: `${colors.feeding}18`,
                  color: colors.feeding,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icons.Bottle />
              </div>
              <span style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                {period === "day" ? "Repas" : "Moyenne des repas"}
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
              {(period === "day" ? totalFeeding : avgFeeding) ? `${period === "day" ? totalFeeding : avgFeeding} ${units.volume}` : "—"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              {period === "day" ? "sur la journée" : "par jour sur la période"}
            </div>
          </div>
        </div>) : null}

        {visibleTiles.sleepSummary !== false ? (<div className="fade-in fade-in-4">
          <div
            style={{
              background: "var(--card-bg)",
              borderRadius: 16,
              padding: "20px 22px",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: `${colors.sleep}18`,
                  color: colors.sleep,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icons.Moon />
              </div>
              <span style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                {period === "day" ? "Sommeil" : "Sommeil moyen"}
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
              {(period === "day" ? Number(totalSleep) : avgSleep) ? `${period === "day" ? totalSleep : avgSleep} H` : "—"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              {period === "day" ? "sur la journée" : "par jour sur la période"}
            </div>
          </div>
        </div>) : null}

        {visibleTiles.tummySummary !== false ? (<div className="fade-in fade-in-4">
          <div style={{ background: "var(--card-bg)", borderRadius: 16, padding: "20px 22px", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${colors.tummy}18`, color: colors.tummy, display: "flex", alignItems: "center", justifyContent: "center" }}><Icons.BabyCrawl /></div>
              <span style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                {period === "day" ? "Temps sur le ventre" : "Temps sur le ventre moyen"}
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
              {(period === "day" ? totalTummy : avgTummy) ? `${period === "day" ? totalTummy : avgTummy} min` : "—"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              {period === "day" ? "sur la journée" : "par jour sur la période"}
            </div>
          </div>
        </div>) : null}</>
      </div>

      {/* Charts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        {/* Daily Feeding Totals */}
        {visibleTiles.feedingChart !== false ? (<div className="fade-in fade-in-5">
          <SectionCard title="Repas quotidiens" icon={<Icons.Bottle />} color={colors.feeding}>
            {feedingSeries.some((d) => d.amount > 0) ? (
              <>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={feedingSeries} onClick={(data) => handleChartClick(data, "feeding")}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#252836" vertical={false} />
                      <XAxis dataKey={period === "day" ? "timestamp" : "date"} type={period === "day" ? "number" : "category"} scale={period === "day" ? "time" : "auto"} domain={period === "day" ? dayDomain : undefined} tickFormatter={period === "day" ? hourLabel : undefined} tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip labelFormatter={period === "day" ? hourLabel : undefined} />} />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        stroke={colors.feeding}
                        strokeWidth={2}
                        fill={`${colors.feeding}30`}
                        dot={period === "day" ? { r: 4, fill: colors.feeding } : false}
                        activeDot={{ r: 4, fill: colors.feeding, cursor: "pointer" }}
                        cursor="pointer"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {selectedBar?.type === "feeding" && (
                  <ChartDetailBar
                    label={selectedBar.label}
                    value={selectedBar.value}
                    unit={units.volume}
                    color={colors.feeding}
                    onViewEntries={() => {
                      if (period === "day" && selectedBar.entry) onEditEntry?.("feeding", selectedBar.entry);
                      else openDayModal(selectedBar.label, "feeding");
                    }}
                    onDismiss={() => setSelectedBar(null)}
                  />
                )}
              </>
            ) : (
              <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: 40 }}>
                Aucune donnée de repas sur cette période
              </div>
            )}
          </SectionCard>
        </div>) : null}

        {/* Daily Sleep Totals */}
        {visibleTiles.sleepChart !== false ? (<div className="fade-in fade-in-6">
          <SectionCard title="Sommeil quotidien" icon={<Icons.Moon />} color={colors.sleep}>
            {sleepSeries.some((d) => d.hours > 0) ? (
              <>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sleepSeries} onClick={(data) => handleChartClick(data, "sleep")}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#252836" vertical={false} />
                      <XAxis dataKey={period === "day" ? "timestamp" : "date"} type={period === "day" ? "number" : "category"} scale={period === "day" ? "time" : "auto"} domain={period === "day" ? dayDomain : undefined} tickFormatter={period === "day" ? hourLabel : undefined} tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip labelFormatter={period === "day" ? hourLabel : undefined} />} />
                      <Area
                        type="monotone"
                        dataKey="hours"
                        stroke={colors.sleep}
                        strokeWidth={2}
                        fill={`${colors.sleep}30`}
                        dot={period === "day" ? { r: 4, fill: colors.sleep } : false}
                        activeDot={{ r: 4, fill: colors.sleep, cursor: "pointer" }}
                        cursor="pointer"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {selectedBar?.type === "sleep" && (
                  <ChartDetailBar
                    label={selectedBar.label}
                    value={selectedBar.value}
                    unit="H"
                    color={colors.sleep}
                    onViewEntries={() => {
                      if (period === "day" && selectedBar.entry) onEditEntry?.("sleep", selectedBar.entry);
                      else openDayModal(selectedBar.label, "sleep");
                    }}
                    onDismiss={() => setSelectedBar(null)}
                  />
                )}
              </>
            ) : (
              <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: 40 }}>
                Aucune donnée de sommeil sur cette période
              </div>
            )}
          </SectionCard>
        </div>) : null}

        {/* Daily Tummy Time Totals */}
        {visibleTiles.tummyChart !== false ? (<div className="fade-in fade-in-6">
          <SectionCard title="Temps sur le ventre quotidien" icon={<Icons.BabyCrawl />} color={colors.tummy}>
            {tummySeries.some((item) => item.minutes > 0) ? (
              <>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={tummySeries} onClick={(data) => handleChartClick(data, "tummy")}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#252836" vertical={false} />
                      <XAxis dataKey={period === "day" ? "timestamp" : "date"} type={period === "day" ? "number" : "category"} scale={period === "day" ? "time" : "auto"} domain={period === "day" ? dayDomain : undefined} tickFormatter={period === "day" ? hourLabel : undefined} tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip labelFormatter={period === "day" ? hourLabel : undefined} />} />
                      <Area type="monotone" dataKey="minutes" stroke={colors.tummy} strokeWidth={2} fill={`${colors.tummy}30`} dot={period === "day" ? { r: 4, fill: colors.tummy } : false} activeDot={{ r: 4, fill: colors.tummy, cursor: "pointer" }} cursor="pointer" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {selectedBar?.type === "tummy" && (
                  <ChartDetailBar
                    label={selectedBar.label}
                    value={selectedBar.value}
                    unit="min"
                    color={colors.tummy}
                    onViewEntries={() => {
                      if (period === "day" && selectedBar.entry) onEditEntry?.("tummy", selectedBar.entry);
                      else openDayModal(selectedBar.label, "tummy");
                    }}
                    onDismiss={() => setSelectedBar(null)}
                  />
                )}
              </>
            ) : (
              <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: 40 }}>Aucune donnée de temps sur le ventre sur cette période</div>
            )}
          </SectionCard>
        </div>) : null}

        {/* Weight Chart */}
        {period !== "day" && visibleTiles.weightChart !== false ? (<div className="fade-in fade-in-7">
          <SectionCard title="Évolution du poids" icon={<Icons.Weight />} color={colors.growth}>
            {weightSeries.length >= 2 ? (
              <>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightSeries} onClick={(data) => handleChartClick(data, "weight")}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#252836" vertical={false} />
                      <XAxis dataKey="timestamp" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={formatGrowthTick} tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                      <Tooltip content={<CustomTooltip labelFormatter={formatGrowthTick} />} />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke={colors.growth}
                        strokeWidth={2.5}
                        dot={{ fill: colors.growth, r: 4, cursor: "pointer" }}
                        activeDot={{ r: 6, cursor: "pointer" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {selectedBar?.type === "weight" && (
                  <ChartDetailBar
                    label={formatGrowthTick(selectedBar.label)}
                    value={selectedBar.value}
                    unit={units.weight}
                    color={colors.growth}
                    actionLabel="Modifier"
                    onViewEntries={() => {
                      if (selectedBar.entry) onEditEntry?.("weight", selectedBar.entry);
                      setSelectedBar(null);
                    }}
                    onDismiss={() => setSelectedBar(null)}
                  />
                )}
              </>
            ) : (
              <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: 40 }}>
                {weightSeries.length === 1 ? "Il faut au moins 2 mesures pour afficher l’évolution" : "Aucune donnée de poids"}
              </div>
            )}
          </SectionCard>
        </div>) : null}

        {/* Height Chart */}
        {period !== "day" && visibleTiles.heightChart !== false ? (<div className="fade-in fade-in-8">
          <SectionCard title="Évolution de la taille" icon={<Icons.Ruler />} color={colors.height}>
            {heightSeries.length >= 2 ? (
              <>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={heightSeries} onClick={(data) => handleChartClick(data, "height")}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#252836" vertical={false} />
                      <XAxis dataKey="timestamp" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={formatGrowthTick} tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                      <Tooltip content={<CustomTooltip labelFormatter={formatGrowthTick} />} />
                      <Line
                        type="monotone"
                        dataKey="height"
                        stroke={colors.height}
                        strokeWidth={2.5}
                        dot={{ fill: colors.height, r: 4, cursor: "pointer" }}
                        activeDot={{ r: 6, cursor: "pointer" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {selectedBar?.type === "height" && (
                  <ChartDetailBar
                    label={formatGrowthTick(selectedBar.label)}
                    value={selectedBar.value}
                    unit={units.length}
                    color={colors.height}
                    actionLabel="Modifier"
                    onViewEntries={() => {
                      if (selectedBar.entry) onEditEntry?.("height", selectedBar.entry);
                      setSelectedBar(null);
                    }}
                    onDismiss={() => setSelectedBar(null)}
                  />
                )}
              </>
            ) : (
              <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: 40 }}>
                {heightSeries.length === 1 ? "Il faut au moins 2 mesures pour afficher l’évolution" : "Aucune donnée de taille"}
              </div>
            )}
          </SectionCard>
        </div>) : null}
      </div>

      {visibleTiles.milkStock !== false ? (<div style={{ marginTop: 16 }}>
      <MilkStock pumping={pumping} feedings={feedings} milkWaste={milkWaste} onEditWaste={onEditMilkWaste} />
      </div>) : null}

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
