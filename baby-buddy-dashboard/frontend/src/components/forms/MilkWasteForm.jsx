import { useState } from "react";
import { api } from "../../api";
import Modal, { DeleteIconButton, FormButton, FormError, FormField, FormInput } from "../Modal";
import { colors } from "../../utils/colors";
import { useLanguage } from "../../utils/i18n";
import { apiErrorTranslationKey } from "../../utils/formValidation";

function localDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function MilkWasteForm({ childId, entry, onDone, onClose }) {
  const { t } = useLanguage();
  const [amount, setAmount] = useState(entry?.amount != null ? String(entry.amount) : "");
  const [time, setTime] = useState(entry?.time ? localDateTime(new Date(entry.time)) : localDateTime(new Date()));
  const [note, setNote] = useState(entry?.note || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    const data = { child: childId, amount: Number(amount), time: `${time}:00`, note: note.trim() };
    try {
      if (entry?.id) await api.updateMilkWaste(entry.id, data);
      else await api.createMilkWaste(data);
      onDone();
    } catch (requestError) {
      console.error("Unable to save uneaten milk", requestError);
      setError(t(apiErrorTranslationKey(requestError)));
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
    <Modal title={t(entry ? "form.milkWaste.edit" : "form.milkWaste.add")} onClose={onClose}>
      <form onSubmit={submit}>
        <FormField label={t("form.milkWaste.amount")}>
          <FormInput type="number" min="1" max="5000" step="1" value={amount} onChange={(event) => { setAmount(event.target.value); setError(""); }} required autoFocus />
        </FormField>
        <FormField label={t("common.dateTime")}>
          <FormInput type="datetime-local" value={time} onChange={(event) => { setTime(event.target.value); setError(""); }} required />
        </FormField>
        <FormField label={t("common.note")}>
          <FormInput value={note} onChange={(event) => { setNote(event.target.value); setError(""); }} placeholder={t("form.milkWaste.placeholder")} maxLength={500} />
        </FormField>
        <FormError>{error}</FormError>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <FormButton color={colors.milkWaste} disabled={saving}>
              {saving ? t("common.saving") : t(entry ? "form.saveChanges" : "form.milkWaste.save")}
            </FormButton>
          </div>
          {entry?.id && <DeleteIconButton color={colors.milkWaste} disabled={saving} onConfirm={remove} />}
        </div>
      </form>
    </Modal>
  );
}
