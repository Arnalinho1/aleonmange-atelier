import "server-only";
import { clientLecture } from "@/lib/supabase/serveur";

/**
 * Cartes du site — lues depuis le CATALOGUE ATELIER (table produit), la
 * source unique du pipeline de vente : les precommandes de la Vague 2
 * refereceront ces memes produit_id. Contenu pilote par les chefs depuis
 * l'Atelier (Catalogue : description + visibilite ; Reglages : familles).
 * Le site lit actif AND visible_site (0020). Etats vides propres partout.
 */

export type ArticleCarte = {
  id: string;
  nom: string;
  description: string | null; // 0020 — affichee sous le nom si renseignee
  prix: number | null; // €/piece (unite) ou €/kg (poids)
  auPoids: boolean;
};

export type FamilleCarte = {
  nom: string;
  note: string | null; // 0021 — note de famille affichee sous le titre
  articles: ArticleCarte[];
};

type LigneProduit = {
  id: string;
  nom: string;
  categorie: string | null;
  mode: string;
  prix_unitaire: number | null;
  prix_kg: number | null;
  description: string | null;
};

type LigneFamille = {
  nom: string;
  note: string | null;
  ordre: number;
};

/**
 * Carte d'un canal, groupee par categorie (famille), triee. Vide si non
 * configuree. L'ordre vient de famille_carte (0021, rapprochement par
 * canal + nom = categorie) : familles reglees d'abord (ordre puis nom),
 * puis les familles sans reglage en alphabetique — le comportement
 * d'avant la 0021 reste le fallback integral.
 */
export async function carteDuCanal(canal: "truck" | "traiteur" | "boutique"): Promise<FamilleCarte[]> {
  const supabase = clientLecture();
  if (!supabase) return [];

  const [produits, familles] = await Promise.all([
    supabase
      .from("produit")
      .select("id, nom, categorie, mode, prix_unitaire, prix_kg, description")
      .eq("canal", canal)
      .eq("actif", true)
      .eq("visible_site", true)
      .order("categorie")
      .order("nom"),
    supabase
      .from("famille_carte")
      .select("nom, note, ordre")
      .eq("canal", canal)
      .eq("actif", true),
  ]);
  if (produits.error) {
    throw new Error(`[site ALM] Lecture de la carte ${canal} impossible : ${produits.error.message}`);
  }
  if (familles.error) {
    throw new Error(`[site ALM] Lecture des familles ${canal} impossible : ${familles.error.message}`);
  }

  const groupes = new Map<string, ArticleCarte[]>();
  for (const p of (produits.data ?? []) as LigneProduit[]) {
    const famille = p.categorie?.trim() || "Autres";
    const arr = groupes.get(famille) ?? [];
    arr.push({
      id: p.id,
      nom: p.nom,
      description: p.description?.trim() || null,
      prix: p.mode === "poids" ? p.prix_kg : p.prix_unitaire,
      auPoids: p.mode === "poids",
    });
    groupes.set(famille, arr);
  }

  const reglages = new Map(((familles.data ?? []) as LigneFamille[]).map((f) => [f.nom, f]));
  return [...groupes.entries()]
    .map(([nom, articles]) => ({
      nom,
      note: reglages.get(nom)?.note?.trim() || null,
      articles,
      _ordre: reglages.get(nom)?.ordre ?? null,
    }))
    .sort((a, b) => {
      if (a._ordre !== null && b._ordre !== null) return a._ordre - b._ordre || a.nom.localeCompare(b.nom, "fr");
      if (a._ordre !== null) return -1;
      if (b._ordre !== null) return 1;
      return a.nom.localeCompare(b.nom, "fr");
    })
    .map(({ nom, note, articles }) => ({ nom, note, articles }));
}

/** Format €: "12,50 €" ou "24,00 €/kg". Jamais de NaN : null → chaine vide. */
export function fmtPrix(article: ArticleCarte): string {
  if (article.prix == null || !Number.isFinite(article.prix)) return "";
  const base = Number(article.prix).toFixed(2).replace(".", ",") + " €";
  return article.auPoids ? `${base}/kg` : base;
}
