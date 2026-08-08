import { useState } from "react";
import { api } from "../../api";
import Modal, { FormField, FormSelect, FormInput, FormButton, DeleteIconButton } from "../Modal";
import { colors } from "../../utils/colors";

function toLocalDatetime(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const COLORS = [
  { value: "", label: "Non précisée" },
  { value: "black", label: "Noire" },
  { value: "brown", label: "Marron" },
  { value: "green", label: "Verte" },
  { value: "yellow", label: "Jaune" },
];

export default function DiaperForm({ childId, entry, onDone, onClose, preset }) {
  const isEdit = !!entry;
  const [time, setTime] = useState(entry?.time ? toLocalDatetime(new Date(entry.time)) : toLocalDatetime(new Date()));
  const [wet, setWet] = useState(entry ? entry.wet : (preset === "wet" || preset === "both"));
  const [solid, setSolid] = useState(entry ? entry.solid : (preset === "solid" || preset === "both"));
  const [color, setColor] = useState(entry?.color || "");
  const [notes, setNotes] = useState(entry?.notes || "");
  const [saving, setSaving] = useState(false);
  const remove = async () => { if (!entry?.id) return; setSaving(true); try { await api.deleteChange(entry.id); onDone(); } catch { setSaving(false); } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
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
    } catch {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Modifier le change" : "Ajouter un change"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Heure">
          <FormInput
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </FormField>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          {[
            { key: "wet", label: "Humide", active: wet, toggle: () => setWet(!wet) },
            { key: "solid", label: "Solide", active: solid, toggle: () => setSolid(!solid) },
            { key: "both", label: "Mixte", active: wet && solid, toggle: () => { const mixed = wet && solid; setWet(!mixed); setSolid(!mixed); } },
          ].map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={btn.toggle}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 10,
                border: btn.active ? `2px solid ${colors.diaper}` : "1px solid var(--border)",
                background: btn.active ? `${colors.diaper}15` : "var(--bg)",
                color: btn.active ? colors.diaper : "var(--text-muted)",
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
        {solid && (
        <FormField label="Couleur">
            <FormSelect options={COLORS} value={color} onChange={(e) => setColor(e.target.value)} />
          </FormField>
        )}
        <FormField label="Note">
          <FormInput
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          placeholder="Facultative"
          />
        </FormField>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}><div style={{ flex: 1 }}><FormButton color={colors.diaper} disabled={saving || (!wet && !solid)}>
          {saving ? "Enregistrement…" : isEdit ? "Modifier le change" : "Enregistrer le change"}
        </FormButton></div>{isEdit && <DeleteIconButton color={colors.diaper} disabled={saving} onConfirm={remove} />}</div>
      </form>
    </Modal>
  );
}
