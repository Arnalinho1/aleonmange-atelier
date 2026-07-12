import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Emplacement, Vente, VenteLigne } from "@/lib/supabase/database.types";
import { History } from "lucide-react";
import { HistoryList, type VenteRemise } from "./HistoryList";

export const metadata = { title: "Historique des ventes — Atelier ALM" };

/**
 * Historique — lit v_vente_remise, LA même source que Finances (HANDOFF §03 :
 * le CA n'est compté qu'une fois, sur fulfillment=remis). Lecture seule.
 * Les ventes issues de l'import caisse portent le badge « Import ».
 */
export default async function HistoryPage() {
  const m = SCREEN_META.history;
  let ventes: VenteRemise[] = [];
  let emplacements: Emplacement[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const [v, e] = await Promise.all([
      supabase.from("v_vente_remise").select("*").order("occurred_at", { ascending: false }),
      supabase.from("emplacement").select("*").eq("actif", true).order("jour_semaine"),
    ]);
    emplacements = e.data ?? [];
    const remises = (v.data ?? []) as Omit<Vente, "fulfillment" | "created_at">[];

    if (remises.length > 0) {
      const ids = remises.map((x) => x.id);
      const clientIds = [...new Set(remises.map((x) => x.client_id).filter(Boolean))] as string[];
      const [l, cl] = await Promise.all([
        supabase.from("vente_ligne").select("*").in("vente_id", ids),
        clientIds.length
          ? supabase.from("client").select("id, nom").in("id", clientIds)
          : Promise.resolve({ data: [] }),
      ]);
      const lignes = (l.data ?? []) as VenteLigne[];
      const clientParId = new Map((cl.data ?? []).map((x) => [x.id, x.nom]));

      const ligneIds = lignes.map((x) => x.id);
      const { data: vlc } = ligneIds.length
        ? await supabase
            .from("vente_ligne_composant")
            .select("ligne_id, categorie, composant(nom)")
            .in("ligne_id", ligneIds)
        : { data: [] };
      const compsParLigne = new Map<string, { nom: string; categorie: string }[]>();
      for (const row of (vlc ?? []) as { ligne_id: string; categorie: string; composant: { nom: string } | null }[]) {
        const arr = compsParLigne.get(row.ligne_id) ?? [];
        arr.push({ nom: row.composant?.nom ?? "Composant retiré", categorie: row.categorie });
        compsParLigne.set(row.ligne_id, arr);
      }

      const fmtJour = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });
      const fmtHeure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

      ventes = remises.map((x) => {
        const d = new Date(x.occurred_at);
        return {
          id: x.id,
          occurred_at: x.occurred_at,
          jour: fmtJour.format(d),
          heure: fmtHeure.format(d),
          canal: x.canal,
          emplacement_id: x.emplacement_id,
          moyen_paiement: x.moyen_paiement,
          montant_total: x.montant_total,
          source_vente: x.source_vente,
          client_nom: x.client_id ? clientParId.get(x.client_id) ?? null : null,
          lignes: lignes
            .filter((li) => li.vente_id === x.id)
            .map((li) => ({
              libelle: li.libelle,
              qte: li.qte,
              poids_g: li.poids_g,
              montant: li.montant,
              composants: compsParLigne.get(li.id) ?? [],
            })),
        };
      });
    }
  }

  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      {ventes.length === 0 ? (
        <EmptyState
          icon={<History size={30} strokeWidth={1.6} />}
          titre="Aucune vente enregistrée"
          message="Les ventes remises apparaîtront ici, groupées par jour, avec leurs KPI (CA, nombre, panier moyen). Même source que Finances — jamais de recompte parallèle."
        />
      ) : (
        <HistoryList ventes={ventes} emplacements={emplacements} />
      )}
    </>
  );
}
