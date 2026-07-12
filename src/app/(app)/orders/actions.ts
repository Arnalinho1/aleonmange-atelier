"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Fulfillment, RecetteComposant, VenteLigneComposant } from "@/lib/supabase/database.types";
import { deplierLigneEnGrammes, grammesVersUnite, type ContexteDepliage } from "@/lib/stock";

export type OrderActionState = { error?: string; ok?: boolean } | undefined;

/** Cycle strict — on n'avance que d'UNE étape à la fois (Contrat §01). */
const ETAPE_SUIVANTE: Partial<Record<Fulfillment, Fulfillment>> = {
  a_produire: "en_prod",
  en_prod: "pret",
  pret: "remis",
};

/**
 * Fait avancer le fulfillment d'une commande — vraie mutation, répercutée
 * partout : la commande quitte v_commande_ouverte à « remis » et entre alors
 * dans le CA (v_vente_remise). Chaque transition est journalisée dans
 * fulfillment_event (source des cadences de Productivité).
 *
 * B8 : au passage à « remis », le RÉSERVÉ (dynamique) devient du CONSOMMÉ —
 * les sorties de stock réelles s'écrivent ICI, une seule fois (la garde de
 * concurrence sur l'update vérifie qu'on a bien réalisé la transition).
 */
export async function avancerFulfillment(venteId: string): Promise<OrderActionState> {
  if (!venteId) return { error: "Commande introuvable." };

  const supabase = await createClient();
  const { data: vente, error: venteError } = await supabase
    .from("vente")
    .select("id, fulfillment, mode_vente")
    .eq("id", venteId)
    .maybeSingle();
  if (venteError) return { error: venteError.message };
  if (!vente) return { error: "Commande introuvable." };
  if (vente.mode_vente !== "precommande") return { error: "Une vente instantanée est déjà remise." };

  const vers = ETAPE_SUIVANTE[vente.fulfillment];
  if (!vers) return { error: "Cette commande est déjà remise." };

  const { data: transition, error: updateError } = await supabase
    .from("vente")
    .update({ fulfillment: vers })
    .eq("id", venteId)
    .eq("fulfillment", vente.fulfillment) // garde-fou concurrence : n'avance que depuis l'état lu
    .select("id");
  if (updateError) return { error: updateError.message };
  if (!transition || transition.length === 0)
    return { error: "La commande a déjà été avancée (rafraîchissez la file)." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error: eventError } = await supabase.from("fulfillment_event").insert({
    vente_id: venteId,
    de: vente.fulfillment,
    vers,
    operateur_id: user?.id ?? null,
  });
  if (eventError) return { error: eventError.message };

  // ── CONSOMMÉ (B8) : sorties réelles à la remise. La garde ci-dessus assure
  // l'écriture UNE SEULE FOIS (une seule requête réalise pret → remis).
  if (vers === "remis") {
    const erreurSortie = await ecrireSortiesConsommation(supabase, venteId);
    if (erreurSortie) return { error: `Commande remise, mais sorties de stock non écrites : ${erreurSortie}` };
  }

  revalidatePath("/orders");
  return { ok: true };
}

/** Déplie les lignes de la vente (lib partagée) et journalise les sorties. */
async function ecrireSortiesConsommation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  venteId: string
): Promise<string | null> {
  const { data: lignes, error: ligneError } = await supabase
    .from("vente_ligne")
    .select("*")
    .eq("vente_id", venteId);
  if (ligneError) return ligneError.message;
  if (!lignes || lignes.length === 0) return null;

  const ligneIds = lignes.map((l) => l.id);
  const produitIds = [...new Set(lignes.map((l) => l.produit_id).filter((x): x is string => x != null))];
  const [{ data: vlc, error: vlcError }, { data: produits, error: prodError }] = await Promise.all([
    supabase.from("vente_ligne_composant").select("*").in("ligne_id", ligneIds),
    produitIds.length
      ? supabase.from("produit").select("id, recette_id, is_bowl, mode").in("id", produitIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (vlcError) return vlcError.message;
  if (prodError) return prodError.message;

  const recetteIds = [...new Set((produits ?? []).map((x) => x.recette_id).filter((x): x is string => x != null))];
  const [{ data: recettes, error: recError }, { data: fiches, error: ficheError }] = recetteIds.length
    ? await Promise.all([
        supabase.from("recette").select("id, rendement").in("id", recetteIds),
        supabase.from("recette_composant").select("*").in("recette_id", recetteIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (recError) return recError.message;
  if (ficheError) return ficheError.message;

  const fichesParRecette = new Map<string, RecetteComposant[]>();
  for (const f of (fiches ?? []) as RecetteComposant[]) {
    const arr = fichesParRecette.get(f.recette_id) ?? [];
    arr.push(f);
    fichesParRecette.set(f.recette_id, arr);
  }
  const vlcParLigne = new Map<string, VenteLigneComposant[]>();
  for (const c of (vlc ?? []) as VenteLigneComposant[]) {
    const arr = vlcParLigne.get(c.ligne_id) ?? [];
    arr.push(c);
    vlcParLigne.set(c.ligne_id, arr);
  }
  const ctx: ContexteDepliage = {
    produitParId: new Map((produits ?? []).map((x) => [x.id, x])),
    recetteParId: new Map((recettes ?? []).map((x) => [x.id, x])),
    fichesParRecette,
  };

  const totaux = new Map<string, number>();
  for (const l of lignes) {
    const dep = deplierLigneEnGrammes({ ...l, composants: vlcParLigne.get(l.id) ?? [] }, ctx);
    for (const [cid, g] of dep) totaux.set(cid, (totaux.get(cid) ?? 0) + g);
  }
  if (totaux.size === 0) return null;

  const { data: compStock, error: compError } = await supabase
    .from("composant")
    .select("id, unite, poids_piece_g")
    .in("id", [...totaux.keys()]);
  if (compError) return compError.message;
  const unites = new Map((compStock ?? []).map((x) => [x.id, x]));

  const occurredAt = new Date().toISOString(); // instant de REMISE
  const sorties = [];
  for (const [cid, g] of totaux) {
    const comp = unites.get(cid);
    if (!comp) continue;
    const q = grammesVersUnite(comp, g); // pièce sans poids → null, signalé sur Stocks
    if (q == null) continue;
    const arrondie = Math.round(q * 100) / 100;
    if (arrondie <= 0) continue;
    sorties.push({ composant_id: cid, type: "sortie", quantite: -arrondie, note: "Consommation vente", occurred_at: occurredAt });
  }
  if (sorties.length === 0) return null;

  const { error: sortieError } = await supabase.from("mouvement_stock").insert(sorties);
  return sortieError ? sortieError.message : null;
}
