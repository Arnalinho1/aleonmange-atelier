import type { Composant, Produit, Recette, RecetteComposant } from "@/lib/supabase/database.types";
import { deplierLigneEnGrammes, type ContexteDepliage, type LigneDepliable } from "@/lib/stock";

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

// ─── Primitives par LIGNE DE VENTE (chantier Productivité élargie) ─────────
// UNE fonction, DEUX lecteurs : Finances (marges) et Productivité (charge de
// production). Jamais réimplémentées ailleurs.

export type CoutLigneVente = { cout: number; source: "fiche" | "achat" };

/**
 * Coût matière RÉEL d'une ligne de vente.
 * - Produit avec fiche → dépliage B8 (bowls : grammes figés vlc.quantite_g,
 *   fallback fiche pour l'historique ; unité : fiche/rendement ; poids : au
 *   prorata de la fiche) × cout_matiere_kg. Le coût se calcule en grammes —
 *   poids_piece_g n'est pas nécessaire.
 * - Revendu sans fiche → cout_achat × qte (unite) ou × poids_g/1000 (poids).
 * - Ni fiche ni cout_achat → null = NON COUVERT (alimente l'indicateur de
 *   couverture — jamais un faux zéro).
 */
export function coutMatiereLigneVente(
  ligne: LigneDepliable,
  ctx: ContexteDepliage,
  compParId: Map<string, Composant>,
  produit: Produit | undefined
): CoutLigneVente | null {
  if (!produit) return null;

  if (produit.recette_id) {
    const grammes = deplierLigneEnGrammes(ligne, ctx);
    if (grammes.size === 0) return null; // fiche sans grammes exploitables
    let total = 0;
    let calculable = false;
    for (const [composantId, g] of grammes) {
      const c = compParId.get(composantId);
      if (c?.cout_matiere_kg != null) {
        total += (g / 1000) * Number(c.cout_matiere_kg);
        calculable = true;
      }
    }
    return calculable ? { cout: total, source: "fiche" } : null;
  }

  if (produit.cout_achat != null) {
    const coutAchat = Number(produit.cout_achat);
    if (ligne.mode === "poids") {
      if (ligne.poids_g == null) return null;
      return { cout: coutAchat * (Number(ligne.poids_g) / 1000), source: "achat" };
    }
    return { cout: coutAchat * (ligne.qte ?? 1), source: "achat" };
  }

  return null;
}

/**
 * Temps de production ESTIMÉ d'une ligne de vente, en minutes (déclaratif
 * chef — toujours affiché avec le tag Estimé).
 * - Fiche avec temps → temps_prepa_min ÷ rendement × qte (unité), ou
 *   temps × poids_g ÷ Σ grammes fiche (poids — même conversion kg→portions
 *   que lib/plan.ts).
 * - REVENDU (sans fiche) → 0 EXPLICITE : rien à produire (scope A3).
 * - Fiche SANS temps → null = « temps non défini » (jamais 0 silencieux).
 */
export function tempsProductionLigne(
  ligne: Pick<LigneDepliable, "mode" | "qte" | "poids_g">,
  produit: Produit | undefined,
  recetteParId: Map<string, Recette>,
  fichesParRecette: Map<string, RecetteComposant[]>
): number | null {
  if (!produit) return null;
  if (!produit.recette_id) return 0; // revendu tel quel

  const recette = recetteParId.get(produit.recette_id);
  if (!recette || recette.temps_prepa_min == null) return null;
  const temps = Number(recette.temps_prepa_min);

  if (ligne.mode === "poids") {
    const fiche = fichesParRecette.get(produit.recette_id) ?? [];
    const totalG = fiche.reduce((t, f) => t + (f.quantite != null ? Number(f.quantite) : 0), 0);
    if (!totalG || ligne.poids_g == null) return null;
    return temps * (Number(ligne.poids_g) / totalG);
  }

  const rendement = recette.rendement || 1;
  return (temps / rendement) * (ligne.qte ?? 1);
}

/** Format monétaire FR ("12,50"). Ne JAMAIS l'appeler avec NaN — retourner "—" en amont. */
export function fmtEuro(n: number): string {
  return n.toFixed(2).replace(".", ",");
}
