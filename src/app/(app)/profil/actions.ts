"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProfilFormState = { error?: string; ok?: boolean } | undefined;

/** Met à jour le nom affiché (profil.nom — RLS : chacun le sien). */
export async function updateNom(
  _prev: ProfilFormState,
  formData: FormData
): Promise<ProfilFormState> {
  const nom = String(formData.get("nom") ?? "").trim();
  if (!nom) return { error: "Le nom est requis." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." };

  const { error } = await supabase.from("profil").update({ nom }).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/profil");
  revalidatePath("/users");
  return { ok: true };
}

/**
 * Persiste une préférence PERSONNELLE (user_preference, RLS owner-only).
 * Une source, plusieurs lecteurs : sale lit canal_defaut, le routeur
 * post-login lit ecran_accueil — jamais dupliquées ailleurs.
 */
export async function savePreference(
  champ: "canal_defaut" | "ecran_accueil",
  valeur: string
): Promise<ProfilFormState> {
  const valides =
    champ === "canal_defaut"
      ? ["ask", "truck", "boutique", "traiteur"]
      : ["dashboard", "sale", "orders"];
  if (!valides.includes(valeur)) return { error: "Valeur invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." };

  const horodatage = new Date().toISOString();
  const { error } =
    champ === "canal_defaut"
      ? await supabase
          .from("user_preference")
          .upsert({ profil_id: user.id, canal_defaut: valeur as "ask" | "truck" | "boutique" | "traiteur", updated_at: horodatage })
      : await supabase
          .from("user_preference")
          .upsert({ profil_id: user.id, ecran_accueil: valeur as "dashboard" | "sale" | "orders", updated_at: horodatage });
  if (error) return { error: error.message };

  revalidatePath("/profil");
  revalidatePath("/sale");
  return { ok: true };
}

/**
 * Change le mot de passe — vrai flux auth Supabase (l'utilisateur est déjà
 * authentifié : mise à jour directe, pas de lien e-mail).
 */
export async function changerMotDePasse(
  _prev: ProfilFormState,
  formData: FormData
): Promise<ProfilFormState> {
  const nouveau = String(formData.get("nouveau") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (nouveau.length < 8) return { error: "8 caractères minimum." };
  if (nouveau !== confirmation) return { error: "Les deux saisies ne correspondent pas." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: nouveau });
  if (error) return { error: error.message };

  return { ok: true };
}
