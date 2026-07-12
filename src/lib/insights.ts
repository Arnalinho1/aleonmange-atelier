import type { Insight } from "@/lib/supabase/database.types";

/**
 * SOURCE UNIQUE du tri des insights (HANDOFF §03) : le dashboard lit LE MÊME
 * jeu trié puis `.slice(0, 3)` — zéro logique parallèle. Les RÈGLES de
 * génération des insights ne sont PAS implémentées ici : POINT OUVERT #2
 * (à valider avec Arnaud avant de figer quoi que ce soit).
 */

/** Clés stockées (stables). Libellés FR côté front uniquement. */
export const URGENCES = ["aujourdhui", "semaine", "structurel"] as const;
export type Urgence = (typeof URGENCES)[number];

export const URGENCE_LABEL: Record<string, string> = {
  aujourdhui: "Aujourd'hui",
  semaine: "Cette semaine",
  structurel: "Structurel",
};

export const URGENCE_COLOR: Record<string, string> = {
  aujourdhui: "#c0442e",
  semaine: "#a9761e",
  structurel: "#1493be",
};

export const STATUT_INSIGHT = ["ouvert", "reporte", "traite"] as const;

const ORDRE_URGENCE: Record<string, number> = { aujourdhui: 0, semaine: 1, structurel: 2 };

/** Tri urgence (aujourd'hui → semaine → structurel) puis impact décroissant. */
export function trierInsights<T extends Pick<Insight, "urgence" | "impact">>(insights: T[]): T[] {
  return [...insights].sort((a, b) => {
    const u = (ORDRE_URGENCE[a.urgence] ?? 9) - (ORDRE_URGENCE[b.urgence] ?? 9);
    if (u !== 0) return u;
    return (b.impact ?? 0) - (a.impact ?? 0);
  });
}
