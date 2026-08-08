import { useState } from "react";
import { Icons } from "./Icons";

export default function Modal({ title, children, onClose }) {
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
        <div style={{ padding: "20px" }}>{children}</div>
      </div>
    </div>
  );
}

export function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
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

export function FormInput({ type = "text", ...props }) {
  return (
    <input
      type={type}
      {...props}
      style={{
        width: "100%",
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
    />
  );
}

export function FormSelect({ options, ...props }) {
  return (
    <select
      {...props}
      style={{
        width: "100%",
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

export function FormButton({ children, color, ...props }) {
  return (
    <button
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
  return <>
    <button type="button" aria-label="Supprimer" title="Supprimer" disabled={disabled} onClick={() => setConfirm(true)} style={{ border: "none", background: `${color}18`, color, borderRadius: 10, width: 42, height: 42, display: "grid", placeItems: "center", cursor: "pointer" }}><Icons.Trash /></button>
    {confirm && <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,.65)", display: "grid", placeItems: "center", padding: 20 }} onClick={() => setConfirm(false)}><div style={{ maxWidth: 340, width: "100%", background: "var(--card-bg)", border: `1px solid ${color}55`, borderRadius: 14, padding: 20, boxShadow: "0 12px 40px rgba(0,0,0,.4)" }} onClick={(e) => e.stopPropagation()}><strong style={{ color: "var(--text)", display: "block", marginBottom: 8 }}>Supprimer cette occurrence ?</strong><span style={{ color: "var(--text-muted)", fontSize: 13 }}>Cette action est définitive.</span><div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}><button type="button" onClick={() => setConfirm(false)} style={{ border: "1px solid var(--border)", background: "transparent", color: "var(--text)", borderRadius: 9, padding: "8px 14px", cursor: "pointer" }}>Annuler</button><button type="button" onClick={() => { setConfirm(false); onConfirm?.(); }} style={{ border: "none", background: color, color: "#fff", borderRadius: 9, padding: "8px 14px", cursor: "pointer", fontWeight: 700 }}>Supprimer</button></div></div></div>}
  </>;
}
