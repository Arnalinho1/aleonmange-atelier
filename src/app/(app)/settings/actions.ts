"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Canal } from "@/lib/supabase/database.types";

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

/** Précisions affichées par le SITE PUBLIC (0022) — champs libres, vides = non renseigné. */
function lirePrecisionsSite(formData: FormData) {
  return {
    ville: String(formData.get("ville") ?? "").trim() || null,
    lieu: String(formData.get("lieu") ?? "").trim() || null,
    horaire_service: String(formData.get("horaire_service") ?? "").trim() || null,
  };
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
    ...lirePrecisionsSite(formData),
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
    .update({ libelle, jour_semaine: jour, ...lirePrecisionsSite(formData) })
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

/**
 * Paramètres de rentabilité (singleton) : charges PAR PORTION qui séparent
 * la marge « brute matière » de la marge « nette » — deux calculs, deux
 * libellés, jamais confondus (HANDOFF §03).
 */
export async function saveParametres(
  _prev: EmplacementFormState,
  formData: FormData
): Promise<EmplacementFormState> {
  const lire = (nom: string): number | null | { error: string } => {
    const raw = String(formData.get(nom) ?? "").replace(",", ".").trim();
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return { error: "Montant invalide." };
    return Math.round(n * 100) / 100;
  };

  const mo = lire("mo_par_portion");
  if (mo !== null && typeof mo === "object") return mo;
  const transport = lire("transport_par_portion");
  if (transport !== null && typeof transport === "object") return transport;

  const supabase = await createClient();
  const { error } = await supabase
    .from("parametre_rentabilite")
    .upsert({ id: true, mo_par_portion: mo, transport_par_portion: transport, updated_at: new Date().toISOString() });

  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/finance"); // Finances LIT ces paramètres (marge nette) — la saisie vit ici.
  return { ok: true };
}

/**
 * Horaires boutique (0023) — 7 lignes (1=lundi … 7=dimanche), 2 plages time
 * nullables par jour, plages vides = fermé. Validation MIROIR des contraintes
 * de la base (paires, fin > début, après-midi après le matin) pour des
 * messages en français ; la base reste l'arbitre final.
 */
export async function saveHorairesBoutique(
  _prev: EmplacementFormState,
  formData: FormData
): Promise<EmplacementFormState> {
  const JOURS = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
  const lignes: {
    jour: number;
    plage1_debut: string | null;
    plage1_fin: string | null;
    plage2_debut: string | null;
    plage2_fin: string | null;
  }[] = [];

  for (let jour = 1; jour <= 7; jour++) {
    const heure = (champ: string): string | null =>
      String(formData.get(`${champ}_${jour}`) ?? "").trim() || null;
    const p1d = heure("plage1_debut");
    const p1f = heure("plage1_fin");
    const p2d = heure("plage2_debut");
    const p2f = heure("plage2_fin");

    if ((p1d === null) !== (p1f === null) || (p2d === null) !== (p2f === null))
      return { error: `${JOURS[jour]} : début et fin vont par paire (laissez les deux vides pour fermer).` };
    if (p1d !== null && p1f !== null && p1f <= p1d)
      return { error: `${JOURS[jour]} : la fin de la première plage doit être après son début.` };
    if (p2d !== null && p2f !== null && p2f <= p2d)
      return { error: `${JOURS[jour]} : la fin de la seconde plage doit être après son début.` };
    if (p2d !== null && p1f === null)
      return { error: `${JOURS[jour]} : pas de seconde plage sans première plage.` };
    if (p2d !== null && p1f !== null && p2d <= p1f)
      return { error: `${JOURS[jour]} : la seconde plage doit commencer après la fin de la première.` };

    lignes.push({ jour, plage1_debut: p1d, plage1_fin: p1f, plage2_debut: p2d, plage2_fin: p2f });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("horaire_boutique")
    .upsert(lignes, { onConflict: "jour" });

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Familles de carte (0021) — ordre + note par canal pour le SITE PUBLIC.
 * Rapprochement par (canal, nom = produit.categorie) : le nom doit matcher
 * une catégorie en usage pour agir sur la carte (l'UI liste les catégories).
 * Référentiel : désactivation, jamais de suppression.
 */
export async function saveFamilleCarte(
  _prev: EmplacementFormState,
  formData: FormData
): Promise<EmplacementFormState> {
  const id = String(formData.get("id") ?? "").trim() || null;
  const canal = String(formData.get("canal") ?? "").trim() as Canal;
  const nom = String(formData.get("nom") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  const ordreRaw = String(formData.get("ordre") ?? "").trim();
  const ordre = ordreRaw ? Number(ordreRaw) : 0;

  if (!["truck", "boutique", "traiteur"].includes(canal)) return { error: "Canal invalide." };
  if (!nom) return { error: "Le nom est requis (il doit correspondre à une catégorie du catalogue)." };
  if (!Number.isInteger(ordre) || ordre < 0 || ordre > 999) return { error: "Ordre invalide (entier entre 0 et 999)." };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("famille_carte").update({ canal, nom, note, ordre }).eq("id", id)
    : await supabase.from("famille_carte").insert({ canal, nom, note, ordre });

  if (error)
    return {
      error: error.message.includes("duplicate") || error.message.includes("unique")
        ? "Une famille de ce nom existe déjà pour ce canal."
        : error.message,
    };
  revalidatePath("/settings");
  return { ok: true };
}

export async function toggleFamilleCarteActif(id: string, actif: boolean): Promise<EmplacementFormState> {
  if (!id) return { error: "Famille introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.from("famille_carte").update({ actif }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}
