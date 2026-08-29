import { useState } from "react";
import { api } from "../../api";
import Modal, { FormField, FormSelect, FormInput, FormButton, FormError, DeleteIconButton } from "../Modal";
import { colors } from "../../utils/colors";
import { useUnits } from "../../utils/units";
import { useLanguage } from "../../utils/i18n";
import { apiErrorTranslationKey } from "../../utils/formValidation";
import { localDatetimeToApi } from "../../utils/datetime";
import { parsePumpingNote, pumpingPatchPayload } from "../../utils/pumping";
import { shiftFeedingEndWithStart } from "../../utils/feedings";

function localDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function PumpingForm({ childId, entry, onDone, onClose }) {
  const units = useUnits();
  const { t } = useLanguage();
  const now = new Date();
  const parsedNote = parsePumpingNote(entry?.notes);
  const originalStart = entry?.start ? localDateTime(new Date(entry.start)) : localDateTime(new Date(now - 900000));
  const originalEnd = entry?.end ? localDateTime(new Date(entry.end)) : localDateTime(now);
  const [amount, setAmount] = useState(entry?.amount != null ? String(entry.amount) : "");
  const [side, setSide] = useState(parsedNote.side);
  const [start, setStart] = useState(originalStart);
  const [end, setEnd] = useState(originalEnd);
  const [notes, setNotes] = useState(parsedNote.note);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const serializedNotes = () => {
    const sideLabel = { left: t("breast.left"), right: t("breast.right"), both: t("breast.both") }[side];
    return `${t("form.pumping.notePrefix")} : ${sideLabel}${notes.trim() ? ` — ${notes.trim()}` : ""}`;
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (new Date(end) <= new Date(start)) {
      setError(t("form.error.endBeforeStart"));
      return;
    }
    setSaving(true);
    try {
      if (entry?.id) {
        const data = pumpingPatchPayload(entry, {
          amount, side, start, end, notes,
          originalSide: parsedNote.side,
          originalNotes: parsedNote.note,
          originalStart,
          originalEnd,
          serializedNotes: serializedNotes(),
        });
        if (Object.keys(data).length > 0) await api.updatePumping(entry.id, data);
      } else {
        await api.createPumping({
          child: childId,
          amount: Number(amount),
          start: localDatetimeToApi(start),
          end: localDatetimeToApi(end),
          notes: serializedNotes(),
        });
      }
      onDone();
    } catch (requestError) {
      console.error("Unable to save pumping", requestError);
      setError(t(apiErrorTranslationKey(requestError)));
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!entry?.id) return;
    setSaving(true);
    try {
      await api.deletePumping(entry.id);
      onDone();
    } catch {
      setSaving(false);
    }
  };

  const sides = [
    { value: "left", label: t("breast.left") },
    { value: "right", label: t("breast.right") },
    { value: "both", label: t("breast.both") },
  ];

  return (
    <Modal title={t(entry ? "form.pumping.edit" : "form.pumping.add")} onClose={onClose}>
      <form onSubmit={submit}>
        <FormField label={`${t("common.quantity")} (${units.volume})`}>
          <FormInput type="number" min="1" step="1" value={amount} onChange={(event) => { setAmount(event.target.value); setError(""); }} required autoFocus />
        </FormField>
        <FormField label={t("form.pumping.breast")}>
          <FormSelect options={sides} value={side} onChange={(event) => { setSide(event.target.value); setError(""); }} />
        </FormField>
        <FormField label={t("common.start")}>
          <FormInput type="datetime-local" value={start} onChange={(event) => {
            const nextStart = event.target.value;
            setStart(nextStart);
            if (entry?.id) setEnd(shiftFeedingEndWithStart(originalStart, originalEnd, nextStart));
            setError("");
          }} required />
        </FormField>
        <FormField label={t("common.end")}>
          <FormInput type="datetime-local" value={end} onChange={(event) => { setEnd(event.target.value); setError(""); }} required />
        </FormField>
        <FormField label={t("common.note")}>
          <FormInput value={notes} onChange={(event) => { setNotes(event.target.value); setError(""); }} placeholder={t("common.optional")} />
        </FormField>
        <FormError>{error}</FormError>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ flex: 1 }}><FormButton color={colors.pumping} disabled={saving}>{saving ? t("common.saving") : t(entry ? "form.saveChanges" : "form.pumping.save")}</FormButton></div>
          {entry?.id && <DeleteIconButton color={colors.pumping} disabled={saving} onConfirm={remove} />}
        </div>
      </form>
    </Modal>
  );
}
