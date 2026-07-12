import type { ReactNode } from "react";

/** En-tête d'écran récurrent : sur-titre rubrique + H1 + description + action. */
export function ScreenHeader({
  rubrique,
  titre,
  desc,
  action,
}: {
  rubrique: string;
  titre: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4" style={{ marginBottom: 22 }}>
      <div>
        <p
          className="font-mono uppercase"
          style={{ fontSize: 11, letterSpacing: ".14em", color: "#b07a2e", marginBottom: 6 }}
        >
          {rubrique}
        </p>
        <h1
          className="font-display"
          style={{ fontWeight: 800, fontSize: "clamp(26px,3.4vw,34px)", letterSpacing: "-.02em", color: "#0e3947" }}
        >
          {titre}
        </h1>
        {desc && <p style={{ fontSize: 14, color: "#6b7469", marginTop: 6 }}>{desc}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
