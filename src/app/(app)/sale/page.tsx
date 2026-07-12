import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  Canal,
  CategorieComposant,
  Client,
  Composant,
  Emplacement,
  Produit,
  RecetteComposant,
} from "@/lib/supabase/database.types";
import { SaleComposer } from "./SaleComposer";

export const metadata = { title: "Saisie de vente — Atelier ALM" };

/**
 * Saisie de vente — LA source de vérité transactionnelle (Contrat §01).
 * Lit le référentiel (catalogue par canal, emplacements, clients) et écrit
 * vente + lignes + composants via l'action serveur. occurred_at est capturé
 * à l'encaissement ; le fulfillment dérive du mode_vente SAISI (pas du canal).
 */
export default async function SalePage() {
  const m = SCREEN_META.sale;
  let produits: Produit[] = [];
  let composants: Composant[] = [];
  let emplacements: Emplacement[] = [];
  let clients: Client[] = [];
  let canalInitial: Canal | null = null;
  const compositionParProduit: Record<string, Partial<Record<CategorieComposant, string>>> = {};

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const [p, c, e, cl, rc] = await Promise.all([
      supabase.from("produit").select("*").eq("actif", true).order("nom"),
      supabase.from("composant").select("*").eq("actif", true).order("nom"),
      supabase.from("emplacement").select("*").eq("actif", true).order("jour_semaine"),
      supabase.from("client").select("*").eq("actif", true).order("nom"),
      supabase.from("recette_composant").select("*"),
    ]);
    produits = p.data ?? [];
    composants = c.data ?? [];
    emplacements = e.data ?? [];
    clients = cl.data ?? [];

    // Préférence PERSONNELLE : canal présélectionné à l'ouverture (« ask » = rien).
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: pref } = await supabase
        .from("user_preference")
        .select("canal_defaut")
        .eq("profil_id", user.id)
        .maybeSingle();
      if (pref && pref.canal_defaut !== "ask") canalInitial = pref.canal_defaut as Canal;
    }

    // Composition signature d'un bowl = 1er composant de chaque catégorie de sa fiche.
    const lignesParRecette = new Map<string, RecetteComposant[]>();
    for (const l of (rc.data ?? []) as RecetteComposant[]) {
      const arr = lignesParRecette.get(l.recette_id) ?? [];
      arr.push(l);
      lignesParRecette.set(l.recette_id, arr);
    }
    for (const produit of produits) {
      if (!produit.is_bowl || !produit.recette_id) continue;
      const composition: Partial<Record<CategorieComposant, string>> = {};
      for (const l of lignesParRecette.get(produit.recette_id) ?? []) {
        if (!composition[l.categorie]) composition[l.categorie] = l.composant_id;
      }
      compositionParProduit[produit.id] = composition;
    }
  }

  // Jour de semaine 1=lundi…7=dimanche en Europe/Paris (badge « AUJ. » des emplacements).
  const dayName = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "Europe/Paris" }).format(new Date());
  const jourSemaineAuj =
    ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].indexOf(dayName) + 1;

  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      <SaleComposer
        canalInitial={canalInitial}
        produits={produits}
        composants={composants}
        emplacements={emplacements}
        clients={clients}
        compositionParProduit={compositionParProduit}
        jourSemaineAuj={jourSemaineAuj}
      />
    </>
  );
}
