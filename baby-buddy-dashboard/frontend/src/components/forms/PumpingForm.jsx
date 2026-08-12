import { useState } from "react";
import { api } from "../../api";
import Modal, { FormField, FormSelect, FormInput, FormButton, FormError, DeleteIconButton } from "../Modal";
import { colors } from "../../utils/colors";
import { useUnits } from "../../utils/units";
import { useLanguage } from "../../utils/i18n";
import { apiErrorTranslationKey } from "../../utils/formValidation";

function localDateTime(date) { const p = (n) => String(n).padStart(2, "0"); return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`; }

export default function PumpingForm({ childId, entry, onDone, onClose }) {
  const units = useUnits(); const { t } = useLanguage(); const now = new Date();
  const [amount, setAmount] = useState(entry?.amount != null ? String(entry.amount) : "");
  const [side, setSide] = useState("both");
  const [start, setStart] = useState(entry?.start ? localDateTime(new Date(entry.start)) : localDateTime(new Date(now - 900000)));
  const [end, setEnd] = useState(entry?.end ? localDateTime(new Date(entry.end)) : localDateTime(now));
  const [notes, setNotes] = useState(entry?.notes || ""); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const submit = async (event) => { event.preventDefault(); setError(""); if (new Date(end) <= new Date(start)) { setError(t("form.error.endBeforeStart")); return; } setSaving(true); try { const sideLabel = { left: t("breast.left"), right: t("breast.right"), both: t("breast.both") }[side]; const data = { child: childId, amount: Number(amount), start: `${start}:00`, end: `${end}:00`, notes: `${t("form.pumping.notePrefix")} : ${sideLabel}${notes.trim() ? ` — ${notes.trim()}` : ""}` }; if (entry?.id) await api.updatePumping(entry.id, data); else await api.createPumping(data); onDone(); } catch (requestError) { console.error("Unable to save pumping", requestError); setError(t(apiErrorTranslationKey(requestError))); setSaving(false); } };
  const remove = async () => { if (!entry?.id) return; setSaving(true); try { await api.deletePumping(entry.id); onDone(); } catch { setSaving(false); } };
  const sides = [{ value: "left", label: t("breast.left") }, { value: "right", label: t("breast.right") }, { value: "both", label: t("breast.both") }];
  return <Modal title={t(entry ? "form.pumping.edit" : "form.pumping.add")} onClose={onClose}><form onSubmit={submit}><FormField label={`${t("common.quantity")} (${units.volume})`}><FormInput type="number" min="1" step="1" value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} required autoFocus /></FormField><FormField label={t("form.pumping.breast")}><FormSelect options={sides} value={side} onChange={(e) => { setSide(e.target.value); setError(""); }} /></FormField><FormField label={t("common.start")}><FormInput type="datetime-local" value={start} onChange={(e) => { setStart(e.target.value); setError(""); }} required /></FormField><FormField label={t("common.end")}><FormInput type="datetime-local" value={end} onChange={(e) => { setEnd(e.target.value); setError(""); }} required /></FormField><FormField label={t("common.note")}><FormInput value={notes} onChange={(e) => { setNotes(e.target.value); setError(""); }} placeholder={t("common.optional")} /></FormField><FormError>{error}</FormError><div style={{ display: "flex", gap: 10, alignItems: "center" }}><div style={{ flex: 1 }}><FormButton color={colors.pumping} disabled={saving}>{saving ? t("common.saving") : t(entry ? "form.saveChanges" : "form.pumping.save")}</FormButton></div>{entry?.id && <DeleteIconButton color={colors.pumping} disabled={saving} onConfirm={remove} />}</div></form></Modal>;
}
