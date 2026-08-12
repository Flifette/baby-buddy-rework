import { useState } from "react";
import { api } from "../../api";
import Modal, { FormField, FormInput, FormButton, FormError, DeleteIconButton } from "../Modal";
import { colors } from "../../utils/colors";
import { useLanguage } from "../../utils/i18n";
import { apiErrorTranslationKey } from "../../utils/formValidation";

function toLocalDatetime(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function NoteForm({ childId, entry, onDone, onClose }) {
  const { language, t } = useLanguage();
  const isEdit = !!entry;
  const [time, setTime] = useState(entry?.time ? toLocalDatetime(new Date(entry.time)) : toLocalDatetime(new Date()));
  const [note, setNote] = useState(entry?.note || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const remove = async () => { if (!entry?.id) return; setSaving(true); try { await api.deleteNote(entry.id); onDone(); } catch { setSaving(false); } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data = { note: note.trim(), time: `${time}:00` };
      if (isEdit) {
        await api.updateNote(entry.id, data);
      } else {
        data.child = childId;
        await api.createNote(data);
      }
      onDone();
    } catch (requestError) {
      setError(t(apiErrorTranslationKey(requestError)));
      setSaving(false);
    }
  };

  return (
    <Modal title={t(isEdit ? "form.note.edit" : "form.note.add")} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label={t("common.time")}>
          <FormInput
            type="datetime-local"
            value={time}
            onChange={(e) => { setTime(e.target.value); setError(""); }}
            required
          />
        </FormField>
        <FormField label={t("common.note")}>
          <textarea
            value={note}
            onChange={(e) => { setNote(e.target.value); setError(""); }}
            rows={3}
            autoFocus
            required
            lang={language}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
              fontSize: 14,
              fontFamily: "inherit",
              outline: "none",
              resize: "vertical",
            }}
          />
        </FormField>
        <FormError>{error}</FormError>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}><div style={{ flex: 1 }}><FormButton color={colors.note} disabled={saving}>
          {saving ? t("common.saving") : t(isEdit ? "form.note.edit" : "form.note.save")}
        </FormButton></div>{isEdit && <DeleteIconButton color={colors.note} disabled={saving} onConfirm={remove} />}</div>
      </form>
    </Modal>
  );
}
