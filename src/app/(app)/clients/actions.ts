"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

export type ClientFormState = { error?: string; ok?: boolean } | undefined;

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
  const { error } = await supabase.from("client").insert(fiche);

  if (error) return { error: error.message };
  revalidatePath("/clients");
  return { ok: true };
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

/** Soft delete : les ventes passées gardent leur client_id. Jamais de DELETE. */
export async function toggleClientActif(id: string, actif: boolean): Promise<ClientFormState> {
  if (!id) return { error: "Fiche introuvable." };
  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("client").update({ actif }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/clients");
  return { ok: true };
}
