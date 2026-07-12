"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type NotifActionState = { error?: string; ok?: boolean } | undefined;

/** Marquer une notification lue — persisté (le badge de nav suit). */
export async function marquerLue(id: string): Promise<NotifActionState> {
  if (!id) return { error: "Notification introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.from("notification").update({ lu: true }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/notifs");
  return { ok: true };
}

/** Tout marquer comme lu. */
export async function toutMarquerLu(): Promise<NotifActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("notification").update({ lu: true }).eq("lu", false);
  if (error) return { error: error.message };
  revalidatePath("/notifs");
  return { ok: true };
}

/** Toggle d'une préférence (par profil × catégorie × canal in_app/email). */
export async function togglePreference(
  categorie: string,
  canal: "in_app" | "email",
  valeur: boolean
): Promise<NotifActionState> {
  if (!["stock", "dlc", "seuil", "traiteur"].includes(categorie)) return { error: "Catégorie invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." };

  const { data: existante } = await supabase
    .from("notification_preference")
    .select("id, in_app, email")
    .eq("profil_id", user.id)
    .eq("categorie", categorie)
    .maybeSingle();

  const base = existante ?? { in_app: true, email: false };
  const next = { ...base, [canal]: valeur };

  const { error } = existante
    ? await supabase.from("notification_preference").update({ in_app: next.in_app, email: next.email }).eq("id", existante.id)
    : await supabase.from("notification_preference").insert({ profil_id: user.id, categorie, in_app: next.in_app, email: next.email });
  if (error) return { error: error.message };

  revalidatePath("/notifs");
  return { ok: true };
}
