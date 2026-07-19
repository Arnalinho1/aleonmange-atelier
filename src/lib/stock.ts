import type {
  CategorieComposant,
  Composant,
  Produit,
  Recette,
  RecetteComposant,
  VenteLigne,
  VenteLigneComposant,
} from "@/lib/supabase/database.types";

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

// ─── Dépliage vente → grammes par composant (B8) ────────────────────────────
// SOURCE UNIQUE, trois lecteurs : sorties « consommé » à la remise (sale et
// orders), calcul dynamique du « réservé » (Stocks). Jamais réimplémenté.

export type LigneDepliable = Pick<VenteLigne, "type" | "mode" | "qte" | "poids_g" | "produit_id"> & {
  composants: Pick<VenteLigneComposant, "composant_id" | "categorie" | "quantite_g">[];
};

export type ContexteDepliage = {
  produitParId: Map<string, Pick<Produit, "recette_id" | "is_bowl" | "mode">>;
  recetteParId: Map<string, Pick<Recette, "rendement">>;
  fichesParRecette: Map<string, Pick<RecetteComposant, "composant_id" | "categorie" | "quantite">[]>;
};

/**
 * Grammes du bowl par composant CHOISI, d'après la fiche du produit :
 * le composant est dans la fiche → ses grammes ; échangé (bowl libre) →
 * grammes du composant de base de la MÊME catégorie (1re ligne de la fiche).
 * Retourne les grammes PAR PORTION (null si la fiche ne couvre pas la catégorie).
 */
export function grammesBowlComposant(
  fiche: Pick<RecetteComposant, "composant_id" | "categorie" | "quantite">[],
  rendement: number | null,
  composantId: string,
  categorie: CategorieComposant
): number | null {
  const r = rendement || 1;
  const exacte = fiche.find((f) => f.composant_id === composantId && f.quantite != null);
  if (exacte) return Number(exacte.quantite) / r;
  const base = fiche.find((f) => f.categorie === categorie && f.quantite != null);
  return base ? Number(base.quantite) / r : null;
}

/**
 * Construit les lignes `vente_ligne_composant` (moins `ligne_id`) d'un bowl —
 * SOURCE UNIQUE partagée par la saisie manuelle (createVente) et la confirmation
 * d'une commande web (Vague 3), pour une sortie byte-identique. `quantite_g` =
 * grammes par portion (fiche) × qte, figés, arrondis 2 décimales (null si la
 * fiche ne couvre pas la catégorie). Les composants doivent être pré-validés
 * (existants/actifs) par l'appelant ; pour un bowl SIGNATURE ils sont les
 * composants de la fiche elle-même (chacun tombe sur la branche « exacte »).
 */
export function composerLignesComposantBowl(
  fiche: Pick<RecetteComposant, "composant_id" | "categorie" | "quantite">[],
  rendement: number | null,
  composants: { composant_id: string; categorie: CategorieComposant }[],
  qte: number
): { composant_id: string; categorie: CategorieComposant; quantite_g: number | null }[] {
  return composants.map(({ composant_id, categorie }) => {
    const parPortion = grammesBowlComposant(fiche, rendement, composant_id, categorie);
    return {
      composant_id,
      categorie,
      quantite_g: parPortion != null ? Math.round(parPortion * qte * 100) / 100 : null,
    };
  });
}

/**
 * Déplie une ligne de vente en grammes TOTAUX par composant.
 * - bowl : vlc.quantite_g figés à l'encaissement ; fallback fiche du produit
 *   (historique antérieur à B8, grammes du composant de base par catégorie) ;
 * - produit à l'unité avec fiche : grammes fiche × qte / rendement ;
 * - produit au poids avec fiche : poids_g vendu réparti au prorata des
 *   grammes de la fiche (fiche sans grammes → rien, signalé) ;
 * - produit sans fiche (revendu) : rien — pas suivi en stock (scope A3).
 */
export function deplierLigneEnGrammes(l: LigneDepliable, ctx: ContexteDepliage): Map<string, number> {
  const grammes = new Map<string, number>();
  const ajouter = (composantId: string, g: number) => {
    if (g > 0) grammes.set(composantId, (grammes.get(composantId) ?? 0) + g);
  };
  const produit = l.produit_id ? ctx.produitParId.get(l.produit_id) : undefined;
  const fiche = produit?.recette_id ? ctx.fichesParRecette.get(produit.recette_id) ?? [] : [];

  if (l.type === "bowl") {
    const rendement = produit?.recette_id ? ctx.recetteParId.get(produit.recette_id)?.rendement ?? null : null;
    for (const c of l.composants) {
      if (c.quantite_g != null) {
        ajouter(c.composant_id, Number(c.quantite_g));
        continue;
      }
      const parPortion = grammesBowlComposant(fiche, rendement, c.composant_id, c.categorie);
      if (parPortion != null) ajouter(c.composant_id, parPortion * (l.qte ?? 1));
    }
    return grammes;
  }

  if (fiche.length === 0) return grammes; // revendu tel quel — aucune déduction

  if (l.mode === "poids") {
    const total = fiche.reduce((t, f) => t + (f.quantite != null ? Number(f.quantite) : 0), 0);
    if (!total || l.poids_g == null) return grammes;
    for (const f of fiche) {
      if (f.quantite == null) continue;
      ajouter(f.composant_id, (Number(l.poids_g) * Number(f.quantite)) / total);
    }
    return grammes;
  }

  // unite : grammes fiche par portion × quantité vendue
  const rendement = ctx.recetteParId.get(produit!.recette_id!)?.rendement || 1;
  for (const f of fiche) {
    if (f.quantite == null) continue;
    ajouter(f.composant_id, (Number(f.quantite) / rendement) * (l.qte ?? 1));
  }
  return grammes;
}

/**
 * Convertit des grammes dans l'UNITÉ DE STOCK du composant.
 * kg et L : /1000 (densité ≈ 1) ; pièce : /poids_piece_g — NON CONVERTIBLE
 * (null) tant que le poids d'une pièce n'est pas renseigné (badge Stocks).
 */
export function grammesVersUnite(
  composant: Pick<Composant, "unite" | "poids_piece_g">,
  grammes: number
): number | null {
  if (composant.unite === "piece") {
    const poids = composant.poids_piece_g != null ? Number(composant.poids_piece_g) : null;
    if (!poids) return null;
    return Math.round((grammes / poids) * 1000) / 1000;
  }
  return Math.round(grammes) / 1000; // kg comme L : g → kg|L
}
