"use server";

import { createClient } from "@/lib/supabase/server";
import type { Canal, ModeVente, Paiement, Origine } from "@/lib/supabase/database.types";

export type SaleFormState = { error?: string; ok?: boolean } | undefined;

/**
 * Panier envoyé par le composeur. Les montants ne sont PAS pris du client :
 * ils sont recalculés ici depuis les prix en base (source de vérité).
 * - produit : qte (unite) ou poids_g (poids)
 * - bowl    : produit is_bowl + 4 composants ; composition_libre=true si les
 *   composants dévient de la fiche signature → recette_id NULL (dépliage sans
 *   parent, reco Contrat §02 adoptée par défaut — POINT OUVERT #5 signalé).
 */
type PanierLigne = {
  produit_id: string;
  qte?: number;
  poids_g?: number;
  composants?: string[]; // ids composant (bowl uniquement)
  composition_libre?: boolean;
};

type Payload = {
  canal: Canal;
  mode_vente: ModeVente;
  emplacement_id: string | null;
  client_id: string | null;
  moyen_paiement: Paiement;
  origine: Origine;
  couverts: number | null;
  due_date: string | null; // YYYY-MM-DD (précommande)
  due_heure: string | null; // HH:MM optionnel
  lignes: PanierLigne[];
};

const CANAUX: Canal[] = ["truck", "boutique", "traiteur"];
const PAIEMENTS: Paiement[] = ["especes", "cb", "ticket", "virement"];
const ORIGINES: Origine[] = ["spontane", "insta", "tiktok", "facebook", "code"];

