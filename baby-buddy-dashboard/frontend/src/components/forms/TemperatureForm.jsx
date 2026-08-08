import { useState } from "react";
import { api } from "../../api";
import Modal, { FormField, FormInput, FormButton, DeleteIconButton } from "../Modal";
import { colors } from "../../utils/colors";
import { useUnits } from "../../utils/units";

export default function TemperatureForm({ childId, entry, onDone, onClose }) {
  const units = useUnits();
  const isEdit = !!entry;
  const [temp, setTemp] = useState(entry?.temperature != null ? String(entry.temperature) : "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!temp) return;
    setSaving(true);
    try {
      const payload = { temperature: parseFloat(temp) };
      if (isEdit) await api.updateTemperature(entry.id, payload);
      else await api.createTemperature({ child: childId, ...payload });
      onDone();
    } catch {
      setSaving(false);
    }
  };
  const remove = async () => { if (!entry?.id) return; setSaving(true); try { await api.deleteTemperature(entry.id); onDone(); } catch { setSaving(false); } };

  return (
    <Modal title="Ajouter une température" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label={`Température (${units.temp})`}>
          <FormInput
            type="number"
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            placeholder="36.6"
            min="30"
            max="45"
            step="0.1"
            autoFocus
          />
        </FormField>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}><div style={{ flex: 1 }}><FormButton color={colors.temp} disabled={saving || !temp}>
          {saving ? "Enregistrement…" : "Enregistrer la température"}
        </FormButton></div>{isEdit && <DeleteIconButton color={colors.temp} disabled={saving} onConfirm={remove} />}</div>
      </form>
    </Modal>
  );
}
