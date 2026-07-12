import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { FulfillmentEvent, Vente, VenteLigne } from "@/lib/supabase/database.types";
import { Gauge } from "lucide-react";
import { ProductivityBoard, type CycleCommande } from "./ProductivityBoard";

export const metadata = { title: "Productivité — Atelier ALM" };

/**
 * Productivité — lit fulfillment_event (transitions horodatées écrites par
 * Commandes du jour) : cadences réelles, jamais simulées. Les temps
 * théoriques par fiche et la MO arrivent avec les lots (Phase 4).
 */
export default async function ProductivityPage() {
  const m = SCREEN_META.productivity;
  let cycles: CycleCommande[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const maintenant = new Date();
    const depuis = new Date(maintenant.getTime() - 90 * 86400000).toISOString();
    const { data: ev } = await supabase
      .from("fulfillment_event")
      .select("*")
      .gte("occurred_at", depuis)
      .order("occurred_at", { ascending: true });
    const events = (ev ?? []) as FulfillmentEvent[];

    if (events.length > 0) {
      const venteIds = [...new Set(events.map((e) => e.vente_id))];
      const [v, l] = await Promise.all([
        supabase.from("vente").select("id, canal, occurred_at").in("id", venteIds),
        supabase.from("vente_ligne").select("vente_id, qte").in("vente_id", venteIds),
      ]);
      const ventes = new Map(((v.data ?? []) as Pick<Vente, "id" | "canal" | "occurred_at">[]).map((x) => [x.id, x]));
      const portions = new Map<string, number>();
      for (const li of (l.data ?? []) as Pick<VenteLigne, "vente_id" | "qte">[]) {
        portions.set(li.vente_id, (portions.get(li.vente_id) ?? 0) + (li.qte ?? 1));
      }

      const parVente = new Map<string, CycleCommande>();
      for (const e of events) {
        const vente = ventes.get(e.vente_id);
        if (!vente) continue;
        const cur =
          parVente.get(e.vente_id) ??
          ({
            vente_id: e.vente_id,
            canal: vente.canal,
            portions: portions.get(e.vente_id) ?? 1,
            saisie: vente.occurred_at,
            en_prod: null,
            pret: null,
            remis: null,
          } as CycleCommande);
        if (e.vers === "en_prod") cur.en_prod = e.occurred_at;
        if (e.vers === "pret") cur.pret = e.occurred_at;
        if (e.vers === "remis") cur.remis = e.occurred_at;
        parVente.set(e.vente_id, cur);
      }
      cycles = [...parVente.values()].sort((a, b) => (b.remis ?? b.saisie).localeCompare(a.remis ?? a.saisie));
    }
  }

  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      {cycles.length === 0 ? (
        <EmptyState
          icon={<Gauge size={30} strokeWidth={1.6} />}
          titre="Aucune production mesurée"
          message="Les cadences se mesurent sur les transitions réelles des Commandes du jour (à produire → en prod → prêt → remis). Aucune moyenne sur zéro."
        />
      ) : (
        <ProductivityBoard cycles={cycles} />
      )}
    </>
  );
}
