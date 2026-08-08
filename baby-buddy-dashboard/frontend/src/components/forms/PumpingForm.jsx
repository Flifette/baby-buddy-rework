import { useState } from "react";
import { api } from "../../api";
import Modal, { FormField, FormInput, FormButton, DeleteIconButton } from "../Modal";
import { colors } from "../../utils/colors";
import { useUnits } from "../../utils/units";

function localDateTime(date) { const p = (n) => String(n).padStart(2, "0"); return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`; }

export default function PumpingForm({ childId, entry, onDone, onClose }) {
  const units = useUnits(); const now = new Date();
  const [amount, setAmount] = useState(entry?.amount != null ? String(entry.amount) : "");
  const [side, setSide] = useState("both");
  const [start, setStart] = useState(entry?.start ? localDateTime(new Date(entry.start)) : localDateTime(new Date(now - 900000)));
  const [end, setEnd] = useState(entry?.end ? localDateTime(new Date(entry.end)) : localDateTime(now));
  const [notes, setNotes] = useState(entry?.notes || ""); const [saving, setSaving] = useState(false);
  const submit = async (event) => { event.preventDefault(); setSaving(true); try { const sideLabel = { left: "Sein gauche", right: "Sein droit", both: "Les deux seins" }[side]; const data = { child: childId, amount: Number(amount), start: `${start}:00`, end: `${end}:00`, notes: `Sein : ${sideLabel}${notes.trim() ? ` — ${notes.trim()}` : ""}` }; if (entry?.id) await api.updatePumping(entry.id, data); else await api.createPumping(data); onDone(); } catch { setSaving(false); } };
  const remove = async () => { if (!entry?.id) return; setSaving(true); try { await api.deletePumping(entry.id); onDone(); } catch { setSaving(false); } };
  return <Modal title={entry ? "Modifier un tirage de lait" : "Ajouter un tirage de lait"} onClose={onClose}><form onSubmit={submit}><FormField label={`Quantité (${units.volume})`}><FormInput type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus /></FormField><FormField label="Sein utilisé"><select value={side} onChange={(e) => setSide(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14, fontFamily: "inherit" }}><option value="left">Sein gauche</option><option value="right">Sein droit</option><option value="both">Les deux seins</option></select></FormField><FormField label="Début"><FormInput type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required /></FormField><FormField label="Fin"><FormInput type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required /></FormField><FormField label="Note"><FormInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Facultative" /></FormField><div style={{ display: "flex", gap: 10, alignItems: "center" }}><div style={{ flex: 1 }}><FormButton color={colors.pumping} disabled={saving}>{saving ? "Enregistrement…" : entry ? "Enregistrer les modifications" : "Enregistrer le tirage"}</FormButton></div>{entry?.id && <DeleteIconButton color={colors.pumping} disabled={saving} onConfirm={remove} />}</div></form></Modal>;
}
