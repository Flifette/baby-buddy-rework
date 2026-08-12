import { useState } from "react";
import { Icons } from "./Icons";
import { useLanguage } from "../utils/i18n";

const TEMPORAL_INPUT_TYPES = new Set(["date", "datetime-local", "time", "month", "week"]);

export default function Modal({ title, children, onClose }) {
  const { t } = useLanguage();
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 400,
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
            {title}
          </span>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            title={t("common.close")}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <Icons.X />
          </button>
        </div>
        <div style={{ padding: "20px", minWidth: 0 }}>{children}</div>
      </div>
    </div>
  );
}

export function FormField({ label, children }) {
  return (
    <div className="form-field" style={{ marginBottom: 14 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--text-muted)",
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: "0.03em",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function FormError({ children }) {
  if (!children) return null;
  return (
    <div role="alert" style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 9, border: "1px solid #EF444466", background: "#EF444418", color: "#FCA5A5", fontSize: 13, lineHeight: 1.4 }}>
      {children}
    </div>
  );
}

export function FormInput({ type = "text", className = "", onInvalid, onInput, ...props }) {
  const { language, t } = useLanguage();
  const isTemporal = TEMPORAL_INPUT_TYPES.has(type);
  const handleInvalid = (event) => {
    const input = event.currentTarget;
    input.setCustomValidity("");
    const validity = input.validity;
    const key = validity.valueMissing
      ? "form.validation.required"
      : validity.rangeUnderflow
        ? "form.validation.minimum"
        : validity.rangeOverflow
          ? "form.validation.maximum"
          : validity.stepMismatch
            ? "form.validation.step"
            : validity.typeMismatch || validity.badInput
              ? "form.validation.invalid"
              : "form.validation.invalid";
    input.setCustomValidity(t(key));
    onInvalid?.(event);
  };
  const handleInput = (event) => {
    event.currentTarget.setCustomValidity("");
    onInput?.(event);
  };
  const input = (
    <input
      type={type}
      className={`form-input ${className}`.trim()}
      lang={props.lang || language}
      onInvalid={handleInvalid}
      onInput={handleInput}
      {...props}
      style={{
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        boxSizing: "border-box",
        display: "block",
        padding: "10px 12px",
        borderRadius: isTemporal ? 0 : 10,
        border: isTemporal ? "none" : "1px solid var(--border)",
        background: isTemporal ? "transparent" : "var(--bg)",
        color: "var(--text)",
        fontSize: 14,
        fontFamily: "inherit",
        outline: "none",
        ...props.style,
      }}
    />
  );
  if (!isTemporal) return input;
  return (
    <div
      className="temporal-input-frame"
      style={{
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--bg)",
      }}
    >
      {input}
    </div>
  );
}

export function FormSelect({ options, ...props }) {
  const { language } = useLanguage();
  return (
    <select
      lang={props.lang || language}
      {...props}
      style={{
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        boxSizing: "border-box",
        display: "block",
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--bg)",
        color: "var(--text)",
        fontSize: 14,
        fontFamily: "inherit",
        outline: "none",
        ...props.style,
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function FormButton({ children, color, type = "submit", onPointerDown, ...props }) {
  const prepareSubmit = (event) => {
    if (type === "submit" && event.pointerType === "touch") {
      event.preventDefault();
      const form = event.currentTarget.form;
      if (document.activeElement instanceof HTMLElement && document.activeElement !== event.currentTarget) {
        document.activeElement.blur();
      }
      form?.requestSubmit(event.currentTarget);
    }
    onPointerDown?.(event);
  };
  return (
    <button
      type={type}
      onPointerDown={prepareSubmit}
      {...props}
      style={{
        width: "100%",
        padding: "12px 20px",
        borderRadius: 12,
        border: "none",
        background: color || "#F59E0B",
        color: "#000",
        fontSize: 14,
        fontWeight: 700,
        cursor: "pointer",
        touchAction: "manipulation",
        fontFamily: "inherit",
        transition: "opacity 0.2s",
        ...props.style,
      }}
    >
      {children}
    </button>
  );
}

export function DeleteIconButton({ color = "#EF4444", onConfirm, disabled = false }) {
  const [confirm, setConfirm] = useState(false);
  const { t } = useLanguage();
  return <>
    <button type="button" aria-label={t("common.delete")} title={t("common.delete")} disabled={disabled} onClick={() => setConfirm(true)} style={{ border: "none", background: `${color}18`, color, borderRadius: 10, width: 42, height: 42, display: "grid", placeItems: "center", cursor: "pointer" }}><Icons.Trash /></button>
    {confirm && <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,.65)", display: "grid", placeItems: "center", padding: 20 }} onClick={() => setConfirm(false)}><div style={{ maxWidth: 340, width: "100%", background: "var(--card-bg)", border: `1px solid ${color}55`, borderRadius: 14, padding: 20, boxShadow: "0 12px 40px rgba(0,0,0,.4)" }} onClick={(e) => e.stopPropagation()}><strong style={{ color: "var(--text)", display: "block", marginBottom: 8 }}>{t("common.deleteTitle")}</strong><span style={{ color: "var(--text-muted)", fontSize: 13 }}>{t("common.deletePermanent")}</span><div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}><button type="button" onClick={() => setConfirm(false)} style={{ border: "1px solid var(--border)", background: "transparent", color: "var(--text)", borderRadius: 9, padding: "8px 14px", cursor: "pointer" }}>{t("common.cancel")}</button><button type="button" onClick={() => { setConfirm(false); onConfirm?.(); }} style={{ border: "none", background: color, color: "#fff", borderRadius: 9, padding: "8px 14px", cursor: "pointer", fontWeight: 700 }}>{t("common.delete")}</button></div></div></div>}
  </>;
}
