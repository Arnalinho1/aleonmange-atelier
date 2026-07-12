import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Composant, Lot, MouvementStock, ReapproLigne, SeuilStock } from "@/lib/supabase/database.types";
import { Boxes } from "lucide-react";
import { StockBoard, type StockComposant } from "./StockBoard";

export const metadata = { title: "Stocks & traçabilité — Atelier ALM" };

/**
 * Stocks — le stock d'un composant = Σ mouvement_stock.quantite (signée :
 * réception +, sortie −, ajustement ±). Lots + DLC pour la rotation FEFO.
 * Le référentiel composant vient de Recettes ; sans référentiel, pas
 * d'alerte fantôme (HANDOFF §02).
 */
export default async function StockPage() {
  const m = SCREEN_META.stock;
  let lignes: StockComposant[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const [c, mv, lo, se, re] = await Promise.all([
      supabase.from("composant").select("*").eq("actif", true).order("nom"),
      supabase.from("mouvement_stock").select("*"),
      supabase.from("lot").select("*"),
      supabase.from("seuil_stock").select("*"),
      supabase.from("reappro_ligne").select("*"),
    ]);
    const composants = (c.data ?? []) as Composant[];
    const mouvements = (mv.data ?? []) as MouvementStock[];
    const lots = (lo.data ?? []) as Lot[];
    const seuils = new Map(((se.data ?? []) as SeuilStock[]).map((x) => [x.composant_id, x.seuil_bas]));
    const reappros = new Map(((re.data ?? []) as ReapproLigne[]).map((x) => [x.composant_id, x]));

    const stockParComposant = new Map<string, number>();
    for (const mvt of mouvements) {
      stockParComposant.set(mvt.composant_id, (stockParComposant.get(mvt.composant_id) ?? 0) + Number(mvt.quantite));
    }
    const lotsParComposant = new Map<string, Lot[]>();
    for (const lot of lots) {
      const arr = lotsParComposant.get(lot.composant_id) ?? [];
      arr.push(lot);
      lotsParComposant.set(lot.composant_id, arr);
    }

    lignes = composants.map((composant) => ({
      composant,
      stock: Math.round((stockParComposant.get(composant.id) ?? 0) * 1000) / 1000,
      seuil: seuils.get(composant.id) != null ? Number(seuils.get(composant.id)) : null,
      lots: lotsParComposant.get(composant.id) ?? [],
      reappro: reappros.get(composant.id) ?? null,
    }));
  }

  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      {lignes.length === 0 ? (
        <EmptyState
          icon={<Boxes size={30} strokeWidth={1.6} />}
          titre="Aucun article en stock"
          message="L'inventaire suit les composants du référentiel (créés dans Recettes & plats). Sans référentiel, aucune alerte fantôme — créez d'abord vos composants."
          cta={{ label: "Aller aux Recettes", href: "/recipes" }}
        />
      ) : (
        <StockBoard lignes={lignes} />
      )}
    </>
  );
}
