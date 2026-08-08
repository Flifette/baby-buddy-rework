export function getAge(birthDate) {
  const birth = new Date(birthDate);
  const now = new Date();
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  const days = now.getDate() - birth.getDate();
  if (days < 0) months--;
  const adjustedDays = days < 0 ? 30 + days : days;
  if (months < 1)
    return `${Math.max(0, Math.floor((now - birth) / 86400000))} jours`;
  if (months < 12)
    return `${months} mois ${adjustedDays} j`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0)
    return `${years} an${years > 1 ? "s" : ""}`;
  return `${years} an${years > 1 ? "s" : ""} ${remainingMonths} mois`;
}

export function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l’instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} H`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

export function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], {
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

export function formatDuration(durationStr) {
  if (!durationStr) return "—";
  const hours = parseDuration(durationStr);
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours.toFixed(1)} H`;
}

export function toFeedingTimeline(feedings, volumeUnit = "mL") {
  const methodLabels = {
    bottle: "Biberon",
    "left breast": "Sein gauche",
    "right breast": "Sein droit",
    "both breasts": "Deux seins",
    "parent fed": "Donné par un parent",
    "self fed": "Autonome",
  };
  const typeLabels = {
    "breast milk": "Lait maternel",
    "fortified breast milk": "Lait maternel enrichi",
    formula: "Lait infantile",
    "solid food": "Aliments solides",
  };

  return feedings.map((f) => ({
    time: formatTime(f.end || f.start),
    label: `${f.amount ? (typeof volumeUnit === "function" ? volumeUnit(f.amount) : f.amount + " " + volumeUnit) : ""} ${methodLabels[f.method] || typeLabels[f.type] || f.method || f.type || ""}`.trim() || "Repas",
    detail: timeAgo(f.end || f.start),
    amount: f.amount || 0,
    type: f.type,
    method: f.method,
    entry: f,
  }));
}

export function toDiaperTimeline(changes) {
  return changes.map((c) => ({
    time: formatTime(c.time),
    type: c.solid && c.wet ? "both" : c.solid ? "solid" : "wet",
    ago: timeAgo(c.time),
    color: c.color,
    entry: c,
  }));
}

export function toSleepBlocks(sleepEntries) {
  return sleepEntries.map((s) => ({
    start: formatTime(s.start),
    end: s.end ? formatTime(s.end) : "en cours",
    duration: parseDuration(s.duration),
    nap: s.nap,
    entry: s,
  }));
}

export function toNoteTimeline(notes) {
  return notes.map((n) => ({
    time: formatTime(n.time),
    text: n.note,
    ago: timeAgo(n.time),
    entry: n,
  }));
}

export function toGrowthSeries(entries, valueKey) {
  return entries
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((e) => ({
      timestamp: new Date(e.date).getTime(),
      date: new Date(e.date).toLocaleDateString([], {
        month: "short",
        day: "numeric",
      }),
      [valueKey]: parseFloat(e[valueKey]),
      entry: e,
    }));
}

export function formatGrowthTick(timestamp) {
  return new Date(timestamp).toLocaleDateString([], {
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

export function aggregateByPeriod(entries, kind, period = "week") {
  const days = { day: 1, week: 7, month: 30, halfyear: 183, year: 365 }[period] || 7;
  const source = Array.isArray(entries) ? entries : [];
  if (period === "all") {
    const keys = [...new Set(source.map((e) => entryDateStr(e.start || e.time || e.date)).filter(Boolean))].sort();
    return keys.map((key) => ({ day: new Date(`${key}T12:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }), amount: source.filter((e) => entryDateStr(e.start || e.time || e.date) === key).reduce((s, e) => s + Number(e.amount || 0), 0), hours: source.filter((e) => entryDateStr(e.start || e.time || e.date) === key).reduce((s, e) => s + parseDuration(e.duration), 0), minutes: source.filter((e) => entryDateStr(e.start || e.time || e.date) === key).reduce((s, e) => s + parseDuration(e.duration) * 60, 0) }));
  }
  const result = getLastNDays(days);
  const sums = Object.fromEntries(result.map((d) => [d.dateStr, { amount: 0, hours: 0, minutes: 0 }]));
  source.forEach((e) => { const key = entryDateStr(e.start || e.time || e.date); if (!sums[key]) return; sums[key].amount += Number(e.amount || 0); sums[key].hours += parseDuration(e.duration); sums[key].minutes += parseDuration(e.duration) * 60; });
  return result.map((d) => ({ day: d.label, amount: Math.round(sums[d.dateStr].amount), hours: Math.round(sums[d.dateStr].hours * 10) / 10, minutes: Math.round(sums[d.dateStr].minutes) }));
}

function getLastNDays(n) {
  const result = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const month = d.toLocaleDateString([], { month: "short", day: "numeric" });
    result.push({
      label: month,
      dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    });
  }
  return result;
}

export function dailyFeedingTotals(entries, numDays = 30) {
  if (numDays == null) {
    const sums = new Map();
    entries.forEach((entry) => {
      const key = entryDateStr(entry.start || entry.time || entry.date);
      sums.set(key, (sums.get(key) || 0) + parseFloat(entry.amount || 0));
    });
    return [...sums.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, amount]) => ({
        date: new Date(`${key}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric" }),
        amount: Math.round(amount),
      }));
  }
  const days = getLastNDays(numDays);
  const sums = {};
  days.forEach((d) => (sums[d.dateStr] = 0));
  entries.forEach((e) => {
    const key = entryDateStr(e.start || e.time || e.date);
    if (key in sums) sums[key] += parseFloat(e.amount || 0);
  });
  const result = days.map((d) => ({ date: d.label, amount: Math.round(sums[d.dateStr]) }));
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

export function dailySleepTotals(entries, numDays = 30) {
  if (numDays == null) {
    const sums = new Map();
    entries.forEach((entry) => {
      const key = entryDateStr(entry.start);
      sums.set(key, (sums.get(key) || 0) + parseDuration(entry.duration));
    });
    return [...sums.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, hours]) => ({
        date: new Date(`${key}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric" }),
        hours: Math.round(hours * 10) / 10,
      }));
  }
  const days = getLastNDays(numDays);
  const sums = {};
  days.forEach((d) => (sums[d.dateStr] = 0));
  entries.forEach((e) => {
    const key = entryDateStr(e.start);
    if (key in sums) sums[key] += parseDuration(e.duration);
  });
  const result = days.map((d) => ({ date: d.label, hours: Math.round(sums[d.dateStr] * 10) / 10 }));
  const firstNonZero = result.findIndex((d) => d.hours > 0);
  return firstNonZero > 0 ? result.slice(firstNonZero) : result;
}

export function dailyTummyTotals(entries, numDays = 30) {
  if (numDays == null) {
    const sums = new Map();
    entries.forEach((entry) => {
      const key = entryDateStr(entry.start);
      sums.set(key, (sums.get(key) || 0) + parseDuration(entry.duration) * 60);
    });
    return [...sums.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, minutes]) => ({
        date: new Date(`${key}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric" }),
        minutes: Math.round(minutes),
      }));
  }
  const days = getLastNDays(numDays);
  const sums = {};
  days.forEach((day) => (sums[day.dateStr] = 0));
  entries.forEach((entry) => {
    const key = entryDateStr(entry.start);
    if (key in sums) sums[key] += parseDuration(entry.duration) * 60;
  });
  const result = days.map((day) => ({ date: day.label, minutes: Math.round(sums[day.dateStr]) }));
  const firstNonZero = result.findIndex((day) => day.minutes > 0);
  return firstNonZero > 0 ? result.slice(firstNonZero) : result;
}
