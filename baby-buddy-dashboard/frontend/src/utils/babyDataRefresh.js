import { ApiError } from "../api.js";
import { localDateFromKey, localDateKey } from "./formatters.js";

const PERIOD_DAYS = { day: 1, week: 7, month: 30, halfyear: 183, year: 365 };
const PAGE_SIZE = 500;
const MAX_PAGES = 200;

function invalidList() {
  return new ApiError("Invalid activity list", { code: "request_invalid_response" });
}

export async function readAllPages(read, params = {}, signal) {
  const entries = [];
  const ids = new Set();
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    if (signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
    const response = await read({ ...params, limit: PAGE_SIZE, offset }, { signal });
    const pageEntries = Array.isArray(response) && page === 0 ? response : response?.results;
    if (!Array.isArray(pageEntries)) throw invalidList();
    for (const entry of pageEntries) {
      if (!entry || typeof entry !== "object") throw invalidList();
      if (entry.id == null || !ids.has(entry.id)) entries.push(entry);
      if (entry.id != null) ids.add(entry.id);
    }
    if (!response.next) return entries;
    if (!pageEntries.length) throw invalidList();
    offset += pageEntries.length;
  }
  throw invalidList();
}

function dayBounds(key) {
  const day = localDateFromKey(key);
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  const end = new Date(next.getTime() - 1000).toISOString().replace(".000Z", ".999999Z");
  return { start: start.toISOString(), end, next };
}

// Baby Buddy timestamps are inclusive. Build the bounds from calendar days in
// the browser's timezone so dates on either side of a DST change stay correct.
export function dataScope(period, tab, day, now = new Date()) {
  const today = localDateKey(now);
  const dayKey = tab === "day" ? (localDateFromKey(day) ? day : today) : null;
  const singleDay = dayKey || (period === "day" ? today : null);
  if (singleDay) {
    const { start, end, next } = dayBounds(singleDay);
    return { day: dayKey, min: start, max: end, next };
  }
  const days = PERIOD_DAYS[period];
  const min = days ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)).toISOString() : undefined;
  return { day: null, min };
}

export function createSectionReads(api, child, period, tab, day, now) {
  const { day: requestedDay, min, max, next } = dataScope(period, tab, day, now);
  const times = { child, start_min: min, start_max: max, ordering: "-start" };
  const dates = { child, date_min: min, date_max: max, ordering: "-time" };
  const isDayView = tab === "day";
  const includeStock = tab === "overview" || tab === "growth";
  const includeNotes = isDayView || tab === "notes";
  const includeActivities = tab !== "notes";
  const includeMeasurements = isDayView || tab === "growth";
  const fullStock = includeStock && period === "all";
  const measurements = { child, date: requestedDay, ordering: "-date" };
  const reads = [];
  const add = (key, read, params, transform = value => value) => {
    reads.push({ key, read: async (signal) => ({ [key]: transform(await readAllPages(read, params, signal)) }) });
  };
  add("timers", api.getTimers, {}, entries => entries.filter(entry => entry.child == null || String(entry.child?.id ?? entry.child) === String(child)));
  if (includeActivities) {
    add("feedings", api.getFeedings, times);
    add("sleepEntries", api.getSleep, isDayView
      ? { child, end_min: min, start_max: max, ordering: "-start" }
      : times);
    add("pumping", api.getPumping, times);
    add("tummyTimes", api.getTummyTimes, times);
    if (tab !== "growth") add("changes", api.getChanges, dates);
  }
  if (includeNotes) add("notes", api.getNotes, dates);
  if (isDayView) add("temperatures", api.getTemperature, dates);
  if (includeMeasurements) {
    add("weights", api.getWeight, measurements);
    add("heights", api.getHeight, measurements);
  }
  if (includeStock || isDayView) {
    // Older locally stored entries may use naive timestamps. Let the browser
    // interpret them in the same timezone as the rest of the dashboard.
    const minTime = min ? Date.parse(min) : -Infinity;
    const endTime = next?.getTime() ?? Infinity;
    add("milkWaste", api.getMilkWaste, { child }, entries => entries.filter(entry => {
      const time = Date.parse(entry.time);
      return time >= minTime && time < endTime;
    }));
  }
  if (includeStock && !fullStock) {
    // Update both sides of the balance together, even if one read fails.
    reads.push({ key: "stock", read: async (signal) => {
      const stockFeedings = await readAllPages(api.getFeedings, { child, type: "breast milk", method: "bottle", ordering: "-start" }, signal);
      const stockPumping = await readAllPages(api.getPumping, { child, ordering: "-start" }, signal);
      return { stockFeedings, stockPumping };
    } });
  }
  return { reads, fullStock };
}

export async function refreshSections(reads, signal, apply, parallelism = 4) {
  let cursor = 0;
  async function worker() {
    while (!signal.aborted && cursor < reads.length) {
      const section = reads[cursor++];
      try {
        const data = await section.read(signal);
        if (!signal.aborted) apply(section, { data });
      } catch (error) {
        if (!signal.aborted) apply(section, { error });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(parallelism, reads.length) }, worker));
}

export function createRefreshLoop(run, { interval, available }) {
  let active;
  let queued;
  let deadline;
  let stopped = false;

  function refresh({ queue = false } = {}) {
    clearTimeout(deadline);
    if (stopped || !available()) return Promise.resolve();
    if (active) {
      if (queue && !queued) {
        queued = active.then(() => {
          queued = null;
          return refresh();
        });
      }
      return queued || active;
    }
    active = Promise.resolve().then(run).finally(() => {
      active = null;
      if (!stopped && !queued && available()) {
        deadline = setTimeout(() => void refresh(), interval);
      }
    });
    return active;
  }

  return {
    refresh,
    stop: () => {
      stopped = true;
      clearTimeout(deadline);
    },
  };
}
