import type { CSSProperties, ReactNode } from "react";

/** Carte crème standard (bord parchemin). */
export function Card({
  children,
  dark = false,
  style,
  className = "",
}: {
  children: ReactNode;
  dark?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: dark ? "#0e3947" : "#f6f1e7",
        border: dark ? "none" : "1px solid #dfd4bf",
        borderRadius: 16,
        color: dark ? "#f6f1e7" : "#0e3947",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** En-tête de section (bande crème #F1EAD9 + titre + compteur mono optionnel). */
export function SectionHeader({
  titre,
  sous,
  compteur,
  action,
}: {
  titre: string;
  sous?: string;
  compteur?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ background: "#f1ead9", padding: "11px 16px", borderRadius: "16px 16px 0 0" }}
    >
      <div>
        <p className="font-display" style={{ fontSize: 16, fontWeight: 700, color: "#0e3947" }}>
          {titre}
        </p>
        {sous && <p style={{ fontSize: 12, color: "#6b7469", marginTop: 1 }}>{sous}</p>}
      </div>
      {compteur && (
        <span className="font-mono" style={{ fontSize: 12, color: "#9a927f", letterSpacing: ".04em" }}>
          {compteur}
        </span>
      )}
      {action}
    </div>
  );
}
