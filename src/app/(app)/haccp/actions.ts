"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type HaccpFormState = { error?: string; ok?: boolean } | undefined;

const TYPES = ["temperature", "nettoyage", "controle"];

/**
 * Enregistre un relevé HACCP horodaté (registre réglementaire) — vraie
 * écriture, opérateur = profil connecté, jamais de toast de démo.
 */
export async function enregistrerReleve(
  _prev: HaccpFormState,
  formData: FormData
): Promise<HaccpFormState> {
  const type = String(formData.get("type") ?? "");
  const cible = String(formData.get("cible") ?? "").trim();
  const valeurRaw = String(formData.get("valeur") ?? "").replace(",", ".").trim();
  const conforme = String(formData.get("conforme") ?? "") === "oui";
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!TYPES.includes(type)) return { error: "Type de relevé invalide." };
  if (!cible) return { error: "La cible (enceinte, zone, contrôle) est requise." };

  let valeur: number | null = null;
  if (type === "temperature") {
    if (!valeurRaw) return { error: "La température est requise." };
    valeur = Number(valeurRaw);
    if (!Number.isFinite(valeur)) return { error: "Température invalide." };
  }
  if (!conforme && !note) return { error: "Une non-conformité exige une note (action corrective)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("releve_haccp").insert({
    type,
    cible,
    valeur,
    conforme,
    note,
    operateur_id: user?.id ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath("/haccp");
  return { ok: true };
}
