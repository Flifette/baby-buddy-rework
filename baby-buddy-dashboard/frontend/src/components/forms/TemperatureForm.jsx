import { useState } from "react";
import { api } from "../../api";
import Modal, { FormField, FormInput, FormButton, FormError, DeleteIconButton } from "../Modal";
import { colors } from "../../utils/colors";
import { useUnits } from "../../utils/units";
import { useLanguage } from "../../utils/i18n";
import { apiErrorTranslationKey } from "../../utils/formValidation";

export default function TemperatureForm({ childId, entry, onDone, onClose }) {
  const units = useUnits();
  const { t } = useLanguage();
  const isEdit = !!entry;
  const [temp, setTemp] = useState(entry?.temperature != null ? String(entry.temperature) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = { temperature: parseFloat(temp) };
      if (isEdit) await api.updateTemperature(entry.id, payload);
      else await api.createTemperature({ child: childId, ...payload });
      onDone();
    } catch (requestError) {
      setError(t(apiErrorTranslationKey(requestError)));
      setSaving(false);
    }
  };
  const remove = async () => { if (!entry?.id) return; setSaving(true); try { await api.deleteTemperature(entry.id); onDone(); } catch { setSaving(false); } };

  return (
    <Modal title={t(isEdit ? "form.temperature.edit" : "form.temperature.add")} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label={`${t("activity.temperature")} (${units.temp})`}>
          <FormInput
            type="number"
            value={temp}
            onChange={(e) => { setTemp(e.target.value); setError(""); }}
            placeholder="36.6"
            min="30"
            max="45"
            step="0.1"
            autoFocus
            required
          />
        </FormField>
        <FormError>{error}</FormError>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}><div style={{ flex: 1 }}><FormButton color={colors.temp} disabled={saving}>
          {saving ? t("common.saving") : t(isEdit ? "form.temperature.edit" : "form.temperature.save")}
        </FormButton></div>{isEdit && <DeleteIconButton color={colors.temp} disabled={saving} onConfirm={remove} />}</div>
      </form>
    </Modal>
  );
}
