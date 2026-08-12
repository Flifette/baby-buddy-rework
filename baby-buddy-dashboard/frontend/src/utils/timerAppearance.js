export function timerTypeFromName(name) {
  if (!name) return "feeding";
  const normalized = String(name).toLowerCase();
  if (normalized.includes("sleep")) return "sleep";
  if (normalized.includes("tummy")) return "tummy";
  return "feeding";
}