export async function createVente(
  _prev: SaleFormState,
  formData: FormData
): Promise<SaleFormState> {
  let p: Payload;
  try {
    p = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { error: "Panier illisible." };
  }

  // ── Validation structurelle
  if (!CANAUX.includes(p.canal)) return { error: "Canal invalide." };
  if (!PAIEMENTS.includes(p.moyen_paiement)) return { error: "Moyen de paiement invalide." };
  if (!ORIGINES.includes(p.origine)) return { error: "Origine invalide." };
  if (!Array.isArray(p.lignes) || p.lignes.length === 0) return { error: "Le panier est vide." };

  // ── Règles de mode (Contrat §01) : le mode_vente est saisi, jamais dérivé du canal…
  // …mais le canal contraint les modes possibles (truck comptoir = instantané,
  // traiteur = précommande ; la boutique fait les deux).
  if (p.canal === "truck" && p.mode_vente !== "instantane")
    return { error: "Le truck encaisse en instantané (comptoir)." };
  if (p.canal === "traiteur" && p.mode_vente !== "precommande")
    return { error: "Le traiteur fonctionne en précommande." };
  if (!["instantane", "precommande"].includes(p.mode_vente)) return { error: "Mode de vente invalide." };

  // ── Échéance : requise pour une précommande (file de production groupée par jour).
  let dueAt: string | null = null;
  if (p.mode_vente === "precommande") {
    if (!p.due_date) return { error: "Une précommande a besoin d'une date de remise." };
    const heure = p.due_heure || "12:00";
    // Interprétée en Europe/Paris (été UTC+2) — l'app est mono-fuseau atelier.
    const due = new Date(`${p.due_date}T${heure}:00+02:00`);
    if (Number.isNaN(due.getTime())) return { error: "Date de remise invalide." };
    dueAt = due.toISOString();
  }

  const supabase = await createClient();

  // ── Emplacement : FK obligatoire pour le truck (CHECK en base), null sinon.
  if (p.canal === "truck") {
    if (!p.emplacement_id) return { error: "Choisissez l'emplacement du truck." };
    const { data: emp } = await supabase
      .from("emplacement")
      .select("id, actif")
      .eq("id", p.emplacement_id)
      .maybeSingle();
    if (!emp?.actif) return { error: "Emplacement inconnu ou désactivé." };
  }

  // ── Recalcul des montants depuis la base (jamais depuis le client).
  const produitIds = [...new Set(p.lignes.map((l) => l.produit_id))];
  const { data: produits, error: prodError } = await supabase
    .from("produit")
    .select("*")
    .in("id", produitIds);
  if (prodError) return { error: prodError.message };
  const prodParId = new Map((produits ?? []).map((x) => [x.id, x]));

  const composantIds = [...new Set(p.lignes.flatMap((l) => l.composants ?? []))];
  const { data: composants, error: compError } = composantIds.length
    ? await supabase.from("composant").select("id, categorie, actif").in("id", composantIds)
    : { data: [], error: null };
  if (compError) return { error: compError.message };
  const compParId = new Map((composants ?? []).map((x) => [x.id, x]));

  type LignePrete = {
    type: "bowl" | "produit";
    mode: "unite" | "poids";
    recette_id: string | null;
    produit_id: string;
    libelle: string;
    qte: number | null;
    prix_unitaire: number | null;
    poids_g: number | null;
    prix_kg: number | null;
    montant: number;
    composants: { composant_id: string; categorie: "proteine" | "feculent" | "legume" | "sauce" }[];
  };

  const lignes: LignePrete[] = [];
  let total = 0;

  for (const l of p.lignes) {
    const produit = prodParId.get(l.produit_id);
    if (!produit || !produit.actif) return { error: "Un produit du panier n'existe plus." };
    if (produit.canal !== p.canal) return { error: `« ${produit.nom} » n'est pas au catalogue ${p.canal}.` };

    if (produit.mode === "poids") {
      const g = l.poids_g ?? 0;
      if (!Number.isFinite(g) || g <= 0) return { error: `Poids manquant pour « ${produit.nom} ».` };
      if (produit.prix_kg == null) return { error: `Prix au kilo manquant pour « ${produit.nom} ».` };
      const montant = Math.round(produit.prix_kg * (g / 1000) * 100) / 100;
      lignes.push({
        type: "produit",
        mode: "poids",
        recette_id: null,
        produit_id: produit.id,
        libelle: produit.nom,
        qte: null,
        prix_unitaire: null,
        poids_g: Math.round(g),
        prix_kg: produit.prix_kg,
        montant,
        composants: [],
      });
      total += montant;
      continue;
    }

    // mode unite (produit fini ou bowl)
    const qte = l.qte ?? 0;
    if (!Number.isInteger(qte) || qte <= 0) return { error: `Quantité invalide pour « ${produit.nom} ».` };
    if (produit.prix_unitaire == null) return { error: `Prix manquant pour « ${produit.nom} ».` };
    const montant = Math.round(produit.prix_unitaire * qte * 100) / 100;

    let recetteId: string | null = null;
    const comps: LignePrete["composants"] = [];
    if (produit.is_bowl) {
      const ids = l.composants ?? [];
      if (ids.length === 0) return { error: `Composez le bowl « ${produit.nom} » (composants manquants).` };
      for (const id of ids) {
        const c = compParId.get(id);
        if (!c || !c.actif) return { error: "Un composant du bowl n'existe plus." };
        comps.push({ composant_id: id, categorie: c.categorie });
      }
      // Signature (fiche du produit) ou composition libre (dépliée sans parent).
      recetteId = l.composition_libre ? null : produit.recette_id;
    }

    lignes.push({
      type: produit.is_bowl ? "bowl" : "produit",
      mode: "unite",
      recette_id: recetteId,
      produit_id: produit.id,
      libelle: produit.nom,
      qte,
      prix_unitaire: produit.prix_unitaire,
      poids_g: null,
      prix_kg: null,
      montant,
      composants: comps,
    });
    total += montant;
  }

  total = Math.round(total * 100) / 100;

  // ── Client / couverts
  if (p.client_id) {
    const { data: cli } = await supabase.from("client").select("id").eq("id", p.client_id).maybeSingle();
    if (!cli) return { error: "Client introuvable." };
  }
  const couverts =
    p.canal === "traiteur" && p.couverts != null && Number.isInteger(p.couverts) && p.couverts > 0
      ? p.couverts
      : null;

  // ── Écriture. occurred_at = MAINTENANT, capturé à l'encaissement (jamais dérivé
  // de created_at). fulfillment dérivé du mode_vente saisi (Contrat §01).
  const { data: vente, error: venteError } = await supabase
    .from("vente")
    .insert({
      occurred_at: new Date().toISOString(),
      canal: p.canal,
      emplacement_id: p.canal === "truck" ? p.emplacement_id : null,
      montant_total: total,
      couverts,
      client_id: p.client_id,
      moyen_paiement: p.moyen_paiement,
      origine: p.origine,
      mode_vente: p.mode_vente,
      fulfillment: p.mode_vente === "instantane" ? "remis" : "a_produire",
      source_vente: "manuel",
      due_at: dueAt,
    })
    .select("id")
    .single();
  if (venteError) return { error: venteError.message };

  const { data: lignesInserees, error: ligneError } = await supabase
    .from("vente_ligne")
    .insert(
      lignes.map((l) => ({
        vente_id: vente.id,
        type: l.type,
        mode: l.mode,
        recette_id: l.recette_id,
        produit_id: l.produit_id,
        libelle: l.libelle,
        qte: l.qte,
        prix_unitaire: l.prix_unitaire,
        poids_g: l.poids_g,
        prix_kg: l.prix_kg,
        montant: l.montant,
      }))
    )
    .select("id");
  if (ligneError || !lignesInserees || lignesInserees.length !== lignes.length) {
    await supabase.from("vente").delete().eq("id", vente.id); // rollback best-effort
    return { error: ligneError?.message ?? "Écriture des lignes incomplète." };
  }

  const compRows = lignes.flatMap((l, i) =>
    l.composants.map((c) => ({ ligne_id: lignesInserees[i].id, ...c }))
  );
  if (compRows.length > 0) {
    const { error: compInsertError } = await supabase.from("vente_ligne_composant").insert(compRows);
    if (compInsertError) {
      await supabase.from("vente").delete().eq("id", vente.id);
      return { error: compInsertError.message };
    }
  }

  // AUCUN revalidatePath ici — délibéré. Toute revalidation depuis une action
  // re-rend la route COURANTE dans la réponse, et ce re-render avale les clics
  // d'une rafale d'encaissements (état client perdu). Toutes les pages de
  // l'app sont dynamiques (rendu à la demande) : Commandes, Historique,
  // Dashboard et Clients liront la vente à leur prochain affichage.
  return { ok: true };
}
