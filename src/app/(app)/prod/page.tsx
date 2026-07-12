import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { enLots } from "@/lib/supabase/lots";
import type {
  Composant,
  Emplacement,
  Lot,
  Produit,
  Recette,
  RecetteComposant,
  Vente,
} from "@/lib/supabase/database.types";
import { Factory } from "lucide-react";
import { ProdBoard, type LigneVendue } from "./ProdBoard";

export const metadata = { title: "Production — Atelier ALM" };

/**
 * Production — CORRECTIF MÉTIER (12/07/2026) : on ne produit pas des
 * ingrédients, on produit des PRODUITS TRANSFORMÉS. La prévision agrège les
 * ventes remises 7 j PAR PRODUIT FABRIQUÉ (lib/plan.ts, source unique) ; les
 * matières premières deviennent un bloc DÉRIVÉ (plan × fiches). La règle
 * +10 % reste indicative (point ouvert #2).
 */
export default async function ProdPage() {
  const m = SCREEN_META.prod;
  let composants: Composant[] = [];
  let produits: Produit[] = [];
  let recettes: Recette[] = [];
  let lignesRecettes: RecetteComposant[] = [];
  let lignesVendues: LigneVendue[] = [];
  let composantsLibres: { ligne_id: string; composant_id: string }[] = [];
  let lotsDuJour: Lot[] = [];
  let emplacements: Emplacement[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const maintenant = new Date();
    const depuis = new Date(maintenant.getTime() - 7 * 86400000).toISOString();
    const aujourdhui = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(maintenant);
    const [c, p, r, rc, v, lo, e] = await Promise.all([
      supabase.from("composant").select("*").eq("actif", true).order("nom"),
      supabase.from("produit").select("*"),
      supabase.from("recette").select("*"),
      supabase.from("recette_composant").select("*"),
      supabase.from("v_vente_remise").select("*").gte("occurred_at", depuis),
      supabase.from("lot").select("*").eq("recu_le", aujourdhui).order("created_at", { ascending: false }),
      supabase.from("emplacement").select("*").eq("actif", true).order("jour_semaine"),
    ]);
    composants = (c.data ?? []) as Composant[];
    produits = (p.data ?? []) as Produit[];
    recettes = (r.data ?? []) as Recette[];
    lignesRecettes = (rc.data ?? []) as RecetteComposant[];
    lotsDuJour = (lo.data ?? []) as Lot[];
    emplacements = e.data ?? [];

    const remises = (v.data ?? []) as Omit<Vente, "fulfillment" | "created_at">[];
    if (remises.length > 0) {
      const venteParId = new Map(remises.map((x) => [x.id, x]));
      const lignes = await enLots(remises.map((x) => x.id), (lot) =>
        supabase
          .from("vente_ligne")
          .select("id, vente_id, produit_id, type, recette_id, qte, poids_g")
          .in("vente_id", lot)
      );
      lignesVendues = lignes.map((l) => {
        const vente = venteParId.get(l.vente_id)!;
        return {
          ligne_id: l.id,
          produit_id: l.produit_id,
          type: l.type,
          recette_id: l.recette_id,
          qte: l.qte,
          poids_g: l.poids_g,
          canal: vente.canal,
          emplacement_id: vente.emplacement_id,
        };
      });
      // Dépliage réel des bowls en composition LIBRE (composants comptés en portions)
      const lignesLibres = lignesVendues.filter((l) => l.type === "bowl" && l.recette_id == null);
      composantsLibres = (await enLots(lignesLibres.map((l) => l.ligne_id), (lot) =>
        supabase.from("vente_ligne_composant").select("ligne_id, composant_id").in("ligne_id", lot)
      )) as { ligne_id: string; composant_id: string }[];
    }
  }

  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      {composants.length === 0 && produits.length === 0 ? (
        <EmptyState
          icon={<Factory size={30} strokeWidth={1.6} />}
          titre="Pas encore d'historique pour prévoir"
          message="La prévision agrège les ventes remises par produit fabriqué. Créez d'abord vos fiches (Recettes & plats) et votre catalogue, puis enregistrez vos préparations ici."
          cta={{ label: "Aller aux Recettes", href: "/recipes" }}
        />
      ) : (
        <ProdBoard
          composants={composants}
          produits={produits}
          recettes={recettes}
          lignesRecettes={lignesRecettes}
          lignesVendues={lignesVendues}
          composantsLibres={composantsLibres}
          lotsDuJour={lotsDuJour}
          emplacements={emplacements}
        />
      )}
    </>
  );
}
