import type { Composant, Produit, Recette, RecetteComposant } from "@/lib/supabase/database.types";

/**
 * PLAN DE PRODUCTION — SOURCE UNIQUE (correctif métier du 12/07/2026).
 *
 * On ne produit pas des ingrédients : l'unité de production est le PRODUIT
 * FABRIQUÉ (fiche technique liée), compté en portions. Les matières premières
 * ne sont qu'une DÉRIVATION du plan (plan × fiches) — jamais « à produire ».
 * Prévision (prod), Charge à produire (orders) et Dashboard lisent ces mêmes
 * fonctions : un seul calcul, plusieurs vues (HANDOFF §03).
 *
 * Règles :
 * - produit SANS fiche liée (revendu tel quel, transforme=false) → JAMAIS
 *   dans le plan ;
 * - bowl signature (ligne.recette_id ≠ null) → compté sous son produit ;
 * - bowl COMPOSITION LIBRE (ligne.recette_id = null) → hors plan produits,
 *   agrégé à part (« + N bowls libres »), ses composants réels comptés en
 *   portions (le dépliage réel ne porte pas de grammages) ;
 * - produit au poids transformé → demande en kg convertie en portions via la
 *   fiche (portion_g = Σ grammes / rendement) ; sans grammages de fiche, la
 *   demande reste en kg et sort des besoins (signalé à l'écran).
 */

/** Ligne de vente réduite au nécessaire du plan (sérialisable). */
export type LignePlan = {
  produit_id: string | null;
  type: string;
  recette_id: string | null;
  qte: number | null;
  poids_g: number | null;
};

export type PlanProduit = {
  produit_id: string;
  nom: string;
  recette_id: string;
  /** Portions (fractionnaires possibles pour les produits au poids). */
  portions: number;
  /** Demande au poids agrégée (kg) — null pour un produit à l'unité. */
  kg: number | null;
};

export type PlanProduction = {
  /** Produits fabriqués, triés par portions décroissantes. */
  produits: PlanProduit[];
  /** Bowls en composition libre (sans parent — reco Contrat §02). */
  libresPortions: number;
  /** Produits au poids dont la fiche n'a pas de grammages : kg non convertis. */
  kgNonConvertis: { produit_id: string; nom: string; kg: number }[];
};

/** Grammes d'UNE portion par fiche : Σ quantités / rendement (null si aucune quantité). */
export function portionGParRecette(
  recettes: Recette[],
  lignesRecettes: RecetteComposant[]
): Map<string, number | null> {
  const sommes = new Map<string, number>();
  for (const l of lignesRecettes) {
    if (l.quantite != null) sommes.set(l.recette_id, (sommes.get(l.recette_id) ?? 0) + l.quantite);
  }
  const out = new Map<string, number | null>();
  for (const r of recettes) {
    const somme = sommes.get(r.id);
    out.set(r.id, somme && somme > 0 ? somme / (r.rendement || 1) : null);
  }
  return out;
}

/** Agrège la demande PAR PRODUIT FABRIQUÉ. Les revendus sont exclus d'office. */
export function agregerPlanProduits(
  lignes: LignePlan[],
  prodParId: Map<string, Produit>,
  portionG: Map<string, number | null>
): PlanProduction {
  const parProduit = new Map<string, PlanProduit>();
  const kgNonConvertis = new Map<string, { produit_id: string; nom: string; kg: number }>();
  let libresPortions = 0;

  for (const l of lignes) {
    const produit = l.produit_id ? prodParId.get(l.produit_id) : undefined;
    if (!produit || produit.recette_id == null) continue; // revendu tel quel : jamais produit

    if (l.type === "bowl" && l.recette_id == null) {
      libresPortions += l.qte ?? 1; // composition libre : hors plan produits
      continue;
    }

    if (produit.mode === "poids") {
      const kg = (l.poids_g ?? 0) / 1000;
      if (kg <= 0) continue;
      const g = portionG.get(produit.recette_id);
      if (g == null) {
        const cur = kgNonConvertis.get(produit.id) ?? { produit_id: produit.id, nom: produit.nom, kg: 0 };
        cur.kg += kg;
        kgNonConvertis.set(produit.id, cur);
        continue;
      }
      const cur = parProduit.get(produit.id) ?? { produit_id: produit.id, nom: produit.nom, recette_id: produit.recette_id, portions: 0, kg: 0 };
      cur.portions += (l.poids_g ?? 0) / g;
      cur.kg = (cur.kg ?? 0) + kg;
      parProduit.set(produit.id, cur);
    } else {
      const cur = parProduit.get(produit.id) ?? { produit_id: produit.id, nom: produit.nom, recette_id: produit.recette_id, portions: 0, kg: null };
      cur.portions += l.qte ?? 1;
      parProduit.set(produit.id, cur);
    }
  }

  return {
    produits: [...parProduit.values()].sort((a, b) => b.portions - a.portions),
    libresPortions,
    kgNonConvertis: [...kgNonConvertis.values()],
  };
}

export type BesoinMatiere = { composant: Composant; grammes: number };

/**
 * BESOINS MATIÈRES PREMIÈRES, dérivés du plan : Σ (portions × quantité de la
 * fiche / rendement) par composant. Même donnée `recette_composant` que le
 * dépliage des ventes — aucune logique parallèle.
 */
export function besoinsMatieres(
  produits: { recette_id: string; portions: number }[],
  recetteParId: Map<string, Recette>,
  lignesParRecette: Map<string, RecetteComposant[]>,
  compParId: Map<string, Composant>
): BesoinMatiere[] {
  const parComposant = new Map<string, BesoinMatiere>();
  for (const p of produits) {
    const recette = recetteParId.get(p.recette_id);
    if (!recette) continue;
    const rendement = recette.rendement || 1;
    for (const l of lignesParRecette.get(p.recette_id) ?? []) {
      if (l.quantite == null) continue;
      const composant = compParId.get(l.composant_id);
      if (!composant) continue;
      const cur = parComposant.get(composant.id) ?? { composant, grammes: 0 };
      cur.grammes += (p.portions * l.quantite) / rendement;
      parComposant.set(composant.id, cur);
    }
  }
  return [...parComposant.values()].sort((a, b) => b.grammes - a.grammes);
}

/** Affichage d'une quantité de besoin : grammes lisibles (kg au-delà de 1000 g). */
export function fmtGrammes(g: number): string {
  if (g >= 1000) return `${(g / 1000).toFixed(1).replace(".", ",")} kg`;
  return `${Math.ceil(g)} g`;
}

/** Affichage des portions du plan (entier, ou 1 décimale si fractionnaire). */
export function fmtPortions(p: number): string {
  const arrondi = Math.round(p * 10) / 10;
  return Number.isInteger(arrondi) ? String(arrondi) : arrondi.toFixed(1).replace(".", ",");
}
