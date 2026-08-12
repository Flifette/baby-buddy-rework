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

export default function WeightForm({ childId, entry, onDone, onClose }) {
  const units = useUnits();
  const { t } = useLanguage();
  const isEdit = !!entry;
  const [weight, setWeight] = useState(entry?.weight ? String(entry.weight) : "");
  const [date, setDate] = useState(entry?.date ? toLocalDate(entry.date) : toLocalDate(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const remove = async () => { if (!entry?.id) return; setSaving(true); try { await api.deleteWeight(entry.id); onDone(); } catch { setSaving(false); } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data = {
        weight: parseFloat(weight),
        date,
      };
      if (isEdit) {
        await api.updateWeight(entry.id, data);
      } else {
        data.child = childId;
        await api.createWeight(data);
      }
      onDone();
    } catch (requestError) {
      setError(t(apiErrorTranslationKey(requestError)));
      setSaving(false);
    }
  };

  return (
    <Modal title={t(isEdit ? "form.weight.edit" : "form.weight.add")} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label={`${t("activity.weight")} (${units.weight})`}>
          <FormInput
            type="number"
            value={weight}
            onChange={(e) => { setWeight(e.target.value); setError(""); }}
            placeholder="5.0"
            min="0.01"
            max="30"
            step="0.01"
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
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}><div style={{ flex: 1 }}><FormButton color={colors.growth} disabled={saving}>
          {saving ? t("common.saving") : t(isEdit ? "form.weight.edit" : "form.weight.save")}
        </FormButton></div>{isEdit && <DeleteIconButton color={colors.growth} disabled={saving} onConfirm={remove} />}</div>
      </form>
    </Modal>
  );
}
