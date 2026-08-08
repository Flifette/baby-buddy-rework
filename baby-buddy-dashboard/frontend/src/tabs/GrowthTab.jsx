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
import { toGrowthSeries, formatGrowthTick, dailyFeedingTotals, dailySleepTotals, getEntriesForDate } from "../utils/formatters";

export default function GrowthTab({ weights, heights, monthlyFeedings, monthlySleep, pumping = [], period = "week", childId, onEditEntry, visibleTiles = {} }) {
  const units = useUnits();
  const [dayModal, setDayModal] = useState(null);
  const [selectedBar, setSelectedBar] = useState(null);
  const periodDays = { day: 1, week: 7, month: 30, halfyear: 183, year: 365 }[period];
  const cutoff = periodDays ? Date.now() - (periodDays - 1) * 86400000 : 0;
  const inPeriod = (entry, key) => !cutoff || !entry?.[key] || new Date(entry[key]).getTime() >= cutoff;
  const periodWeights = (weights || []).filter((e) => inPeriod(e, "date"));
  const periodHeights = (heights || []).filter((e) => inPeriod(e, "date"));
  const periodFeedings = (monthlyFeedings || []).filter((e) => inPeriod(e, "start"));
  const periodSleep = (monthlySleep || []).filter((e) => inPeriod(e, "start"));
  const weightSeries = toGrowthSeries(periodWeights, "weight");
  const heightSeries = toGrowthSeries(periodHeights, "height");
  const chartDays = periodDays || 3650;
  const feedingSeries = dailyFeedingTotals(periodFeedings, chartDays);
  const sleepSeries = dailySleepTotals(periodSleep, chartDays);

  const latestWeight = periodWeights[0];
  const latestHeight = periodHeights[0];

  // Compute averages for stat cards
  const feedingDays = feedingSeries.filter((d) => d.amount > 0);
  const avgFeeding = feedingDays.length
    ? Math.round(feedingDays.reduce((s, d) => s + d.amount, 0) / feedingDays.length)
    : 0;
  const sleepDays = sleepSeries.filter((d) => d.hours > 0);
  const avgSleep = sleepDays.length
    ? (sleepDays.reduce((s, d) => s + d.hours, 0) / sleepDays.length).toFixed(1)
    : 0;

  const handleChartClick = (data, type) => {
    if (!data || !data.activePayload?.[0]) return;
    const payload = data.activePayload[0];
    const label = data.activeLabel;
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
    }
    setSelectedBar(null);
    setDayModal({ day: dateLabel, type, data: dayData });
  };

  return (
    <>
      {/* Latest Measurements */}
      {visibleTiles.measurements !== false ? (<div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div className="fade-in fade-in-1">
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
        </div>

        <div className="fade-in fade-in-3">
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
                Moyenne des repas
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
              {avgFeeding ? `${avgFeeding} ${units.volume}` : "—"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              par jour sur la période
            </div>
          </div>
        </div>

        <div className="fade-in fade-in-4">
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
                Sommeil moyen
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
              {avgSleep ? `${avgSleep} H` : "—"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              par jour sur la période
            </div>
          </div>
        </div>
      </div>) : null}

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
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        stroke={colors.feeding}
                        strokeWidth={2}
                        fill={`${colors.feeding}30`}
                        dot={false}
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
                    onViewEntries={() => openDayModal(selectedBar.label, "feeding")}
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
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="hours"
                        stroke={colors.sleep}
                        strokeWidth={2}
                        fill={`${colors.sleep}30`}
                        dot={false}
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
                    onViewEntries={() => openDayModal(selectedBar.label, "sleep")}
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

        {/* Weight Chart */}
        {visibleTiles.weightChart !== false ? (<div className="fade-in fade-in-7">
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
                    actionLabel="Edit"
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
        {visibleTiles.heightChart !== false ? (<div className="fade-in fade-in-8">
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
                    actionLabel="Edit"
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
      <MilkStock childId={childId} onViewEntries={(label) => openDayModal(label, "pumping")} />
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
