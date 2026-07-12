import type { ReactNode } from "react";

/** Badge pill mono uppercase — motif omniprésent (MOCKUP_DIGEST §5). */
export function Badge({
  children,
  tone = "neutre",
}: {
  children: ReactNode;
  tone?: "calcule" | "demo" | "critique" | "alerte" | "info" | "succes" | "neutre";
}) {
  const tones: Record<string, { bg: string; fg: string }> = {
    calcule: { bg: "rgba(20,147,190,.16)", fg: "#1493be" },
    demo: { bg: "rgba(176,122,46,.18)", fg: "#b07a2e" },
    critique: { bg: "rgba(192,68,46,.14)", fg: "#c0442e" },
    alerte: { bg: "rgba(233,162,59,.24)", fg: "#a9761e" },
    info: { bg: "rgba(63,168,206,.16)", fg: "#1493be" },
    succes: { bg: "rgba(31,138,91,.16)", fg: "#1f8a5b" },
    neutre: { bg: "#f1ead9", fg: "#6b7469" },
  };
  const t = tones[tone];
  return (
    <span
      className="inline-flex items-center rounded-full font-mono uppercase"
      style={{
        background: t.bg,
        color: t.fg,
        fontSize: "9px",
        letterSpacing: ".08em",
        padding: "3px 7px",
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

/** Pastille de couleur (canal / catégorie). */
export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{ width: size, height: size, background: color }}
    />
  );
}
