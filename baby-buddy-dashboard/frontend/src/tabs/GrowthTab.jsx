import { useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceDot,
} from "recharts";
import SectionCard from "../components/SectionCard";
import MilkStock from "../components/MilkStock";
import CustomTooltip from "../components/CustomTooltip";
import ChartDetailBar from "../components/ChartDetailBar";
import DayActivitiesModal from "../components/DayActivitiesModal";
import { Icons } from "../components/Icons";
import { colors } from "../utils/colors";
import { useUnits } from "../utils/units";
import { toGrowthSeries, formatGrowthTick, dailyFeedingTotals, dailyFeedingGrowthTotals, dailySleepTotals, dailyTummyTotals, getEntriesForDateKey, parseDuration, applyMilkWasteToFeedings } from "../utils/formatters";
import { useLanguage } from "../utils/i18n";
import { isDirectBreastfeeding, measurableFeedingAmount } from "../utils/feedings";

const hourLabel = (value, locale) => new Date(value).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

export default function GrowthTab({ weights, heights, monthlyFeedings, monthlySleep, tummyTimes = [], pumping = [], feedings = [], milkWaste = [], period = "week", onEditEntry, onEditMilkWaste, visibleTiles = {} }) {
  const units = useUnits();
  const { language, locale, t } = useLanguage();
  const formatHour = (value) => hourLabel(value, locale);
  const growthTick = (value) => formatGrowthTick(value, language);
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
  const periodMilkWaste = (milkWaste || []).filter((e) => inPeriod(e, "time"));
  const netPeriodFeedings = applyMilkWasteToFeedings(periodFeedings, periodMilkWaste);
  const weightSeries = toGrowthSeries(periodWeights, "weight", language);
  const heightSeries = toGrowthSeries(periodHeights, "height", language);
  // "Total" renders only dates that actually contain data instead of 3,650
  // empty daily points, which keeps Recharts responsive on long histories.
  const chartDays = periodDays || null;
  const feedingSeries = period === "day"
    ? netPeriodFeedings.slice().sort((a, b) => new Date(a.start) - new Date(b.start)).map((entry) => {
      const directBreastfeeding = isDirectBreastfeeding(entry);
      return {
        date: formatHour(entry.start),
        timestamp: new Date(entry.start).getTime(),
        amount: directBreastfeeding ? null : measurableFeedingAmount(entry),
        directCount: directBreastfeeding ? 1 : null,
        entry: entry._originalEntry || entry,
      };
    })
    : dailyFeedingGrowthTotals(netPeriodFeedings, chartDays, language);
  const sleepSeries = period === "day"
    ? periodSleep.slice().sort((a, b) => new Date(a.start) - new Date(b.start)).map((entry) => ({ date: formatHour(entry.start), timestamp: new Date(entry.start).getTime(), hours: parseDuration(entry.duration), entry }))
    : dailySleepTotals(periodSleep, chartDays, language);
  const tummySeries = period === "day"
    ? periodTummy.slice().sort((a, b) => new Date(a.start) - new Date(b.start)).map((entry) => ({ date: formatHour(entry.start), timestamp: new Date(entry.start).getTime(), minutes: Math.round(parseDuration(entry.duration) * 60), entry }))
    : dailyTummyTotals(periodTummy, chartDays, language);
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
  const totalFeeding = netPeriodFeedings.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const hasFeedingVolume = periodFeedings.some((item) => measurableFeedingAmount(item) > 0);
  const directBreastfeedingCount = periodFeedings.filter(isDirectBreastfeeding).length;
  const totalSleep = sleepSeries.reduce((sum, item) => sum + Number(item.hours || 0), 0).toFixed(1);
  const tummyDays = tummySeries.filter((item) => item.minutes > 0);
  const avgTummy = tummyDays.length ? Math.round(tummyDays.reduce((sum, item) => sum + item.minutes, 0) / tummyDays.length) : 0;
  const totalTummy = tummySeries.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
  const wasteSeries = dailyFeedingTotals(periodMilkWaste, chartDays, [], language);
  const wasteDays = wasteSeries.filter((item) => item.amount > 0);
  const totalMilkWaste = periodMilkWaste.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const avgMilkWaste = wasteDays.length
    ? Math.round(wasteDays.reduce((sum, item) => sum + Number(item.amount || 0), 0) / wasteDays.length)
    : 0;

  const handleChartClick = (data, type) => {
    if (!data || !data.activePayload?.[0]) return;
    const payload = data.activePayload.find((item) => Number(item.value) > 0) || data.activePayload[0];
    const rawLabel = data.activeLabel;
    const label = period === "day" && (type === "feeding" || type === "sleep" || type === "tummy") ? formatHour(rawLabel) : rawLabel;
    const value = payload.value;
    const entry = payload.payload?.entry;
    const dateKey = payload.payload?.dateKey;
    setSelectedBar({ type, label, value, entry, dateKey, dataKey: payload.dataKey });
  };

  const openDayModal = (dateLabel, dateKey, type) => {
    let dayData = [];
    if (type === "feeding") {
      dayData = getEntriesForDateKey(periodFeedings, dateKey, "start");
    } else if (type === "sleep") {
      dayData = getEntriesForDateKey(periodSleep, dateKey, "start");
    } else if (type === "pumping") {
      dayData = getEntriesForDateKey(pumping, dateKey, "start");
    } else if (type === "tummy") {
      dayData = getEntriesForDateKey(periodTummy, dateKey, "start");
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
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
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
                {t("growth.latestWeight")}
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
              {latestWeight ? `${latestWeight.weight} ${units.weight}` : "—"}
            </div>
            {latestWeight && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                {new Date(latestWeight.date).toLocaleDateString(locale)}
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
                {t("growth.latestHeight")}
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
              {latestHeight ? `${latestHeight.height} ${units.length}` : "—"}
            </div>
            {latestHeight && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                {new Date(latestHeight.date).toLocaleDateString(locale)}
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
                {!hasFeedingVolume && directBreastfeedingCount > 0
                  ? t("growth.directBreastfeeding")
                  : period === "day" ? t("activity.feeding") : t("growth.feedingAverage")}
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
              {hasFeedingVolume
                ? `${period === "day" ? totalFeeding : avgFeeding} ${units.volume}`
                : directBreastfeedingCount || "—"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              {hasFeedingVolume
                ? `${t(period === "day" ? "common.duringDay" : "common.perDayPeriod")}${directBreastfeedingCount > 0 ? ` · ${t("growth.directBreastfeedingsCount", { count: directBreastfeedingCount })}` : ""}`
                : t(period === "day" ? "common.duringDay" : "common.onThisPeriod")}
            </div>
          </div>
        </div>) : null}

        {visibleTiles.milkWasteSummary !== false ? (<div className="fade-in fade-in-4">
          <div style={{ background: "var(--card-bg)", borderRadius: 16, padding: "20px 22px", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${colors.milkWaste}18`, color: colors.milkWaste, display: "flex", alignItems: "center", justifyContent: "center" }}><Icons.BottleOff /></div>
              <span style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                {period === "day" ? t("overview.notConsumed") : t("growth.milkWasteAverage")}
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
              {(period === "day" ? totalMilkWaste : avgMilkWaste) > 0 ? `${period === "day" ? totalMilkWaste : avgMilkWaste} ${units.volume}` : "—"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              {t(period === "day" ? "common.duringDay" : "common.perDayPeriod")}
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
                {period === "day" ? t("activity.sleep") : t("growth.sleepAverage")}
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
              {(period === "day" ? Number(totalSleep) : avgSleep) ? `${period === "day" ? totalSleep : avgSleep} ${t("unit.hourShort")}` : "—"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              {t(period === "day" ? "common.duringDay" : "common.perDayPeriod")}
            </div>
          </div>
        </div>) : null}

        {visibleTiles.tummySummary !== false ? (<div className="fade-in fade-in-4">
          <div style={{ background: "var(--card-bg)", borderRadius: 16, padding: "20px 22px", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${colors.tummy}18`, color: colors.tummy, display: "flex", alignItems: "center", justifyContent: "center" }}><Icons.BabyCrawl /></div>
              <span style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                {period === "day" ? t("activity.tummy") : t("growth.tummyAverage")}
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
              {(period === "day" ? totalTummy : avgTummy) ? `${period === "day" ? totalTummy : avgTummy} ${t("unit.minuteShort")}` : "—"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              {t(period === "day" ? "common.duringDay" : "common.perDayPeriod")}
            </div>
          </div>
        </div>) : null}

        </>
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
          <SectionCard title={t("growth.dailyFeedings")} icon={<Icons.Bottle />} color={colors.feeding}>
            {feedingSeries.some((d) => d.amount > 0 || d.directCount > 0) ? (
              <>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={feedingSeries} onClick={(data) => handleChartClick(data, "feeding")}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#252836" vertical={false} />
                      <XAxis dataKey={period === "day" ? "timestamp" : "date"} type={period === "day" ? "number" : "category"} scale={period === "day" ? "time" : "auto"} domain={period === "day" ? dayDomain : undefined} tickFormatter={period === "day" ? formatHour : undefined} tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis yAxisId="volume" hide={!hasFeedingVolume} tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="direct" hide={directBreastfeedingCount === 0 || (period === "day" && !hasFeedingVolume)} orientation="right" allowDecimals={false} tick={{ fontSize: 11, fill: colors.pumping }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip labelFormatter={period === "day" ? formatHour : undefined} />} />
                      <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 11 }} />
                      {hasFeedingVolume ? (period === "day" ? <Line
                        dataKey="amount"
                        name={t("chart.amount")}
                        yAxisId="volume"
                        stroke={colors.feeding}
                        strokeOpacity={0}
                        strokeWidth={1}
                        legendType="circle"
                        dot={false}
                        activeDot={false}
                        connectNulls={false}
                      /> : <Area
                        type="monotone"
                        dataKey="amount"
                        name={t("chart.amount")}
                        yAxisId="volume"
                        stroke={colors.feeding}
                        strokeWidth={2}
                        fill={`${colors.feeding}30`}
                        dot={false}
                        activeDot={{ r: 4, fill: colors.feeding, cursor: "pointer" }}
                        cursor="pointer"
                      />) : null}
                      {directBreastfeedingCount > 0 ? <Line
                        type="monotone"
                        dataKey="directCount"
                        yAxisId="direct"
                        name={t("chart.directBreastfeedings")}
                        stroke={colors.pumping}
                        strokeOpacity={period === "day" ? 0 : 1}
                        strokeWidth={period === "day" ? 1 : 2}
                        strokeDasharray={period === "day" ? undefined : "4 3"}
                        legendType={period === "day" ? "circle" : "line"}
                        dot={period === "day" ? false : { r: 3, fill: colors.pumping, stroke: colors.pumping }}
                        activeDot={period === "day" ? false : { r: 5, fill: colors.pumping, stroke: colors.pumping, cursor: "pointer" }}
                        connectNulls={false}
                        cursor="pointer"
                      /> : null}
                      {period === "day" ? feedingSeries.map((point) => {
                        const dataKey = point.directCount > 0 ? "directCount" : "amount";
                        const value = point[dataKey];
                        if (!(value > 0)) return null;
                        return <ReferenceDot
                          key={`${dataKey}-${point.timestamp}-${point.entry?.id ?? "entry"}`}
                          x={point.timestamp}
                          y={value}
                          yAxisId={dataKey === "directCount" ? "direct" : "volume"}
                          r={4}
                          fill={dataKey === "directCount" ? colors.pumping : colors.feeding}
                          stroke={dataKey === "directCount" ? colors.pumping : colors.feeding}
                          isFront
                          cursor="pointer"
                          onClick={() => setSelectedBar({ type: "feeding", label: formatHour(point.timestamp), value, entry: point.entry, dataKey })}
                        />;
                      }) : null}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                {selectedBar?.type === "feeding" && (
                  <ChartDetailBar
                    label={selectedBar.label}
                    value={selectedBar.value}
                    unit={selectedBar.dataKey === "directCount" ? t("growth.directBreastfeedingUnit") : units.volume}
                    color={selectedBar.dataKey === "directCount" ? colors.pumping : colors.feeding}
                    onViewEntries={() => {
                      if (period === "day" && selectedBar.entry) onEditEntry?.("feeding", selectedBar.entry);
                      else openDayModal(selectedBar.label, selectedBar.dateKey, "feeding");
                    }}
                    onDismiss={() => setSelectedBar(null)}
                  />
                )}
              </>
            ) : (
              <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: 40 }}>
                {t("growth.noFeedingData")}
              </div>
            )}
          </SectionCard>
        </div>) : null}

        {/* Daily Sleep Totals */}
        {visibleTiles.sleepChart !== false ? (<div className="fade-in fade-in-6">
          <SectionCard title={t("growth.dailySleep")} icon={<Icons.Moon />} color={colors.sleep}>
            {sleepSeries.some((d) => d.hours > 0) ? (
              <>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sleepSeries} onClick={(data) => handleChartClick(data, "sleep")}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#252836" vertical={false} />
                      <XAxis dataKey={period === "day" ? "timestamp" : "date"} type={period === "day" ? "number" : "category"} scale={period === "day" ? "time" : "auto"} domain={period === "day" ? dayDomain : undefined} tickFormatter={period === "day" ? formatHour : undefined} tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip labelFormatter={period === "day" ? formatHour : undefined} />} />
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
                    unit={t("unit.hourShort")}
                    color={colors.sleep}
                    onViewEntries={() => {
                      if (period === "day" && selectedBar.entry) onEditEntry?.("sleep", selectedBar.entry);
                      else openDayModal(selectedBar.label, selectedBar.dateKey, "sleep");
                    }}
                    onDismiss={() => setSelectedBar(null)}
                  />
                )}
              </>
            ) : (
              <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: 40 }}>
                {t("growth.noSleepData")}
              </div>
            )}
          </SectionCard>
        </div>) : null}

        {/* Daily Tummy Time Totals */}
        {visibleTiles.tummyChart !== false ? (<div className="fade-in fade-in-6">
          <SectionCard title={t("growth.dailyTummy")} icon={<Icons.BabyCrawl />} color={colors.tummy}>
            {tummySeries.some((item) => item.minutes > 0) ? (
              <>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={tummySeries} onClick={(data) => handleChartClick(data, "tummy")}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#252836" vertical={false} />
                      <XAxis dataKey={period === "day" ? "timestamp" : "date"} type={period === "day" ? "number" : "category"} scale={period === "day" ? "time" : "auto"} domain={period === "day" ? dayDomain : undefined} tickFormatter={period === "day" ? formatHour : undefined} tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip labelFormatter={period === "day" ? formatHour : undefined} />} />
                      <Area type="monotone" dataKey="minutes" stroke={colors.tummy} strokeWidth={2} fill={`${colors.tummy}30`} dot={period === "day" ? { r: 4, fill: colors.tummy } : false} activeDot={{ r: 4, fill: colors.tummy, cursor: "pointer" }} cursor="pointer" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {selectedBar?.type === "tummy" && (
                  <ChartDetailBar
                    label={selectedBar.label}
                    value={selectedBar.value}
                    unit={t("unit.minuteShort")}
                    color={colors.tummy}
                    onViewEntries={() => {
                      if (period === "day" && selectedBar.entry) onEditEntry?.("tummy", selectedBar.entry);
                      else openDayModal(selectedBar.label, selectedBar.dateKey, "tummy");
                    }}
                    onDismiss={() => setSelectedBar(null)}
                  />
                )}
              </>
            ) : (
              <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: 40 }}>{t("growth.noTummyData")}</div>
            )}
          </SectionCard>
        </div>) : null}

        {/* Weight Chart */}
        {period !== "day" && visibleTiles.weightChart !== false ? (<div className="fade-in fade-in-7">
          <SectionCard title={t("growth.weightEvolution")} icon={<Icons.Weight />} color={colors.growth}>
            {weightSeries.length >= 2 ? (
              <>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightSeries} onClick={(data) => handleChartClick(data, "weight")}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#252836" vertical={false} />
                      <XAxis dataKey="timestamp" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={growthTick} tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                      <Tooltip content={<CustomTooltip labelFormatter={growthTick} />} />
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
                    label={growthTick(selectedBar.label)}
                    value={selectedBar.value}
                    unit={units.weight}
                    color={colors.growth}
                    actionLabel={t("common.edit")}
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
                {t(weightSeries.length === 1 ? "growth.twoMeasurements" : "growth.noWeightData")}
              </div>
            )}
          </SectionCard>
        </div>) : null}

        {/* Height Chart */}
        {period !== "day" && visibleTiles.heightChart !== false ? (<div className="fade-in fade-in-8">
          <SectionCard title={t("growth.heightEvolution")} icon={<Icons.Ruler />} color={colors.height}>
            {heightSeries.length >= 2 ? (
              <>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={heightSeries} onClick={(data) => handleChartClick(data, "height")}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#252836" vertical={false} />
                      <XAxis dataKey="timestamp" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={growthTick} tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#5A6178" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                      <Tooltip content={<CustomTooltip labelFormatter={growthTick} />} />
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
                    label={growthTick(selectedBar.label)}
                    value={selectedBar.value}
                    unit={units.length}
                    color={colors.height}
                    actionLabel={t("common.edit")}
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
                {t(heightSeries.length === 1 ? "growth.twoMeasurements" : "growth.noHeightData")}
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
