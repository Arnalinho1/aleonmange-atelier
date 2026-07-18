import "server-only";
import { clientLecture } from "@/lib/supabase/serveur";

/**
 * Cartes du site — lues depuis le CATALOGUE ATELIER (table produit), la
 * source unique du pipeline de vente : les precommandes de la Vague 2
 * referenceront ces memes produit_id. Contenu pilote par les chefs depuis
 * l'Atelier ; descriptions et notes de famille arrivent avec le plan de
 * migration referentiel (fin de vague). Etats vides propres partout.
 */

export type ArticleCarte = {
  id: string;
  nom: string;
  prix: number | null; // €/piece (unite) ou €/kg (poids)
  auPoids: boolean;
};

export type FamilleCarte = {
  nom: string;
  articles: ArticleCarte[];
};

type LigneProduit = {
  id: string;
  nom: string;
  categorie: string | null;
  mode: string;
  prix_unitaire: number | null;
  prix_kg: number | null;
};

/** Carte d'un canal, groupee par categorie (famille), triee. Vide si non configuree. */
export async function carteDuCanal(canal: "truck" | "traiteur" | "boutique"): Promise<FamilleCarte[]> {
  const supabase = clientLecture();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("produit")
    .select("id, nom, categorie, mode, prix_unitaire, prix_kg")
    .eq("canal", canal)
    .eq("actif", true)
    .order("categorie")
    .order("nom");
  if (error) {
    throw new Error(`[site ALM] Lecture de la carte ${canal} impossible : ${error.message}`);
  }

  const familles = new Map<string, ArticleCarte[]>();
  for (const p of (data ?? []) as LigneProduit[]) {
    const famille = p.categorie?.trim() || "Autres";
    const arr = familles.get(famille) ?? [];
    arr.push({
      id: p.id,
      nom: p.nom,
      prix: p.mode === "poids" ? p.prix_kg : p.prix_unitaire,
      auPoids: p.mode === "poids",
    });
    familles.set(famille, arr);
  }
  return [...familles.entries()].map(([nom, articles]) => ({ nom, articles }));
}

/** Format €: "12,50 €" ou "24,00 €/kg". Jamais de NaN : null → chaine vide. */
export function fmtPrix(article: ArticleCarte): string {
  if (article.prix == null || !Number.isFinite(article.prix)) return "";
  const base = Number(article.prix).toFixed(2).replace(".", ",") + " €";
  return article.auPoids ? `${base}/kg` : base;
}
