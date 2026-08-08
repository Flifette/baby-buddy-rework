import { useState } from "react";
import { api } from "../../api";
import Modal, { FormField, FormInput, FormButton, DeleteIconButton } from "../Modal";
import { colors } from "../../utils/colors";

function toLocalDatetime(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function TummyTimeForm({ childId, timerId, entry, onDone, onClose }) {
  const isEdit = !!entry;
  const now = new Date();
  const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const [milestone, setMilestone] = useState(entry?.milestone || "");
  const [start, setStart] = useState(entry?.start ? toLocalDatetime(new Date(entry.start)) : toLocalDatetime(tenMinsAgo));
  const [end, setEnd] = useState(entry?.end ? toLocalDatetime(new Date(entry.end)) : toLocalDatetime(now));
  const [saving, setSaving] = useState(false);
  const remove = async () => { if (!entry?.id) return; setSaving(true); try { await api.deleteTummyTime(entry.id); onDone(); } catch { setSaving(false); } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        const data = { start: `${start}:00`, end: `${end}:00` };
        if (milestone.trim()) data.milestone = milestone.trim();
        await api.updateTummyTime(entry.id, data);
      } else {
        const data = { child: childId };
        if (timerId) {
          data.timer = timerId;
        } else {
          data.start = `${start}:00`;
          data.end = `${end}:00`;
        }
        if (milestone.trim()) data.milestone = milestone.trim();
        await api.createTummyTime(data);
      }
      onDone();
    } catch {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Modifier le temps sur le ventre" : "Ajouter du temps sur le ventre"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {!isEdit && timerId ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
            Les heures de début et de fin du minuteur seront utilisées pour ce temps sur le ventre.
          </p>
        ) : null}
        {(isEdit || !timerId) && (
          <>
            <FormField label="Début">
              <FormInput
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Fin">
              <FormInput
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </FormField>
          </>
        )}
            <FormField label="Étape (facultative)">
          <FormInput
            value={milestone}
            onChange={(e) => setMilestone(e.target.value)}
            placeholder="Ex. : tête relevée"
          />
        </FormField>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}><div style={{ flex: 1 }}><FormButton color={colors.tummy} disabled={saving}>
          {saving ? "Enregistrement…" : isEdit ? "Modifier le temps sur le ventre" : "Enregistrer le temps sur le ventre"}
        </FormButton></div>{isEdit && <DeleteIconButton color={colors.tummy} disabled={saving} onConfirm={remove} />}</div>
      </form>
    </Modal>
  );
}
