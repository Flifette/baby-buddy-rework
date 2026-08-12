import { localeFor, translate } from "./i18nCore.js";

export function getAge(birthDate, language = "fr") {
  const birth = new Date(birthDate);
  const now = new Date();
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  const days = now.getDate() - birth.getDate();
  if (days < 0) months--;
  const adjustedDays = days < 0 ? 30 + days : days;
  if (months < 1)
    return translate("age.days", { count: Math.max(0, Math.floor((now - birth) / 86400000)) }, language);
  if (months < 12)
    return translate("age.months", { months, days: adjustedDays }, language);
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return translate("age.years", { years, months: remainingMonths }, language);
}

export function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function timeAgo(dateStr, language = "fr") {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return translate("time.now", {}, language);
  if (mins < 60) return translate("time.minutesAgo", { count: mins }, language);
  const hours = Math.floor(mins / 60);
  if (hours < 24) return translate("time.hoursAgo", { count: hours }, language);
  const days = Math.floor(hours / 24);
  return translate("time.daysAgo", { count: days }, language);
}

export function formatTime(dateStr, language = "fr") {
  return new Date(dateStr).toLocaleTimeString(localeFor(language), {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function parseDuration(durationStr) {
  if (!durationStr) return 0;
  const parts = durationStr.split(":").map(Number);
  if (parts.length === 3) return parts[0] + parts[1] / 60 + parts[2] / 3600;
  if (parts.length === 2) return parts[0] + parts[1] / 60;
  return parts[0];
}

export function formatDuration(durationStr, language = "fr") {
  if (!durationStr) return "—";
  const hours = parseDuration(durationStr);
  if (hours < 1) return `${Math.round(hours * 60)} ${translate("unit.minuteShort", {}, language)}`;
  return `${hours.toFixed(1)} ${translate("unit.hourShort", {}, language)}`;
}

export function applyMilkWasteToFeedings(feedings = [], milkWaste = []) {
  const adjusted = feedings.map((entry) => ({
    ...entry,
    _originalEntry: entry,
    _originalAmount: entry.amount,
    _milkWasteAmount: 0,
    amount: entry.amount == null ? entry.amount : Number(entry.amount || 0),
  }));

  const wasteEntries = milkWaste
    .filter((entry) => entry?.time && Number(entry.amount || 0) > 0)
    .slice()
    .sort((left, right) => new Date(left.time) - new Date(right.time));

  wasteEntries.forEach((waste) => {
    let remaining = Number(waste.amount || 0);
    const wasteTime = new Date(waste.time).getTime();
    const wasteDay = entryDateStr(waste.time);
    const candidates = adjusted
      .map((entry, index) => ({ entry, index, timestamp: new Date(entry.end || entry.start).getTime() }))
      .filter(({ entry, timestamp }) =>
        entry.type === "breast milk"
        && entry.method === "bottle"
        && Number(entry.amount || 0) > 0
        && entryDateStr(entry.end || entry.start) === wasteDay
        && timestamp <= wasteTime)
      .sort((left, right) => right.timestamp - left.timestamp);

    candidates.forEach(({ index }) => {
      if (remaining <= 0) return;
      const available = Number(adjusted[index].amount || 0);
      const deducted = Math.min(available, remaining);
      adjusted[index].amount = available - deducted;
      adjusted[index]._milkWasteAmount += deducted;
      remaining -= deducted;
    });
  });

  return adjusted;
}

export function toFeedingTimeline(feedings, volumeUnit = "mL", language = "fr") {
  const methodLabels = {
    bottle: translate("feeding.method.bottle", {}, language),
    "left breast": translate("feeding.method.leftBreast", {}, language),
    "right breast": translate("feeding.method.rightBreast", {}, language),
    "both breasts": translate("feeding.method.bothBreasts", {}, language),
    "parent fed": translate("feeding.method.parentFed", {}, language),
    "self fed": translate("feeding.method.selfFed", {}, language),
  };
  const typeLabels = {
    "breast milk": translate("feeding.type.breastMilk", {}, language),
    "fortified breast milk": translate("feeding.type.fortifiedBreastMilk", {}, language),
    formula: translate("feeding.type.formula", {}, language),
    "solid food": translate("feeding.type.solidFood", {}, language),
  };

  const formatAmount = (amount) => typeof volumeUnit === "function" ? volumeUnit(amount) : `${amount} ${volumeUnit}`;
  return feedings.map((f) => {
    const hasAmount = f.amount != null || f._originalAmount != null;
    const wasteLabel = Number(f._milkWasteAmount || 0) > 0 ? ` · ${translate("feeding.wasteSuffix", { amount: formatAmount(f._milkWasteAmount) }, language)}` : "";
    return {
      time: formatTime(f.end || f.start, language),
      label: `${hasAmount ? formatAmount(Number(f.amount || 0)) : ""} ${methodLabels[f.method] || typeLabels[f.type] || f.method || f.type || ""}${wasteLabel}`.trim() || translate("activity.feeding", {}, language),
      detail: timeAgo(f.end || f.start, language),
      amount: f.amount || 0,
      type: f.type,
      method: f.method,
      entry: f._originalEntry || f,
    };
  });
}

export function toDiaperTimeline(changes, language = "fr") {
  return changes.map((c) => ({
    time: formatTime(c.time, language),
    type: c.solid && c.wet ? "both" : c.solid ? "solid" : "wet",
    ago: timeAgo(c.time, language),
    color: c.color,
    entry: c,
  }));
}

export function toSleepBlocks(sleepEntries, language = "fr") {
  return sleepEntries.map((s) => ({
    start: formatTime(s.start, language),
    end: s.end ? formatTime(s.end, language) : translate("common.ongoing", {}, language),
    duration: parseDuration(s.duration),
    nap: s.nap,
    entry: s,
  }));
}

export function toNoteTimeline(notes, language = "fr") {
  return notes.map((n) => ({
    time: formatTime(n.time, language),
    text: n.note,
    ago: timeAgo(n.time, language),
    entry: n,
  }));
}

export function toGrowthSeries(entries, valueKey, language = "fr") {
  return entries
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((e) => ({
      timestamp: new Date(e.date).getTime(),
      date: new Date(e.date).toLocaleDateString(localeFor(language), {
        month: "short",
        day: "numeric",
      }),
      [valueKey]: parseFloat(e[valueKey]),
      entry: e,
    }));
}

export function formatGrowthTick(timestamp, language = "fr") {
  return new Date(timestamp).toLocaleDateString(localeFor(language), {
    month: "short",
    day: "numeric",
  });
}

function getLast7Days() {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const result = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    result.push({
      label: dayNames[d.getDay()],
      dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    });
  }
  return result;
}

function entryDateStr(dateVal) {
  const d = new Date(dateVal);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function aggregateByDayOfWeek(entries, valueKey, dateKey = "start") {
  const days = getLast7Days();
  const sums = {};
  days.forEach((d) => (sums[d.dateStr] = 0));
  entries.forEach((e) => {
    const key = entryDateStr(e[dateKey] || e.time || e.date);
    if (key in sums) sums[key] += parseFloat(e[valueKey] || 0);
  });
  return days.map((d) => ({ day: d.label, amount: Math.round(sums[d.dateStr]) }));
}

export function aggregateSleepByDay(entries) {
  const days = getLast7Days();
  const sums = {};
  days.forEach((d) => (sums[d.dateStr] = 0));
  entries.forEach((e) => {
    const key = entryDateStr(e.start);
    if (key in sums) sums[key] += parseDuration(e.duration);
  });
  return days.map((d) => ({ day: d.label, hours: Math.round(sums[d.dateStr] * 10) / 10 }));
}

export function aggregateTummyByDay(entries) {
  const days = getLast7Days();
  const sums = {};
  days.forEach((d) => (sums[d.dateStr] = 0));
  entries.forEach((e) => {
    const key = entryDateStr(e.start);
    if (key in sums) sums[key] += parseDuration(e.duration) * 60;
  });
  return days.map((d) => ({ day: d.label, minutes: Math.round(sums[d.dateStr]) }));
}

export function aggregateByPeriod(entries, kind, period = "week", subtractEntries = [], language = "fr") {
  const days = { day: 1, week: 7, month: 30, halfyear: 183, year: 365 }[period] || 7;
  const source = Array.isArray(entries) ? entries : [];
  const subtractions = Array.isArray(subtractEntries) ? subtractEntries : [];
  if (period === "all") {
    const keys = [...new Set([...source, ...subtractions].map((e) => entryDateStr(e.start || e.time || e.date)).filter(Boolean))].sort();
    return keys.map((key) => ({ day: new Date(`${key}T12:00:00`).toLocaleDateString(localeFor(language), { day: "2-digit", month: "short" }), dateKey: key, amount: Math.max(0, source.filter((e) => entryDateStr(e.start || e.time || e.date) === key).reduce((s, e) => s + Number(e.amount || 0), 0) - subtractions.filter((e) => entryDateStr(e.start || e.time || e.date) === key).reduce((s, e) => s + Number(e.amount || 0), 0)), hours: source.filter((e) => entryDateStr(e.start || e.time || e.date) === key).reduce((s, e) => s + parseDuration(e.duration), 0), minutes: source.filter((e) => entryDateStr(e.start || e.time || e.date) === key).reduce((s, e) => s + parseDuration(e.duration) * 60, 0) }));
  }
  const result = getLastNDays(days, language);
  const sums = Object.fromEntries(result.map((d) => [d.dateStr, { amount: 0, hours: 0, minutes: 0 }]));
  source.forEach((e) => { const key = entryDateStr(e.start || e.time || e.date); if (!sums[key]) return; sums[key].amount += Number(e.amount || 0); sums[key].hours += parseDuration(e.duration); sums[key].minutes += parseDuration(e.duration) * 60; });
  subtractions.forEach((e) => { const key = entryDateStr(e.start || e.time || e.date); if (sums[key]) sums[key].amount -= Number(e.amount || 0); });
  return result.map((d) => ({ day: d.label, dateKey: d.dateStr, amount: Math.max(0, Math.round(sums[d.dateStr].amount)), hours: Math.round(sums[d.dateStr].hours * 10) / 10, minutes: Math.round(sums[d.dateStr].minutes) }));
}

function getLastNDays(n, language = "fr") {
  const result = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const month = d.toLocaleDateString(localeFor(language), { month: "short", day: "numeric" });
    result.push({
      label: month,
      dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    });
  }
  return result;
}

export function dailyFeedingTotals(entries, numDays = 30, subtractEntries = [], language = "fr") {
  if (numDays == null) {
    const sums = new Map();
    entries.forEach((entry) => {
      const key = entryDateStr(entry.start || entry.time || entry.date);
      sums.set(key, (sums.get(key) || 0) + parseFloat(entry.amount || 0));
    });
    subtractEntries.forEach((entry) => {
      const key = entryDateStr(entry.time || entry.start || entry.date);
      sums.set(key, (sums.get(key) || 0) - parseFloat(entry.amount || 0));
    });
    return [...sums.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, amount]) => ({
        date: new Date(`${key}T12:00:00`).toLocaleDateString(localeFor(language), { month: "short", day: "numeric" }),
        dateKey: key,
        amount: Math.max(0, Math.round(amount)),
      }));
  }
  const days = getLastNDays(numDays, language);
  const sums = {};
  days.forEach((d) => (sums[d.dateStr] = 0));
  entries.forEach((e) => {
    const key = entryDateStr(e.start || e.time || e.date);
    if (key in sums) sums[key] += parseFloat(e.amount || 0);
  });
  subtractEntries.forEach((e) => {
    const key = entryDateStr(e.time || e.start || e.date);
    if (key in sums) sums[key] -= parseFloat(e.amount || 0);
  });
  const result = days.map((d) => ({ date: d.label, dateKey: d.dateStr, amount: Math.max(0, Math.round(sums[d.dateStr])) }));
  const firstNonZero = result.findIndex((d) => d.amount > 0);
  return firstNonZero > 0 ? result.slice(firstNonZero) : result;
}

