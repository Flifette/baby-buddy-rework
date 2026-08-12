import { useState } from "react";
import { api } from "../../api";
import Modal, { FormField, FormInput, FormButton, FormError, DeleteIconButton } from "../Modal";
import { colors } from "../../utils/colors";
import { useUnits } from "../../utils/units";
import { useLanguage } from "../../utils/i18n";
import { apiErrorTranslationKey } from "../../utils/formValidation";

function toLocalDate(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function HeightForm({ childId, entry, onDone, onClose }) {
  const units = useUnits();
  const { t } = useLanguage();
  const isEdit = !!entry;
  const [height, setHeight] = useState(entry?.height ? String(entry.height) : "");
  const [date, setDate] = useState(entry?.date ? toLocalDate(entry.date) : toLocalDate(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const remove = async () => { if (!entry?.id) return; setSaving(true); try { await api.deleteHeight(entry.id); onDone(); } catch { setSaving(false); } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data = {
        height: parseFloat(height),
        date,
      };
      if (isEdit) {
        await api.updateHeight(entry.id, data);
      } else {
        data.child = childId;
        await api.createHeight(data);
      }
      onDone();
    } catch (requestError) {
      setError(t(apiErrorTranslationKey(requestError)));
      setSaving(false);
    }
  };

  return (
    <Modal title={t(isEdit ? "form.height.edit" : "form.height.add")} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label={`${t("activity.height")} (${units.length})`}>
          <FormInput
            type="number"
            value={height}
            onChange={(e) => { setHeight(e.target.value); setError(""); }}
            placeholder="50.0"
            min="0.1"
            max="200"
            step="0.1"
            autoFocus
            required
          />
        </FormField>
        <FormField label={t("common.date")}>
          <FormInput
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setError(""); }}
            required
          />
        </FormField>
        <FormError>{error}</FormError>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}><div style={{ flex: 1 }}><FormButton color={colors.height} disabled={saving}>
          {saving ? t("common.saving") : t(isEdit ? "form.height.edit" : "form.height.save")}
        </FormButton></div>{isEdit && <DeleteIconButton color={colors.height} disabled={saving} onConfirm={remove} />}</div>
      </form>
    </Modal>
  );
}
