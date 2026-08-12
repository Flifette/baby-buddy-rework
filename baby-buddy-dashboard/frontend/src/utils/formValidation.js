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

export function apiErrorTranslationKey(error) {
  const status = Number(error?.status || /API error (\d+)/i.exec(error?.message || "")?.[1] || 0);
  const detail = `${error?.detail || ""} ${error?.message || ""}`.toLowerCase();
  if (!status && /failed to fetch|network|connexion|connection/.test(detail)) return "form.error.connection";
  if (status === 401 || status === 403) return "form.error.authorization";
  if (status === 409 || /already exists|déjà|duplicate|unique|overlap|chevauch/.test(detail)) return "form.error.duplicate";
  if (status === 400 || /required|invalid|not a valid|incorrect|must be|ensure this/.test(detail)) return "form.error.invalid";
  if (status >= 500) return "form.error.server";
  return "form.error.save";
}
