import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { enLots } from "@/lib/supabase/lots";
import { coutMatiereLigneVente } from "@/lib/calculs";
import type { ContexteDepliage } from "@/lib/stock";
import type {
  Canal,
  Composant,
  ParametreRentabilite,
  Produit,
  Recette,
  RecetteComposant,
  Vente,
  VenteLigne,
  VenteLigneComposant,
} from "@/lib/supabase/database.types";
import { Wallet } from "lucide-react";
import {
  FinanceBoard,
  type AttenteReglement,
  type EncaissementFinance,
  type LigneFinance,
  type VenteFinance,
} from "./FinanceBoard";

export const metadata = { title: "Finances — Atelier ALM" };

/**
 * Finances — lit v_vente_remise, LA MÊME source que l'Historique (HANDOFF
 * §03 : un calcul, plusieurs vues). Le coût matière d'une ligne vient de
 * coutMatiereLigneVente (source unique calculs.ts, partagée avec
 * Productivité) : dépliage B8 des fiches — bowls libres inclus via leurs
 * composants réels, lignes au poids au prorata — et cout_achat pour les
 * revendus. cout NULL = non couvert (jamais un faux zéro).
 */
export default async function FinancePage() {
  const m = SCREEN_META.finance;
  let ventes: VenteFinance[] = [];
  let lignesOut: LigneFinance[] = [];
  let encaissements: EncaissementFinance[] = [];
  let enAttente: AttenteReglement[] = [];
  let parametres: ParametreRentabilite | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const maintenant = new Date();
    const depuis = new Date(maintenant.getTime() - 90 * 86400000).toISOString();
    const [v, p, r, rc, c, params, enc, attente] = await Promise.all([
      supabase.from("v_vente_remise").select("*").gte("occurred_at", depuis).order("occurred_at", { ascending: false }),
      supabase.from("produit").select("*"),
      supabase.from("recette").select("*"),
      supabase.from("recette_composant").select("*"),
      supabase.from("composant").select("*"),
      supabase.from("parametre_rentabilite").select("*").maybeSingle(),
      // CA ENCAISSÉ — source unique v_encaissement (0018), imputé à encaisse_le.
      supabase.from("v_encaissement").select("*").gte("encaisse_le", depuis).order("encaisse_le", { ascending: false }),
      // Créances en cours (traiteur B2B) — hors fenêtre de période : une créance reste due.
      supabase.from("vente").select("id, canal, montant_total, statut_paiement, echeance_paiement, due_at, fulfillment, client_id").in("statut_paiement", ["du", "partiel"]).order("echeance_paiement", { ascending: true, nullsFirst: false }),
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

    encaissements = ((enc.data ?? []) as { id: string; encaisse_le: string; canal: Canal; montant: number }[]).map((x) => ({
      id: x.id,
      encaisse_le: x.encaisse_le,
      canal: x.canal,
      montant: Number(x.montant),
    }));

    const creances = (attente.data ?? []) as Pick<Vente, "id" | "canal" | "montant_total" | "statut_paiement" | "echeance_paiement" | "due_at" | "fulfillment" | "client_id">[];
    if (creances.length > 0) {
      const clientIds = [...new Set(creances.map((x) => x.client_id).filter((x): x is string => x != null))];
      const [{ data: clients }, { data: regles }] = await Promise.all([
        clientIds.length ? supabase.from("client").select("id, nom").in("id", clientIds) : { data: [] },
        supabase.from("reglement").select("vente_id, montant").in("vente_id", creances.map((x) => x.id)),
      ]);
      const nomParClient = new Map((clients ?? []).map((x) => [x.id, x.nom]));
      const reglePar = new Map<string, number>();
      for (const reg of (regles ?? []) as { vente_id: string; montant: number }[]) {
        reglePar.set(reg.vente_id, (reglePar.get(reg.vente_id) ?? 0) + Number(reg.montant));
      }
      enAttente = creances.map((x) => ({
        id: x.id,
        canal: x.canal,
        client_nom: x.client_id ? nomParClient.get(x.client_id) ?? null : null,
        montant_total: Number(x.montant_total),
        restant: Math.round((Number(x.montant_total) - (reglePar.get(x.id) ?? 0)) * 100) / 100,
        statut_paiement: x.statut_paiement,
        echeance_paiement: x.echeance_paiement,
        livree: x.fulfillment === "remis",
      }));
    }

    if (remises.length > 0) {
      const lignes = (await enLots(remises.map((x) => x.id), (lot) =>
        supabase.from("vente_ligne").select("*").in("vente_id", lot)
      )) as VenteLigne[];
      // Composants dépliés des bowls (grammes figés à l'encaissement — B8).
      const vlc = await enLots<VenteLigneComposant>(
        lignes.map((l) => l.id),
        (lot) => supabase.from("vente_ligne_composant").select("*").in("ligne_id", lot)
      );

      const recetteParId = new Map(((r.data ?? []) as Recette[]).map((x) => [x.id, x]));
      const compParId = new Map(((c.data ?? []) as Composant[]).map((x) => [x.id, x]));
      const prodParId = new Map(((p.data ?? []) as Produit[]).map((x) => [x.id, x]));
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

      lignesOut = lignes.map((li) => {
        const produit = li.produit_id ? prodParId.get(li.produit_id) : undefined;
        const cout = coutMatiereLigneVente(
          { ...li, composants: vlcParLigne.get(li.id) ?? [] },
          ctx,
          compParId,
          produit
        );
        return {
          vente_id: li.vente_id,
          libelle: li.libelle,
          qte: li.qte,
          montant: li.montant,
          cout: cout?.cout ?? null,
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
        <FinanceBoard ventes={ventes} lignes={lignesOut} encaissements={encaissements} enAttente={enAttente} parametres={parametres} />
      )}
    </>
  );
}
