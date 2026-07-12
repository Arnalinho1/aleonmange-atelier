import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { enLots } from "@/lib/supabase/lots";
import { coutMatiereLigneVente, tempsProductionLigne } from "@/lib/calculs";
import type { LigneProduction, VenteProduction } from "@/lib/productivite";
import type { ContexteDepliage } from "@/lib/stock";
import type {
  Composant,
  Emplacement,
  FulfillmentEvent,
  Produit,
  Recette,
  RecetteComposant,
  Vente,
  VenteLigne,
  VenteLigneComposant,
} from "@/lib/supabase/database.types";
import { Gauge } from "lucide-react";
import { ProductivityBoard, type CycleCommande } from "./ProductivityBoard";

export const metadata = { title: "Productivité — Atelier ALM" };

/**
 * Productivité — deux natures de mesure, tous canaux :
 * · CHARGE DE PRODUCTION du vendu (ventes remises 90 j — même périmètre que
 *   le CA) : rythme (occurred_at réel), coût matière consommé (primitive
 *   coutMatiereLigneVente de calculs.ts, PARTAGÉE avec Finances) et temps
 *   estimé (temps_prepa_min des fiches — déclaratif, tag Estimé).
 * · CYCLE DE COMMANDE (fulfillment_event) : cadences réelles des
 *   précommandes — inchangé.
 */
export default async function ProductivityPage() {
  const m = SCREEN_META.productivity;
  let cycles: CycleCommande[] = [];
  let ventesProduction: VenteProduction[] = [];
  let lignesProduction: LigneProduction[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const maintenant = new Date();
    const depuis = new Date(maintenant.getTime() - 90 * 86400000).toISOString();

    const [ev, vr, p, r, rc, c, e] = await Promise.all([
      supabase.from("fulfillment_event").select("*").gte("occurred_at", depuis).order("occurred_at", { ascending: true }),
      supabase.from("v_vente_remise").select("*").gte("occurred_at", depuis),
      supabase.from("produit").select("*"),
      supabase.from("recette").select("*"),
      supabase.from("recette_composant").select("*"),
      supabase.from("composant").select("*"),
      supabase.from("emplacement").select("*"),
    ]);

    // ── Charge de production : ventes remises dépliées ligne à ligne.
    const remises = (vr.data ?? []) as Omit<Vente, "fulfillment" | "created_at">[];
    const emplacementParId = new Map(((e.data ?? []) as Emplacement[]).map((x) => [x.id, x.libelle]));
    ventesProduction = remises.map((v) => ({
      id: v.id,
      canal: v.canal,
      occurred_at: v.occurred_at,
      emplacement: v.emplacement_id ? emplacementParId.get(v.emplacement_id) ?? null : null,
      source_vente: v.source_vente,
    }));

    if (remises.length > 0) {
      const lignes = (await enLots(remises.map((x) => x.id), (lot) =>
        supabase.from("vente_ligne").select("*").in("vente_id", lot)
      )) as VenteLigne[];
      const vlc = await enLots<VenteLigneComposant>(
        lignes.map((l) => l.id),
        (lot) => supabase.from("vente_ligne_composant").select("*").in("ligne_id", lot)
      );

      const prodParId = new Map(((p.data ?? []) as Produit[]).map((x) => [x.id, x]));
      const recetteParId = new Map(((r.data ?? []) as Recette[]).map((x) => [x.id, x]));
      const compParId = new Map(((c.data ?? []) as Composant[]).map((x) => [x.id, x]));
      const fichesParRecette = new Map<string, RecetteComposant[]>();
      for (const li of (rc.data ?? []) as RecetteComposant[]) {
        const arr = fichesParRecette.get(li.recette_id) ?? [];
        arr.push(li);
        fichesParRecette.set(li.recette_id, arr);
      }
      const vlcParLigne = new Map<string, VenteLigneComposant[]>();
      for (const x of vlc) {
        const arr = vlcParLigne.get(x.ligne_id) ?? [];
        arr.push(x);
        vlcParLigne.set(x.ligne_id, arr);
      }
      const ctx: ContexteDepliage = { produitParId: prodParId, recetteParId, fichesParRecette };
      const canalParVente = new Map(remises.map((v) => [v.id, v.canal]));

      lignesProduction = lignes.map((li) => {
        const produit = li.produit_id ? prodParId.get(li.produit_id) : undefined;
        const avecComposants = { ...li, composants: vlcParLigne.get(li.id) ?? [] };
        return {
          vente_id: li.vente_id,
          canal: canalParVente.get(li.vente_id)!,
          montant: li.montant,
          cout: coutMatiereLigneVente(avecComposants, ctx, compParId, produit)?.cout ?? null,
          temps: tempsProductionLigne(li, produit, recetteParId, fichesParRecette),
        };
      });
    }

    // ── Cycle de commande (existant) : transitions réelles des précommandes.
    const events = (ev.data ?? []) as FulfillmentEvent[];
    if (events.length > 0) {
      const venteIds = [...new Set(events.map((x) => x.vente_id))];
      const [v, l] = await Promise.all([
        enLots(venteIds, (lot) => supabase.from("vente").select("id, canal, occurred_at").in("id", lot)),
        enLots(venteIds, (lot) => supabase.from("vente_ligne").select("vente_id, qte").in("vente_id", lot)),
      ]);
      const ventes = new Map((v as Pick<Vente, "id" | "canal" | "occurred_at">[]).map((x) => [x.id, x]));
      const portions = new Map<string, number>();
      for (const li of l as Pick<VenteLigne, "vente_id" | "qte">[]) {
        portions.set(li.vente_id, (portions.get(li.vente_id) ?? 0) + (li.qte ?? 1));
      }

      const parVente = new Map<string, CycleCommande>();
      for (const x of events) {
        const vente = ventes.get(x.vente_id);
        if (!vente) continue;
        const cur =
          parVente.get(x.vente_id) ??
          ({
            vente_id: x.vente_id,
            canal: vente.canal,
            portions: portions.get(x.vente_id) ?? 1,
            saisie: vente.occurred_at,
            en_prod: null,
            pret: null,
            remis: null,
          } as CycleCommande);
        if (x.vers === "en_prod") cur.en_prod = x.occurred_at;
        if (x.vers === "pret") cur.pret = x.occurred_at;
        if (x.vers === "remis") cur.remis = x.occurred_at;
        parVente.set(x.vente_id, cur);
      }
      cycles = [...parVente.values()].sort((a, b) => (b.remis ?? b.saisie).localeCompare(a.remis ?? a.saisie));
    }
  }

  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      {cycles.length === 0 && ventesProduction.length === 0 ? (
        <EmptyState
          icon={<Gauge size={30} strokeWidth={1.6} />}
          titre="Aucune production mesurée"
          message="La charge de production se mesure sur les ventes remises (rythme, coût matière, temps estimé) et les cadences sur les transitions réelles des Commandes du jour. Aucune moyenne sur zéro."
        />
      ) : (
        <ProductivityBoard cycles={cycles} ventes={ventesProduction} lignes={lignesProduction} />
      )}
    </>
  );
}
