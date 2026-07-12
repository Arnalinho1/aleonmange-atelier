import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { enLots } from "@/lib/supabase/lots";
import type { Composant, Emplacement, Lot, Vente } from "@/lib/supabase/database.types";
import { Factory } from "lucide-react";
import { ProdBoard, type PortionComposant } from "./ProdBoard";

export const metadata = { title: "Production — Atelier ALM" };

/**
 * Production — prévision de demande (moyenne 7 j des ventes remises,
 * dépliées par composant, prisme ChanFilter) + plan du jour + lots.
 * La règle de prévision (+10 %) est INDICATIVE et affichée comme telle.
 */
export default async function ProdPage() {
  const m = SCREEN_META.prod;
  let composants: Composant[] = [];
  const portions: PortionComposant[] = [];
  let lotsDuJour: Lot[] = [];
  let emplacements: Emplacement[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const maintenant = new Date();
    const depuis = new Date(maintenant.getTime() - 7 * 86400000).toISOString();
    const aujourdhui = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(maintenant);
    const [c, v, lo, e] = await Promise.all([
      supabase.from("composant").select("*").eq("actif", true).order("nom"),
      supabase.from("v_vente_remise").select("*").gte("occurred_at", depuis),
      supabase.from("lot").select("*").eq("recu_le", aujourdhui).order("created_at", { ascending: false }),
      supabase.from("emplacement").select("*").eq("actif", true).order("jour_semaine"),
    ]);
    composants = (c.data ?? []) as Composant[];
    lotsDuJour = (lo.data ?? []) as Lot[];
    emplacements = e.data ?? [];

    const remises = (v.data ?? []) as Omit<Vente, "fulfillment" | "created_at">[];
    if (remises.length > 0) {
      const venteParId = new Map(remises.map((x) => [x.id, x]));
      const l = await enLots(remises.map((x) => x.id), (lot) =>
        supabase.from("vente_ligne").select("id, vente_id, qte").in("vente_id", lot)
      );
      const ligneParId = new Map(l.map((x) => [x.id, x]));
      const vlc = await enLots(l.map((x) => x.id), (lot) =>
        supabase.from("vente_ligne_composant").select("ligne_id, composant_id").in("ligne_id", lot)
      );

      for (const row of vlc as { ligne_id: string; composant_id: string }[]) {
        const ligne = ligneParId.get(row.ligne_id);
        const vente = ligne ? venteParId.get(ligne.vente_id) : undefined;
        if (!ligne || !vente) continue;
        portions.push({
          composant_id: row.composant_id,
          canal: vente.canal,
          emplacement_id: vente.emplacement_id,
          portions: ligne.qte ?? 1,
        });
      }
    }
  }

  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      {composants.length === 0 ? (
        <EmptyState
          icon={<Factory size={30} strokeWidth={1.6} />}
          titre="Pas encore d'historique pour prévoir"
          message="La prévision se construit sur les ventes remises dépliées par composant. Créez d'abord vos composants (Recettes & plats), puis enregistrez vos lots de production ici."
          cta={{ label: "Aller aux Recettes", href: "/recipes" }}
        />
      ) : (
        <ProdBoard composants={composants} portions={portions} lotsDuJour={lotsDuJour} emplacements={emplacements} />
      )}
    </>
  );
}
