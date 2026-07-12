import type { CategorieComposant, Composant } from "@/lib/supabase/database.types";

/**
 * Seuil de stock — SOURCE UNIQUE (handoff « Profil & Stock » §2.1 + arbitrage
 * navette CC : le seuil RESTE dans la table seuil_stock, pas sur composant).
 *
 *   seuil effectif = seuil_stock.seuil_bas (override) ?? défaut par catégorie
 *
 * Lu par : statut Stocks (Niveaux), liste d'achat (À racheter) — zéro
 * recalcul parallèle. Les défauts sont des FORFAITS indicatifs convertis en
 * unités réelles (la maquette comptait en portions ≈ 100 g), révisables au
 * chantier règles (B2).
 */
export const SEUIL_DEFAUT_KG: Record<CategorieComposant, number> = {
  proteine: 2.4,
  feculent: 4,
  legume: 3,
  sauce: 2,
};

/** Composants suivis à la pièce (œufs, citrons, blinis, pains…). */
export const SEUIL_DEFAUT_PIECE: Record<CategorieComposant, number> = {
  proteine: 24,
  feculent: 40,
  legume: 30,
  sauce: 20,
};

export type SeuilEffectif = { valeur: number; source: "override" | "defaut" };

/** Litres = valeur kg (densité ≈ 1 pour les sauces/liquides suivis). */
export function seuilEffectif(composant: Composant, seuilBas: number | null): SeuilEffectif {
  if (seuilBas != null) return { valeur: seuilBas, source: "override" };
  const defauts = composant.unite === "piece" ? SEUIL_DEFAUT_PIECE : SEUIL_DEFAUT_KG;
  return { valeur: defauts[composant.categorie], source: "defaut" };
}
