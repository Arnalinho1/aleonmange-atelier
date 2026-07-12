import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { coutPortionProduit } from "@/lib/calculs";
import type {
  Composant,
  ParametreRentabilite,
  Produit,
  Recette,
  RecetteComposant,
  Vente,
  VenteLigne,
} from "@/lib/supabase/database.types";
import { Wallet } from "lucide-react";
import { FinanceBoard, type LigneFinance, type VenteFinance } from "./FinanceBoard";

export const metadata = { title: "Finances — Atelier ALM" };

/**
 * Finances — lit v_vente_remise, LA MÊME source que l'Historique (HANDOFF
 * §03 : un calcul, plusieurs vues). Le coût matière d'une ligne dérive de la
 * fiche technique liée au produit (source unique lib/calculs.ts) — pour une
 * composition libre de bowl, la fiche du produit sert de proxy de coût.
 */
export default async function FinancePage() {
  const m = SCREEN_META.finance;
  let ventes: VenteFinance[] = [];
  let lignesOut: LigneFinance[] = [];
  let parametres: ParametreRentabilite | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const maintenant = new Date();
    const depuis = new Date(maintenant.getTime() - 90 * 86400000).toISOString();
    const [v, p, r, rc, c, params] = await Promise.all([
      supabase.from("v_vente_remise").select("*").gte("occurred_at", depuis).order("occurred_at", { ascending: false }),
      supabase.from("produit").select("*"),
      supabase.from("recette").select("*"),
      supabase.from("recette_composant").select("*"),
      supabase.from("composant").select("*"),
      supabase.from("parametre_rentabilite").select("*").maybeSingle(),
    ]);
    parametres = (params.data as ParametreRentabilite | null) ?? null;
    const remises = (v.data ?? []) as Omit<Vente, "fulfillment" | "created_at">[];

    const fmtJour = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });
    ventes = remises.map((x) => ({
      id: x.id,
      occurred_at: x.occurred_at,
      jour: fmtJour.format(new Date(x.occurred_at)),
      canal: x.canal,
      montant_total: x.montant_total,
      moyen_paiement: x.moyen_paiement,
      source_vente: x.source_vente,
    }));

    if (remises.length > 0) {
      const { data: l } = await supabase
        .from("vente_ligne")
        .select("*")
        .in("vente_id", remises.map((x) => x.id));
      const lignes = (l ?? []) as VenteLigne[];

      const recetteParId = new Map(((r.data ?? []) as Recette[]).map((x) => [x.id, x]));
      const compParId = new Map(((c.data ?? []) as Composant[]).map((x) => [x.id, x]));
      const prodParId = new Map(((p.data ?? []) as Produit[]).map((x) => [x.id, x]));
      const lignesParRecette = new Map<string, RecetteComposant[]>();
      for (const li of (rc.data ?? []) as RecetteComposant[]) {
        const arr = lignesParRecette.get(li.recette_id) ?? [];
        arr.push(li);
        lignesParRecette.set(li.recette_id, arr);
      }

      lignesOut = lignes.map((li) => {
        const produit = li.produit_id ? prodParId.get(li.produit_id) : undefined;
        const coutPortion = produit
          ? coutPortionProduit(produit, recetteParId, lignesParRecette, compParId)
          : null;
        return {
          vente_id: li.vente_id,
          libelle: li.libelle,
          qte: li.qte,
          montant: li.montant,
          cout: coutPortion != null ? coutPortion * (li.qte ?? 1) : null,
        };
      });
    }
  }

  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      {ventes.length === 0 ? (
        <EmptyState
          icon={<Wallet size={30} strokeWidth={1.6} />}
          titre="Pas de données sur la période"
          message="CA, coûts et marges (brute matière vs nette — libellés distincts) apparaîtront avec les ventes remises. Même source que l'Historique, jamais de recompte."
        />
      ) : (
        <FinanceBoard ventes={ventes} lignes={lignesOut} parametres={parametres} />
      )}
    </>
  );
}
