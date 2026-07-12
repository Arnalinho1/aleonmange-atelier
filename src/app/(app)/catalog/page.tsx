import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { coutPortionProduit, margeBruteMatiere } from "@/lib/calculs";
import type { Produit, Recette, RecetteComposant, Composant } from "@/lib/supabase/database.types";
import { CatalogManager, type CoutParProduit } from "./CatalogManager";

export const metadata = { title: "Catalogue — Atelier ALM" };

/**
 * Catalogue = CONTENU refait à la main (les produits de démo ne sont PAS portés).
 * Vide au lancement. Créer / éditer / retirer d'un canal (soft delete).
 * Coût matière et marge brute matière dérivés de la fiche liée via
 * lib/calculs.ts — les mêmes fonctions que Recettes (source unique).
 */
export default async function CatalogPage() {
  const m = SCREEN_META.catalog;
  let produits: Produit[] = [];
  let recettes: Recette[] = [];
  const couts: CoutParProduit = {};

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const [p, r, l, c] = await Promise.all([
      supabase.from("produit").select("*").order("actif", { ascending: false }).order("nom"),
      supabase.from("recette").select("*").eq("actif", true).order("nom"),
      supabase.from("recette_composant").select("*"),
      supabase.from("composant").select("*"),
    ]);
    produits = p.data ?? [];
    recettes = r.data ?? [];
    const lignes: RecetteComposant[] = l.data ?? [];
    const composants: Composant[] = c.data ?? [];

    const recetteParId = new Map(recettes.map((x) => [x.id, x]));
    const compParId = new Map(composants.map((x) => [x.id, x]));
    const lignesParRecette = new Map<string, RecetteComposant[]>();
    for (const li of lignes) {
      const arr = lignesParRecette.get(li.recette_id) ?? [];
      arr.push(li);
      lignesParRecette.set(li.recette_id, arr);
    }

    for (const produit of produits) {
      const cout = coutPortionProduit(produit, recetteParId, lignesParRecette, compParId);
      couts[produit.id] = {
        cout,
        marge: margeBruteMatiere(produit.prix_unitaire, cout),
      };
    }
  }

  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      <CatalogManager produits={produits} recettes={recettes} couts={couts} />
    </>
  );
}
