import { useState } from "react";
import { api } from "../../api";
import Modal, { FormField, FormSelect, FormInput, FormButton, FormError, DeleteIconButton } from "../Modal";
import { colors } from "../../utils/colors";
import { useUnits } from "../../utils/units";
import { useLanguage } from "../../utils/i18n";
import { apiErrorTranslationKey } from "../../utils/formValidation";

const TYPES = [
  { value: "breast milk", key: "feeding.type.breastMilk" },
  { value: "formula", key: "feeding.type.formula" },
  { value: "fortified breast milk", key: "feeding.type.fortifiedBreastMilk" },
  { value: "solid food", key: "feeding.type.solidFood" },
];

const METHODS = [
  { value: "bottle", key: "feeding.method.bottle" },
  { value: "left breast", key: "feeding.method.leftBreast" },
  { value: "right breast", key: "feeding.method.rightBreast" },
  { value: "both breasts", key: "feeding.method.bothBreasts" },
  { value: "parent fed", key: "feeding.method.parentFed" },
  { value: "self fed", key: "feeding.method.selfFed" },
];

function toLocalDatetime(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function FeedingForm({ childId, timerId, entry, onDone, onClose }) {
  const units = useUnits();
  const { t } = useLanguage();
  const typeOptions = TYPES.map((option) => ({ ...option, label: t(option.key) }));
  const methodOptions = METHODS.map((option) => ({ ...option, label: t(option.key) }));
  const isEdit = !!entry;
  const now = new Date();
  const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const [type, setType] = useState(entry?.type || "breast milk");
  const [method, setMethod] = useState(entry?.method || "bottle");
  const [amount, setAmount] = useState(entry?.amount != null ? String(entry.amount) : "");
  const [start, setStart] = useState(entry?.start ? toLocalDatetime(new Date(entry.start)) : toLocalDatetime(fifteenMinsAgo));
  const [end, setEnd] = useState(entry?.end ? toLocalDatetime(new Date(entry.end)) : toLocalDatetime(now));
  const [notes, setNotes] = useState(entry?.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const remove = async () => { if (!entry?.id) return; setSaving(true); try { await api.deleteFeeding(entry.id); onDone(); } catch { setSaving(false); } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!timerId && new Date(end) <= new Date(start)) {
      setError(t("form.error.endBeforeStart"));
      return;
    }
    setSaving(true);
    try {
      const data = { type, method };
      if (amount) data.amount = parseFloat(amount);
      if (notes.trim()) data.notes = notes.trim();
      if (isEdit) {
        data.start = `${start}:00`;
        data.end = `${end}:00`;
        await api.updateFeeding(entry.id, data);
      } else {
        data.child = childId;
        if (timerId) {
          data.timer = timerId;
        } else {
          data.start = `${start}:00`;
          data.end = `${end}:00`;
        }
        await api.createFeeding(data);
      }
      onDone();
    } catch (requestError) {
      console.error("Unable to save feeding", requestError);
      setError(t(apiErrorTranslationKey(requestError)));
      setSaving(false);
    }
  };

  return (
    <Modal title={t(isEdit ? "form.feeding.edit" : "form.feeding.add")} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label={t("form.feeding.type")}>
          <FormSelect options={typeOptions} value={type} onChange={(e) => { setType(e.target.value); setError(""); }} />
        </FormField>
        <FormField label={t("form.feeding.method")}>
          <FormSelect options={methodOptions} value={method} onChange={(e) => { setMethod(e.target.value); setError(""); }} />
        </FormField>
        <FormField label={`${t("common.quantity")} (${units.volume})`}>
          <FormInput type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} min="1" step="1" required />
        </FormField>
        {(isEdit || !timerId) && (
          <>
            <FormField label={t("common.start")}>
              <FormInput
                type="datetime-local"
                value={start}
                onChange={(e) => { setStart(e.target.value); setError(""); }}
                required
              />
            </FormField>
            <FormField label={t("common.end")}>
              <FormInput
                type="datetime-local"
                value={end}
                onChange={(e) => { setEnd(e.target.value); setError(""); }}
                required
              />
            </FormField>
          </>
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
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}><div style={{ flex: 1 }}><FormButton color={colors.feeding} disabled={saving}>
          {saving ? t("common.saving") : t(isEdit ? "form.feeding.editAction" : "form.feeding.save")}
        </FormButton></div>{isEdit && <DeleteIconButton color={colors.feeding} disabled={saving} onConfirm={remove} />}</div>
      </form>
    </Modal>
  );
}
