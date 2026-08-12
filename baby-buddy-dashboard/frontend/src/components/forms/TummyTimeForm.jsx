import { useState } from "react";
import { api } from "../../api";
import Modal, { FormField, FormInput, FormButton, FormError, DeleteIconButton } from "../Modal";
import { colors } from "../../utils/colors";
import { useLanguage } from "../../utils/i18n";
import { apiErrorTranslationKey } from "../../utils/formValidation";

function toLocalDatetime(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function TummyTimeForm({ childId, timerId, entry, onDone, onClose }) {
  const { t } = useLanguage();
  const isEdit = !!entry;
  const now = new Date();
  const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const [milestone, setMilestone] = useState(entry?.milestone || "");
  const [start, setStart] = useState(entry?.start ? toLocalDatetime(new Date(entry.start)) : toLocalDatetime(tenMinsAgo));
  const [end, setEnd] = useState(entry?.end ? toLocalDatetime(new Date(entry.end)) : toLocalDatetime(now));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const remove = async () => { if (!entry?.id) return; setSaving(true); try { await api.deleteTummyTime(entry.id); onDone(); } catch { setSaving(false); } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!timerId && new Date(end) <= new Date(start)) {
      setError(t("form.error.endBeforeStart"));
      return;
    }
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
    } catch (requestError) {
      setError(t(apiErrorTranslationKey(requestError)));
      setSaving(false);
    }
  };

  return (
    <Modal title={t(isEdit ? "form.tummy.edit" : "form.tummy.add")} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {!isEdit && timerId ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
            {t("form.tummy.timerHint")}
          </p>
        ) : null}
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
            <FormField label={t("form.tummy.milestone")}>
          <FormInput
            value={milestone}
            onChange={(e) => { setMilestone(e.target.value); setError(""); }}
            placeholder={t("form.tummy.placeholder")}
          />
        </FormField>
        <FormError>{error}</FormError>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}><div style={{ flex: 1 }}><FormButton color={colors.tummy} disabled={saving}>
          {saving ? t("common.saving") : t(isEdit ? "form.tummy.editAction" : "form.tummy.save")}
        </FormButton></div>{isEdit && <DeleteIconButton color={colors.tummy} disabled={saving} onConfirm={remove} />}</div>
      </form>
    </Modal>
  );
}
