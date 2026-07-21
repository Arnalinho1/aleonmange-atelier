"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { Canal, SourceVente } from "@/lib/supabase/database.types";

export type ClientFormState = { error?: string; ok?: boolean; id?: string } | undefined;

const TYPES = ["particulier", "pro"];

function lireFiche(formData: FormData) {
  const nom = String(formData.get("nom") ?? "").trim();
  const type = String(formData.get("type") ?? "particulier");
  const email = String(formData.get("email") ?? "").trim() || null;
  const telephone = String(formData.get("telephone") ?? "").trim() || null;
  const code_postal = String(formData.get("code_postal") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  return { nom, type, email, telephone, code_postal, notes };
}

/**
 * CRM léger (HANDOFF §02 clients) : surtout traiteur / click & collect.
 * Le comptoir anonyme ne crée jamais de fiche.
 */
export async function createClientFiche(
  _prev: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const fiche = lireFiche(formData);
  if (!fiche.nom) return { error: "Le nom est requis." };
  if (!TYPES.includes(fiche.type)) return { error: "Type invalide." };

  const supabase = await createSupabaseClient();
  // .select("id") : l'id créé sert à présélectionner le client (drawer de /sale).
  const { data, error } = await supabase.from("client").insert(fiche).select("id").single();

  if (error) return { error: error.message };
  revalidatePath("/clients");
  return { ok: true, id: data.id };
}

export async function updateClientFiche(
  _prev: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const id = String(formData.get("id") ?? "");
  const fiche = lireFiche(formData);
  if (!id) return { error: "Fiche introuvable." };
  if (!fiche.nom) return { error: "Le nom est requis." };
  if (!TYPES.includes(fiche.type)) return { error: "Type invalide." };

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("client").update(fiche).eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/clients");
  return { ok: true };
}

/**
 * Applique une récompense fidélité (geste chef au point de vente, Vague 4).
 * Insère un fidelite_redemption (le compteur reste DÉRIVÉ : disponibles =
 * floor(passages/seuil) - rachats). operateur_id = le chef courant. RLS :
 * réservé à l'équipe (est_chef). Récompense NON monétaire.
 */
export async function appliquerRecompense(clientId: string): Promise<ClientFormState> {
  if (!clientId) return { error: "Client introuvable." };
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnectez-vous." };
  const { error } = await supabase
    .from("fidelite_redemption")
    .insert({ client_id: clientId, operateur_id: user.id });
  if (error) return { error: error.message };
  revalidatePath("/clients");
  return { ok: true };
}

/** Soft delete : les ventes passées gardent leur client_id. Jamais de DELETE. */
export async function toggleClientActif(id: string, actif: boolean): Promise<ClientFormState> {
  if (!id) return { error: "Fiche introuvable." };
  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("client").update({ actif }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/clients");
  return { ok: true };
}

/** Ligne de vente remise pour la section Ventes de la fiche et le picker de rattachement (source : v_vente_remise). */
export type VenteRattachable = {
  id: string;
  occurred_at: string;
  canal: Canal;
  montant_total: number;
  source_vente: SourceVente;
  client_rattache_le: string | null;
};

const CANAUX: Canal[] = ["truck", "boutique", "traiteur"];
const COLONNES_RATTACHABLE = "id, occurred_at, canal, montant_total, source_vente, client_rattache_le";

/** 30 dernières ventes remises du client (lecture lazy à l'ouverture du drawer — la page /clients reste légère). */
export async function listerVentesClient(
  clientId: string
): Promise<{ error?: string; ventes?: VenteRattachable[] }> {
  if (!clientId) return { error: "Client introuvable." };
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("v_vente_remise")
    .select(COLONNES_RATTACHABLE)
    .eq("client_id", clientId)
    .order("occurred_at", { ascending: false })
    .limit(30);
  if (error) return { error: error.message };
  return { ventes: (data ?? []) as VenteRattachable[] };
}

/** Ventes remises ANONYMES pour le picker de rattachement. Filtres server-side, LIMIT 50. */
export async function listerVentesAnonymes(filtres: {
  jours: 7 | 30 | null;
  canal: Canal | "all";
  montant: number | null;
}): Promise<{ error?: string; ventes?: VenteRattachable[] }> {
  const jours = filtres.jours === 7 || filtres.jours === 30 ? filtres.jours : null;
  const canal = CANAUX.includes(filtres.canal as Canal) ? (filtres.canal as Canal) : null;
  const montant =
    typeof filtres.montant === "number" && Number.isFinite(filtres.montant) && filtres.montant > 0
      ? filtres.montant
      : null;

  const supabase = await createSupabaseClient();
  let q = supabase
    .from("v_vente_remise")
    .select(COLONNES_RATTACHABLE)
    .is("client_id", null)
    .order("occurred_at", { ascending: false })
    .limit(50);
  if (jours) q = q.gte("occurred_at", new Date(Date.now() - jours * 86400000).toISOString());
  if (canal) q = q.eq("canal", canal);
  if (montant != null) q = q.eq("montant_total", montant);

  const { data, error } = await q;
  if (error) return { error: error.message };
  return { ventes: (data ?? []) as VenteRattachable[] };
}

/**
 * Rattachement DOCUMENTAIRE d'une vente anonyme à un client (0044) : le marqueur
 * client_rattache_le est posé et v_fidelite_client ignore les ventes marquées —
 * JAMAIS de crédit fidélité (arbitrage 2026-07-21). UPDATE ciblé par id ; la clause
 * `client_id is null` évite tout écrasement (une vente déjà rattachée ne bouge pas,
 * même en concurrence entre deux écrans). Le client cible peut être désactivé
 * (soft delete : l'historique reste rattachable), la FK garantit son existence.
 */
export async function rattacherVenteClient(venteId: string, clientId: string): Promise<ClientFormState> {
  if (!venteId || !clientId) return { error: "Vente ou client introuvable." };
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("vente")
    .update({ client_id: clientId, client_rattache_le: new Date().toISOString() })
    .eq("id", venteId)
    .is("client_id", null)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return { error: "Cette vente vient d'être rattachée depuis un autre écran : rafraîchissez la liste." };
  revalidatePath("/clients");
  revalidatePath("/history");
  return { ok: true };
}

/** Détachement : UNIQUEMENT les ventes marquées (une vente saisie AVEC client reste intacte, sinon la fidélité serait décrémentée). */
export async function detacherVenteClient(venteId: string): Promise<ClientFormState> {
  if (!venteId) return { error: "Vente introuvable." };
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("vente")
    .update({ client_id: null, client_rattache_le: null })
    .eq("id", venteId)
    .not("client_rattache_le", "is", null)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return { error: "Cette vente n'est pas détachable (client posé à la saisie, ou déjà détachée)." };
  revalidatePath("/clients");
  revalidatePath("/history");
  return { ok: true };
}
