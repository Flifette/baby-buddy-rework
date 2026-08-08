import { useState } from "react";
import { api } from "../../api";
import Modal, { DeleteIconButton, FormButton, FormField, FormInput } from "../Modal";
import { colors } from "../../utils/colors";

function localDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function MilkWasteForm({ childId, entry, onDone, onClose }) {
  const [amount, setAmount] = useState(entry?.amount != null ? String(entry.amount) : "");
  const [time, setTime] = useState(entry?.time ? localDateTime(new Date(entry.time)) : localDateTime(new Date()));
  const [note, setNote] = useState(entry?.note || "");
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const data = { child: childId, amount: Number(amount), time: `${time}:00`, note: note.trim() };
    try {
      if (entry?.id) await api.updateMilkWaste(entry.id, data);
      else await api.createMilkWaste(data);
      onDone();
    } catch {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!entry?.id) return;
    setSaving(true);
    try {
      await api.deleteMilkWaste(entry.id);
      onDone();
    } catch {
      setSaving(false);
    }
  };

  return (
    <Modal title={entry ? "Modifier le lait non bu" : "Retirer du lait du stock"} onClose={onClose}>
      <form onSubmit={submit}>
        <FormField label="Quantité non bue (mL)">
          <FormInput type="number" min="1" max="5000" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} required autoFocus />
        </FormField>
        <FormField label="Date et heure">
          <FormInput type="datetime-local" value={time} onChange={(event) => setTime(event.target.value)} required />
        </FormField>
        <FormField label="Note">
          <FormInput value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ex. : biberon commencé" maxLength={500} />
        </FormField>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <FormButton color={colors.milkWaste} disabled={saving || Number(amount) <= 0}>
              {saving ? "Enregistrement…" : entry ? "Enregistrer les modifications" : "Retirer du stock"}
            </FormButton>
          </div>
          {entry?.id && <DeleteIconButton color={colors.milkWaste} disabled={saving} onConfirm={remove} />}
        </div>
      </form>
    </Modal>
  );
}
