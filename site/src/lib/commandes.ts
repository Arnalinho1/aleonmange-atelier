/**
 * Helpers d'affichage des commandes client (espace client, Vague 4).
 * Fonctions PURES (utilisables serveur ET client). Aucune dependance Supabase.
 */

export type LigneVente = { libelle: string | null; qte: number | null; montant: number | null };

export type VenteClient = {
  id: string;
  occurred_at: string;
  canal: string;
  fulfillment: string;
  refuse_le: string | null;
  montant_total: number | null;
  vente_ligne?: LigneVente[];
};

/** Reference courte affichee au client : 8 premiers caracteres de l'id, comme la
 *  confirmation de precommande (pas le "ALM-XXXX" de demonstration de la maquette). */
export function refCourt(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export function libelleCanal(canal: string): string {
  if (canal === "boutique") return "Boutique";
  if (canal === "truck") return "Food truck";
  if (canal === "traiteur") return "Traiteur";
  return canal;
}

/** Etiquette de canal facon maquette : "Web · Click & collect", "Food truck", etc. */
export function libelleCanalDetaille(canal: string, source?: string | null): string {
  if (source === "web" && canal === "boutique") return "Web · Click & collect";
  if (canal === "truck") return "Food truck";
  if (canal === "boutique") return "Boutique";
  if (canal === "traiteur") return "Traiteur";
  return libelleCanal(canal);
}

/** Statut VISIBLE au client. Regle verrouillee : une commande web non confirmee
 *  est TOUJOURS "En attente de confirmation par l'atelier", jamais "validee". */
export function statutClient(fulfillment: string, refuseLe: string | null): {
  label: string;
  ton: "vert" | "attente" | "neutre";
} {
  if (fulfillment === "web_a_confirmer") {
    return refuseLe
      ? { label: "Non confirmée", ton: "neutre" }
      : { label: "En attente de confirmation par l'atelier", ton: "attente" };
  }
  if (fulfillment === "remis") return { label: "Retirée", ton: "vert" };
  if (fulfillment === "annule") return { label: "Annulée", ton: "neutre" };
  return { label: "En cours de préparation", ton: "neutre" };
}

/** Un passage fidelite est credite au RETRAIT (remis), boutique + truck seulement. */
export function crediteUnPassage(v: { fulfillment: string; canal: string }): boolean {
  return v.fulfillment === "remis" && (v.canal === "boutique" || v.canal === "truck");
}

/** Resume des articles : "Premier article + N" (comme la maquette). */
export function resumeArticles(lignes: LigneVente[] | undefined): string {
  if (!lignes || lignes.length === 0) return "Commande";
  const premier = lignes[0]?.libelle ?? "Article";
  const autres = lignes.length - 1;
  return autres > 0 ? `${premier} + ${autres}` : premier;
}

export function formaterDateCourte(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

export function formaterDateLongue(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

export function formaterMontant(m: unknown): string {
  const n = typeof m === "number" ? m : Number(m ?? 0);
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

/** Etat derive de la fidelite pour l'affichage (carte a tampons). */
export function calculFidelite(passages: number, seuil: number, rachats: number) {
  if (seuil <= 0) return { passages, seuil: 0, cycle: 0, reste: 0, disponibles: 0 };
  const disponibles = Math.max(0, Math.floor(passages / seuil) - rachats);
  const cycle = passages % seuil; // tampons remplis dans la carte en cours
  const reste = cycle === 0 && passages > 0 ? 0 : seuil - cycle;
  return { passages, seuil, cycle, reste, disponibles };
}
