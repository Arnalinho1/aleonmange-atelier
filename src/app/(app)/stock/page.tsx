import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { enLots } from "@/lib/supabase/lots";
import { deplierLigneEnGrammes, grammesVersUnite, type ContexteDepliage } from "@/lib/stock";
import type {
  Composant,
  Lot,
  MouvementStock,
  ReapproLigne,
  RecetteComposant,
  SeuilStock,
  Vente,
  VenteLigne,
  VenteLigneComposant,
} from "@/lib/supabase/database.types";
import { Boxes } from "lucide-react";
import { StockBoard, type StockComposant } from "./StockBoard";

export const metadata = { title: "Stocks & traçabilité — Atelier ALM" };

/**
 * Stocks — trois nombres par composant (B8) :
 * · PHYSIQUE = Σ mouvement_stock.quantite (réception +, sortie −, ajustement ±)
 * · RÉSERVÉ = commandes ouvertes (v_commande_ouverte) dépliées en grammes via
 *   la lib partagée — calcul DYNAMIQUE, aucun mouvement, toujours juste.
 * · DISPONIBLE = physique − réservé → porte le statut ET la liste À racheter.
 * Lots + DLC pour la rotation FEFO. Le référentiel composant vient de
 * Recettes ; sans référentiel, pas d'alerte fantôme (HANDOFF §02).
 */
export default async function StockPage() {
  const m = SCREEN_META.stock;
  let lignes: StockComposant[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const [c, mv, lo, se, re, vo] = await Promise.all([
      supabase.from("composant").select("*").eq("actif", true).order("nom"),
      supabase.from("mouvement_stock").select("*"),
      supabase.from("lot").select("*"),
      supabase.from("seuil_stock").select("*"),
      supabase.from("reappro_ligne").select("*"),
      supabase.from("v_commande_ouverte").select("*"),
    ]);
    const composants = (c.data ?? []) as Composant[];
    const mouvements = (mv.data ?? []) as MouvementStock[];
    const lots = (lo.data ?? []) as Lot[];
    const seuils = new Map(((se.data ?? []) as SeuilStock[]).map((x) => [x.composant_id, x.seuil_bas]));
    const reappros = new Map(((re.data ?? []) as ReapproLigne[]).map((x) => [x.composant_id, x]));
    const ouvertes = (vo.data ?? []) as Vente[];

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

    // ── RÉSERVÉ : dépliage des commandes ouvertes (même lib que les sorties).
    const reserveG = new Map<string, number>();
    if (ouvertes.length > 0) {
      const venteIds = ouvertes.map((v) => v.id);
      const lignesVente = await enLots<VenteLigne>(venteIds, (lot) =>
        supabase.from("vente_ligne").select("*").in("vente_id", lot)
      );
      const vlc = await enLots<VenteLigneComposant>(
        lignesVente.map((l) => l.id),
        (lot) => supabase.from("vente_ligne_composant").select("*").in("ligne_id", lot)
      );
      const produitIds = [...new Set(lignesVente.map((l) => l.produit_id).filter((x): x is string => x != null))];
      const { data: produits } = produitIds.length
        ? await supabase.from("produit").select("id, recette_id, is_bowl, mode").in("id", produitIds)
        : { data: [] };
      const recetteIds = [...new Set((produits ?? []).map((x) => x.recette_id).filter((x): x is string => x != null))];
      const [{ data: recettes }, { data: fiches }] = recetteIds.length
        ? await Promise.all([
            supabase.from("recette").select("id, rendement").in("id", recetteIds),
            supabase.from("recette_composant").select("*").in("recette_id", recetteIds),
          ])
        : [{ data: [] }, { data: [] }];

      const fichesParRecette = new Map<string, RecetteComposant[]>();
      for (const f of (fiches ?? []) as RecetteComposant[]) {
        const arr = fichesParRecette.get(f.recette_id) ?? [];
        arr.push(f);
        fichesParRecette.set(f.recette_id, arr);
      }
      const vlcParLigne = new Map<string, VenteLigneComposant[]>();
      for (const x of vlc) {
        const arr = vlcParLigne.get(x.ligne_id) ?? [];
        arr.push(x);
        vlcParLigne.set(x.ligne_id, arr);
      }
      const ctx: ContexteDepliage = {
        produitParId: new Map((produits ?? []).map((x) => [x.id, x])),
        recetteParId: new Map((recettes ?? []).map((x) => [x.id, x])),
        fichesParRecette,
      };
      for (const l of lignesVente) {
        const dep = deplierLigneEnGrammes({ ...l, composants: vlcParLigne.get(l.id) ?? [] }, ctx);
        for (const [cid, g] of dep) reserveG.set(cid, (reserveG.get(cid) ?? 0) + g);
      }
    }

    lignes = composants.map((composant) => {
      const stock = Math.round((stockParComposant.get(composant.id) ?? 0) * 1000) / 1000;
      const engageG = reserveG.get(composant.id) ?? 0;
      // Pièce sans poids : grammes engagés inconvertibles → réservé inconnu (null).
      const reserve = engageG > 0 ? grammesVersUnite(composant, engageG) : 0;
      const disponible = Math.round((stock - (reserve ?? 0)) * 1000) / 1000;
      return {
        composant,
        stock,
        reserve,
        disponible,
        seuil: seuils.get(composant.id) != null ? Number(seuils.get(composant.id)) : null,
        lots: lotsParComposant.get(composant.id) ?? [],
        reappro: reappros.get(composant.id) ?? null,
      };
    });
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