export function getEntriesForDay(entries, dayLabel, dateKey = "start") {
  const days = getLast7Days();
  const targetDay = days.find((d) => d.label === dayLabel);
  if (!targetDay) return [];

  return entries.filter((e) => {
    const key = entryDateStr(e[dateKey] || e.time || e.date);
    return key === targetDay.dateStr;
  });
}

export function getEntriesForDate(entries, dateLabel, dateKey = "start") {
  const targetDate = dateLabel; // Already in format like "Jan 15"
  return entries.filter((e) => {
    const entryDate = new Date(e[dateKey] || e.time || e.date);
    const formattedDate = entryDate.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
    return formattedDate === targetDate;
  });
}

export function getEntriesForDateKey(entries, targetDateKey, dateField = "start") {
  if (!targetDateKey) return [];
  return entries.filter((entry) =>
    entryDateStr(entry[dateField] || entry.time || entry.date) === targetDateKey
  );
}

export function dailySleepTotals(entries, numDays = 30, language = "fr") {
  if (numDays == null) {
    const sums = new Map();
    entries.forEach((entry) => {
      const key = entryDateStr(entry.start);
      sums.set(key, (sums.get(key) || 0) + parseDuration(entry.duration));
    });
    return [...sums.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, hours]) => ({
        date: new Date(`${key}T12:00:00`).toLocaleDateString(localeFor(language), { month: "short", day: "numeric" }),
        dateKey: key,
        hours: Math.round(hours * 10) / 10,
      }));
  }
  const days = getLastNDays(numDays, language);
  const sums = {};
  days.forEach((d) => (sums[d.dateStr] = 0));
  entries.forEach((e) => {
    const key = entryDateStr(e.start);
    if (key in sums) sums[key] += parseDuration(e.duration);
  });
  const result = days.map((d) => ({ date: d.label, dateKey: d.dateStr, hours: Math.round(sums[d.dateStr] * 10) / 10 }));
  const firstNonZero = result.findIndex((d) => d.hours > 0);
  return firstNonZero > 0 ? result.slice(firstNonZero) : result;
}

export function dailyTummyTotals(entries, numDays = 30, language = "fr") {
  if (numDays == null) {
    const sums = new Map();
    entries.forEach((entry) => {
      const key = entryDateStr(entry.start);
      sums.set(key, (sums.get(key) || 0) + parseDuration(entry.duration) * 60);
    });
    return [...sums.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, minutes]) => ({
        date: new Date(`${key}T12:00:00`).toLocaleDateString(localeFor(language), { month: "short", day: "numeric" }),
        dateKey: key,
        minutes: Math.round(minutes),
      }));
  }
  const days = getLastNDays(numDays, language);
  const sums = {};
  days.forEach((day) => (sums[day.dateStr] = 0));
  entries.forEach((entry) => {
    const key = entryDateStr(entry.start);
    if (key in sums) sums[key] += parseDuration(entry.duration) * 60;
  });
  const result = days.map((day) => ({ date: day.label, dateKey: day.dateStr, minutes: Math.round(sums[day.dateStr]) }));
  const firstNonZero = result.findIndex((day) => day.minutes > 0);
  return firstNonZero > 0 ? result.slice(firstNonZero) : result;
}
