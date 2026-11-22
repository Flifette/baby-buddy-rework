export function findTimeOverlap(entries, startValue, endValue, excludedId) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  return entries.find((entry) => {
    if (excludedId != null && String(entry.id) === String(excludedId)) return false;
    const entryStart = new Date(entry.start);
    const entryEnd = new Date(entry.end);
    if (Number.isNaN(entryStart.getTime()) || Number.isNaN(entryEnd.getTime())) return false;
    return start < entryEnd && end > entryStart;
  }) || null;
}

export function findSleepOverlap(entries, { timerId, timerStart, start, end, excludedId }, now = new Date()) {
  const rangeStart = timerId ? timerStart : start;
  const rangeEnd = timerId ? now : end;
  return findTimeOverlap(entries, rangeStart, rangeEnd, excludedId);
}

export function apiErrorTranslationKey(error) {
  if (error?.uncertain || ["baby_buddy_unconfirmed_write", "request_unconfirmed_write"].includes(error?.code)) {
    return "form.error.unconfirmed";
  }
  if (["baby_buddy_timeout", "request_timeout"].includes(error?.code)) return "form.error.timeout";
  if (["baby_buddy_unavailable", "request_network"].includes(error?.code)) return "form.error.connection";
  if (["baby_buddy_invalid_response", "request_invalid_response"].includes(error?.code)) return "form.error.server";

  const status = Number(error?.status || /API error (\d+)/i.exec(error?.message || "")?.[1] || 0);
  const detail = `${error?.detail || ""} ${error?.message || ""}`.toLowerCase();
  if (!status && /failed to fetch|network|connexion|connection/.test(detail)) return "form.error.connection";
  if (status === 401 || status === 403) return "form.error.authorization";
  if (status === 409 || /already exists|déjà|duplicate|unique|overlap|chevauch|intersects the specified time period/.test(detail)) return "form.error.duplicate";
  if (status === 400 || /required|invalid|not a valid|incorrect|must be|ensure this/.test(detail)) return "form.error.invalid";
  if (status >= 500) return "form.error.server";
  return "form.error.save";
}
