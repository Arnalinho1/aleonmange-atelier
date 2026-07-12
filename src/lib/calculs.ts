import type { Composant, Produit, Recette, RecetteComposant } from "@/lib/supabase/database.types";

/**
 * Calculs de coût matière — SOURCE UNIQUE (HANDOFF §03).
 * Recettes, Catalogue et Finances lisent ces mêmes fonctions : le coût d'un
 * composant est lu par son `id` (jamais par canal), la marge « brute matière »
 * (prix − coût matière) garde ce libellé partout — la marge « nette » (après
 * charges) est un AUTRE calcul, qui vit dans Finances.
 */

/** Coût matière d'une fiche : Σ quantite_g/1000 × coût €/kg. Null si rien n'est calculable. */
export function coutMatiereFiche(
  lignes: RecetteComposant[],
  compParId: Map<string, Composant>
): number | null {
  let total = 0;
  let calculable = false;
  for (const l of lignes) {
    const c = compParId.get(l.composant_id);
    if (l.quantite != null && c?.cout_matiere_kg != null) {
      total += (l.quantite / 1000) * c.cout_matiere_kg;
      calculable = true;
    }
  }
  return calculable ? total : null;
}

/** Coût matière par portion — null sans rendement (jamais de chiffre inventé). */
export function coutParPortion(cout: number | null, rendement: number | null): number | null {
  if (cout == null || !rendement) return null;
  return cout / rendement;
}

/** Marge brute matière = prix de vente unitaire − coût matière/portion. */
export function margeBruteMatiere(
  prixUnitaire: number | null,
  coutPortion: number | null
): number | null {
  if (prixUnitaire == null || coutPortion == null) return null;
  return prixUnitaire - coutPortion;
}

/** Coût/portion d'un produit via sa fiche liée. Regroupe le calcul complet. */
export function coutPortionProduit(
  produit: Produit,
  recettes: Map<string, Recette>,
  lignesParRecette: Map<string, RecetteComposant[]>,
  compParId: Map<string, Composant>
): number | null {
  if (!produit.recette_id) return null;
  const recette = recettes.get(produit.recette_id);
  if (!recette) return null;
  const cout = coutMatiereFiche(lignesParRecette.get(recette.id) ?? [], compParId);
  return coutParPortion(cout, recette.rendement);
}

/** Format monétaire FR ("12,50"). Ne JAMAIS l'appeler avec NaN — retourner "—" en amont. */
export function fmtEuro(n: number): string {
  return n.toFixed(2).replace(".", ",");
}
