import Link from "next/link";
import type { ReactNode } from "react";

/**
 * État vide explicite. Règle d'or (HANDOFF §02) : l'app démarre VIDE, chaque
 * écran gère proprement l'absence de données — jamais de NaN, 0/0 ni graphe
 * cassé. Un écran vide bien géré vaut mieux qu'un chiffre inventé.
 */
export function EmptyState({
  icon,
  titre,
  message,
  cta,
}: {
  icon?: ReactNode;
  titre: string;
  message?: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{
        border: "1.5px dashed #d8cdb6",
        borderRadius: 16,
        padding: "44px 28px",
        background: "#efe9dc",
      }}
    >
      {icon && <div style={{ color: "#9a927f", marginBottom: 12 }}>{icon}</div>}
      <p className="font-display" style={{ fontSize: 17, fontWeight: 700, color: "#0e3947" }}>
        {titre}
      </p>
      {message && (
        <p style={{ fontSize: 13.5, color: "#6b7469", marginTop: 6, maxWidth: 420 }}>{message}</p>
      )}
      {cta && (
        <Link
          href={cta.href}
          className="mt-4 inline-flex items-center rounded-[11px] font-display transition-opacity hover:opacity-90"
          style={{ background: "#1493be", color: "#f6f1e7", fontWeight: 700, fontSize: 14, padding: "9px 16px" }}
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
