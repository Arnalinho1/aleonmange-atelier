import type { ReactNode } from "react";
import { Badge } from "./Badge";

/**
 * Carte KPI — 2 variantes (MOCKUP_DIGEST §5) :
 *  - foncée (#0E3947, label mono cyan)
 *  - claire (#F6F1E7, label gris + tag optionnel)
 * `value` accepte un ReactNode pour laisser l'écran gérer l'état vide
 * (ex: "—" plutôt qu'un 0 trompeur).
 */
export function KpiCard({
  label,
  value,
  sub,
  tag,
  variant = "dark",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  tag?: { label: string; tone: "calcule" | "demo" };
  variant?: "dark" | "light";
}) {
  const dark = variant === "dark";
  return (
    <div
      style={{
        background: dark ? "#0e3947" : "#f6f1e7",
        border: dark ? "none" : "1px solid #dfd4bf",
        borderRadius: 14,
        padding: "14px 16px",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 10,
            letterSpacing: ".1em",
            color: dark ? "#8fcfe2" : "#9a927f",
          }}
        >
          {label}
        </span>
        {tag && <Badge tone={tag.tone}>{tag.label}</Badge>}
      </div>
      <div
        className="font-display"
        style={{ fontSize: 26, fontWeight: 800, color: dark ? "#f6f1e7" : "#0e3947", marginTop: 6, lineHeight: 1.1 }}
      >
        {value}
      </div>
      {sub && (
        <p className="font-mono" style={{ fontSize: 11, color: dark ? "#8fcfe2" : "#6b7469", marginTop: 3 }}>
          {sub}
        </p>
      )}
    </div>
  );
}
