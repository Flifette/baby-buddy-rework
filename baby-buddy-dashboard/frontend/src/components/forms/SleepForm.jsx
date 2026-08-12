import { useState } from "react";
import { api } from "../../api";
import Modal, { FormField, FormInput, FormButton, FormError, DeleteIconButton } from "../Modal";

import { colors } from "../../utils/colors";
import { useLanguage } from "../../utils/i18n";
import { formatTime } from "../../utils/formatters";
import { apiErrorTranslationKey, findTimeOverlap } from "../../utils/formValidation";

function toLocalDatetime(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function SleepForm({ childId, timerId, entry, sleepEntries = [], onDone, onClose }) {
  const { language, t } = useLanguage();
  const isEdit = !!entry;
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const [start, setStart] = useState(entry?.start ? toLocalDatetime(new Date(entry.start)) : toLocalDatetime(oneHourAgo));
  const [end, setEnd] = useState(entry?.end ? toLocalDatetime(new Date(entry.end)) : toLocalDatetime(now));
  const [notes, setNotes] = useState(entry?.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const remove = async () => { if (!entry?.id) return; setSaving(true); try { await api.deleteSleep(entry.id); onDone(); } catch { setSaving(false); } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!timerId && new Date(end) <= new Date(start)) {
      setError(t("form.error.endBeforeStart"));
      return;
    }
    const overlap = !timerId ? findTimeOverlap(sleepEntries, start, end, entry?.id) : null;
    if (overlap) {
      setError(t(overlap.nap ? "form.error.napOverlap" : "form.error.sleepOverlap", {
        start: formatTime(overlap.start, language),
        end: formatTime(overlap.end, language),
      }));
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const data = {
          start: `${start}:00`,
          end: `${end}:00`,
        };
        if (notes.trim()) data.notes = notes.trim();
        await api.updateSleep(entry.id, data);
      } else {
        const data = { child: childId };
        if (notes.trim()) data.notes = notes.trim();
        if (timerId) {
          data.timer = timerId;
        } else {
          data.start = `${start}:00`;
          data.end = `${end}:00`;
        }
        await api.createSleep(data);
      }
      onDone();
    } catch (requestError) {
      console.error("Unable to save sleep", requestError);
      setError(t(apiErrorTranslationKey(requestError)));
      setSaving(false);
    }
  };

  return (
    <Modal title={t(isEdit ? "form.sleep.edit" : "form.sleep.add")} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {!isEdit && timerId ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
            {t("form.sleep.timerHint")}
          </p>
        ) : (
          <>
            <FormField label={t("common.start")}>
              <FormInput
                type="datetime-local"
                value={start}
                onChange={(e) => { setStart(e.target.value); setError(""); }}
                required
              />
            </FormField>
            <FormField label={t("common.end")}>
              <FormInput
                type="datetime-local"
                value={end}
                onChange={(e) => { setEnd(e.target.value); setError(""); }}
                required
              />
            </FormField>
          </>
        )}
        <FormField label={t("common.note")}>
          <FormInput
            type="text"
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setError(""); }}
          placeholder={t("common.optional")}
          />
        </FormField>
        <FormError>{error}</FormError>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}><div style={{ flex: 1 }}><FormButton color={colors.sleep} disabled={saving}>
          {saving ? t("common.saving") : t(isEdit ? "form.sleep.editAction" : "form.sleep.save")}
        </FormButton></div>{isEdit && <DeleteIconButton color={colors.sleep} disabled={saving} onConfirm={remove} />}</div>
      </form>
    </Modal>
  );
}
