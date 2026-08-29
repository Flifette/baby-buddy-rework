import { localDatetimeToApi } from "./datetime.js";

const DIRECT_BREASTFEEDING_METHODS = new Set([
  "left breast",
  "right breast",
  "both breasts",
]);

export function isDirectBreastfeeding(feedingOrMethod) {
  const method = typeof feedingOrMethod === "string"
    ? feedingOrMethod
    : feedingOrMethod?.method;
  return DIRECT_BREASTFEEDING_METHODS.has(method);
}

export function measurableFeedingAmount(feeding) {
  if (isDirectBreastfeeding(feeding)) return 0;
  return Number(feeding?.amount || 0);
}

export function feedingAmountForPayload(method, amount) {
  if (isDirectBreastfeeding(method)) return null;
  return Number(amount);
}

function toLocalDatetime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function shiftFeedingEndWithStart(originalStart, originalEnd, nextStart) {
  const duration = new Date(originalEnd).getTime() - new Date(originalStart).getTime();
  const nextStartDate = new Date(nextStart);
  if (!Number.isFinite(duration) || duration < 0 || Number.isNaN(nextStartDate.getTime())) return originalEnd;
  return toLocalDatetime(new Date(nextStartDate.getTime() + duration));
}

export function feedingPatchPayload(entry, draft) {
  const patch = {};

  if (draft.type !== entry.type) patch.type = draft.type;
  if (draft.method !== entry.method) patch.method = draft.method;

  const nextAmount = feedingAmountForPayload(draft.method, draft.amount);
  const currentAmount = feedingAmountForPayload(entry.method, entry.amount);
  if (nextAmount !== currentAmount) patch.amount = nextAmount;

  if (draft.start !== draft.originalStart) patch.start = localDatetimeToApi(draft.start);
  if (draft.end !== draft.originalEnd) patch.end = localDatetimeToApi(draft.end);

  const nextNotes = String(draft.notes || "").trim();
  const currentNotes = String(entry.notes || "").trim();
  if (nextNotes !== currentNotes) patch.notes = nextNotes;

  return patch;
}
