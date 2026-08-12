import { useState } from "react";
import { api } from "../../api";
import Modal, { FormField, FormSelect, FormInput, FormButton, FormError, DeleteIconButton } from "../Modal";
import { colors } from "../../utils/colors";
import { useLanguage } from "../../utils/i18n";
import { apiErrorTranslationKey } from "../../utils/formValidation";

function toLocalDatetime(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const COLORS = [
  { value: "", key: "diaper.unspecified" },
  { value: "black", key: "diaper.black" },
  { value: "brown", key: "diaper.brown" },
  { value: "green", key: "diaper.green" },
  { value: "yellow", key: "diaper.yellow" },
];

export default function DiaperForm({ childId, entry, onDone, onClose, preset }) {
  const { t } = useLanguage();
  const colorOptions = COLORS.map((option) => ({ ...option, label: t(option.key) }));
  const isEdit = !!entry;
  const [time, setTime] = useState(entry?.time ? toLocalDatetime(new Date(entry.time)) : toLocalDatetime(new Date()));
  const initialType = entry ? (entry.wet && entry.solid ? "mixed" : entry.wet ? "wet" : entry.solid ? "solid" : "") : (preset === "both" ? "mixed" : preset || "");
  const [diaperType, setDiaperType] = useState(initialType);
  const [color, setColor] = useState(entry?.color || "");
  const [notes, setNotes] = useState(entry?.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const remove = async () => { if (!entry?.id) return; setSaving(true); try { await api.deleteChange(entry.id); onDone(); } catch { setSaving(false); } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!diaperType) {
      setError(t("form.error.diaperType"));
      return;
    }
    setSaving(true);
    try {
      const wet = diaperType === "wet" || diaperType === "mixed";
      const solid = diaperType === "solid" || diaperType === "mixed";
      const data = { wet, solid, time: `${time}:00` };
      if (color) data.color = color;
      if (notes.trim()) data.notes = notes.trim();
      if (isEdit) {
        await api.updateChange(entry.id, data);
      } else {
        data.child = childId;
        await api.createChange(data);
      }
      onDone();
    } catch (requestError) {
      console.error("Unable to save diaper change", requestError);
      setError(t(apiErrorTranslationKey(requestError)));
      setSaving(false);
    }
  };

  return (
    <Modal title={t(isEdit ? "form.diaper.edit" : "form.diaper.add")} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label={t("common.time")}>
          <FormInput
            type="datetime-local"
            value={time}
            onChange={(e) => { setTime(e.target.value); setError(""); }}
            required
          />
        </FormField>
        <FormField label={t("form.diaper.type")}>
        <div role="radiogroup" aria-label={t("form.diaper.type")} style={{ display: "flex", gap: 10 }}>
          {[
            { key: "wet", label: t("diaper.wet") },
            { key: "solid", label: t("diaper.solid") },
            { key: "mixed", label: t("diaper.mixed") },
          ].map((btn) => (
            <button
              key={btn.key}
              type="button"
              role="radio"
              aria-checked={diaperType === btn.key}
              onClick={() => { setDiaperType(btn.key); setError(""); }}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 10,
                border: diaperType === btn.key ? `2px solid ${colors.diaper}` : "1px solid var(--border)",
                background: diaperType === btn.key ? `${colors.diaper}15` : "var(--bg)",
                color: diaperType === btn.key ? colors.diaper : "var(--text-muted)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
        </FormField>
        {(diaperType === "solid" || diaperType === "mixed") && (
        <FormField label={t("form.diaper.color")}>
            <FormSelect options={colorOptions} value={color} onChange={(e) => { setColor(e.target.value); setError(""); }} />
          </FormField>
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
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}><div style={{ flex: 1 }}><FormButton color={colors.diaper} disabled={saving}>
          {saving ? t("common.saving") : t(isEdit ? "form.diaper.editAction" : "form.diaper.save")}
        </FormButton></div>{isEdit && <DeleteIconButton color={colors.diaper} disabled={saving} onConfirm={remove} />}</div>
      </form>
    </Modal>
  );
}
