import { localDatetimeToApi } from "./datetime.js";

const SIDE_LABELS = {
  left: ["Sein gauche", "Left breast"],
  right: ["Sein droit", "Right breast"],
  both: ["Les deux seins", "Both breasts"],
};

export function parsePumpingNote(value) {
  const note = String(value || "").trim();
  const match = /^(?:Sein|Breast)\s*:\s*([^—-]+?)(?:\s*[—-]\s*(.*))?$/i.exec(note);
  if (!match) return { side: "both", note };

  const sideLabel = match[1].trim().toLocaleLowerCase();
  const side = Object.entries(SIDE_LABELS).find(([, labels]) =>
    labels.some((label) => label.toLocaleLowerCase() === sideLabel),
  )?.[0] || "both";

  return { side, note: String(match[2] || "").trim() };
}

export function pumpingPatchPayload(entry, draft) {
  const patch = {};
  if (Number(draft.amount) !== Number(entry.amount)) patch.amount = Number(draft.amount);
  if (draft.start !== draft.originalStart) patch.start = localDatetimeToApi(draft.start);
  if (draft.end !== draft.originalEnd) patch.end = localDatetimeToApi(draft.end);
  if (draft.side !== draft.originalSide || draft.notes.trim() !== draft.originalNotes.trim()) {
    patch.notes = draft.serializedNotes;
  }
  return patch;
}
