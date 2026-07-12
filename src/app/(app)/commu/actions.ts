"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CommuFormState = { error?: string; ok?: boolean } | undefined;

const RESEAUX = ["insta", "tiktok", "facebook"];

/**
 * Référentiel social — SQUELETTE (POINT OUVERT #4 : périmètre à cadrer
 * avec le marketing). Créer/publier/programmer écrit vraiment en base ;
 * la publication réelle vers les plateformes n'est PAS branchée.
 */
export async function createSocialPost(
  _prev: CommuFormState,
  formData: FormData
): Promise<CommuFormState> {
  const reseau = String(formData.get("reseau") ?? "");
  const emplacementId = String(formData.get("emplacement_id") ?? "").trim() || null;
  const contenu = String(formData.get("contenu") ?? "").trim();
  const action = String(formData.get("action") ?? "publier");
  const programmeLe = String(formData.get("programme_le") ?? "").trim();

  if (!RESEAUX.includes(reseau)) return { error: "Choisissez un réseau." };
  if (!contenu) return { error: "Le texte de la publication est requis." };
  if (contenu.length > 500) return { error: "500 caractères maximum." };

  let statut = "publie";
  let programme: string | null = null;
  if (action === "programmer") {
    if (!programmeLe) return { error: "Choisissez la date/heure de programmation." };
    const d = new Date(programmeLe);
    if (Number.isNaN(d.getTime())) return { error: "Date de programmation invalide." };
    statut = "programme";
    programme = d.toISOString();
  }

  const supabase = await createClient();
  const { error } = await supabase.from("social_post").insert({
    reseau,
    emplacement_id: emplacementId,
    contenu,
    statut,
    programme_le: programme,
    publie_le: statut === "publie" ? new Date().toISOString() : null,
  });
  if (error) return { error: error.message };

  revalidatePath("/commu");
  return { ok: true };
}
