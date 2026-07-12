import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Emplacement, Vente, VenteLigne } from "@/lib/supabase/database.types";
import { TrendingUp } from "lucide-react";
import { SalesBoard, type LigneTendance, type VenteTendance } from "./SalesBoard";

export const metadata = { title: "Ventes & tendances — Atelier ALM" };

/**
 * Ventes & tendances — agrégats de v_vente_remise (dérivation, jamais une
 * source parallèle). Toute l'analytique temporelle lit occurred_at.
 */
export default async function SalesPage() {
  const m = SCREEN_META.sales;
  let ventes: VenteTendance[] = [];
  let lignes: LigneTendance[] = [];
  let emplacements: Emplacement[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const maintenant = new Date();
    const depuis = new Date(maintenant.getTime() - 90 * 86400000).toISOString();
    const [v, e] = await Promise.all([
      supabase.from("v_vente_remise").select("*").gte("occurred_at", depuis),
      supabase.from("emplacement").select("*").eq("actif", true).order("jour_semaine"),
    ]);
    emplacements = e.data ?? [];
    const remises = (v.data ?? []) as Omit<Vente, "fulfillment" | "created_at">[];

    const fmtJour = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });
    ventes = remises.map((x) => ({
      id: x.id,
      occurred_at: x.occurred_at,
      jour: fmtJour.format(new Date(x.occurred_at)),
      canal: x.canal,
      emplacement_id: x.emplacement_id,
      montant_total: x.montant_total,
    }));

    if (remises.length > 0) {
      const { data: l } = await supabase
        .from("vente_ligne")
        .select("vente_id, libelle, qte")
        .in("vente_id", remises.map((x) => x.id));
      lignes = ((l ?? []) as Pick<VenteLigne, "vente_id" | "libelle" | "qte">[]).map((x) => ({
        vente_id: x.vente_id,
        libelle: x.libelle,
        qte: x.qte,
      }));
    }
  }

  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      {ventes.length === 0 ? (
        <EmptyState
          icon={<TrendingUp size={30} strokeWidth={1.6} />}
          titre="Pas encore de tendance — revenez après quelques ventes"
          message="Courbes, matrice plat × canal et saisonnalité se construisent sur les ventes remises (occurred_at). Les axes vides sont gérés — jamais de graphe cassé."
        />
      ) : (
        <SalesBoard ventes={ventes} lignes={lignes} emplacements={emplacements} />
      )}
    </>
  );
}
