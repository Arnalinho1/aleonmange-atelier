"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type EmplacementFormState = { error?: string; ok?: boolean } | undefined;

/**
 * Référentiel emplacements (point d'architecture critique, HANDOFF §01) :
 * table éditable à FK — JAMAIS un enum, JAMAIS de suppression. On désactive
 * (`actif=false`) pour que les ventes passées gardent leur emplacement
 * d'origine (sinon la saisonnalité historique est corrompue).
 * Le `code` est la clé stable d'analytique : généré à la création, immuable.
 */

function slugify(libelle: string): string {
  return libelle
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les accents (diacritiques combinants)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

function parseJour(formData: FormData): number | null | { error: string } {
  const raw = String(formData.get("jour_semaine") ?? "").trim();
  if (!raw) return null;
  const jour = Number(raw);
  if (!Number.isInteger(jour) || jour < 1 || jour > 7) return { error: "Jour de semaine invalide." };
  return jour;
}

export async function createEmplacement(
  _prev: EmplacementFormState,
  formData: FormData
): Promise<EmplacementFormState> {
  const libelle = String(formData.get("libelle") ?? "").trim();
  const jour = parseJour(formData);

  if (!libelle) return { error: "Le libellé est requis." };
  if (jour !== null && typeof jour === "object") return jour;

  const supabase = await createClient();

  // Code stable dérivé du libellé ; suffixe numérique en cas de collision.
  const base = slugify(libelle) || "emplacement";
  const { data: existants } = await supabase
    .from("emplacement")
    .select("code")
    .like("code", `${base}%`);
  const pris = new Set((existants ?? []).map((e) => e.code));
  let code = base;
  for (let i = 2; pris.has(code); i++) code = `${base}-${i}`;

  const { error } = await supabase.from("emplacement").insert({
    code,
    libelle,
    jour_semaine: jour,
  });

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

/** Renomme / change le jour. Le `code` reste immuable (clé d'analytique). */
export async function updateEmplacement(
  _prev: EmplacementFormState,
  formData: FormData
): Promise<EmplacementFormState> {
  const id = String(formData.get("id") ?? "");
  const libelle = String(formData.get("libelle") ?? "").trim();
  const jour = parseJour(formData);

  if (!id) return { error: "Emplacement introuvable." };
  if (!libelle) return { error: "Le libellé est requis." };
  if (jour !== null && typeof jour === "object") return jour;

  const supabase = await createClient();
  const { error } = await supabase
    .from("emplacement")
    .update({ libelle, jour_semaine: jour })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

/** Désactive / réactive — jamais de DELETE sur un référentiel. */
export async function toggleEmplacementActif(id: string, actif: boolean): Promise<EmplacementFormState> {
  if (!id) return { error: "Emplacement introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.from("emplacement").update({ actif }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}
