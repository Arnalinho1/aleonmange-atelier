"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CategorieComposant } from "@/lib/supabase/database.types";

export type RecipeFormState = { error?: string; ok?: boolean } | undefined;

const CATEGORIES: CategorieComposant[] = ["proteine", "feculent", "legume", "sauce"];

/**
 * Crée un composant — la couche COMMUNE sous les 3 catalogues (Contrat §02) :
 * une brique de bowl truck peut aussi être un produit au poids en boutique.
 * Toujours lu par son id, jamais par canal.
 */
export async function createComposant(
  _prev: RecipeFormState,
  formData: FormData
): Promise<RecipeFormState> {
  const nom = String(formData.get("comp_nom") ?? "").trim();
  const categorie = String(formData.get("comp_categorie") ?? "") as CategorieComposant;
  const coutRaw = String(formData.get("comp_cout") ?? "").replace(",", ".").trim();
  const cout = coutRaw ? Number(coutRaw) : null;

  if (!nom) return { error: "Le nom du composant est requis." };
  if (!CATEGORIES.includes(categorie)) return { error: "Catégorie invalide." };
  if (cout !== null && (!Number.isFinite(cout) || cout <= 0)) return { error: "Coût matière invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("composant").insert({
    nom,
    categorie,
    cout_matiere_kg: cout,
  });

  if (error) return { error: error.message };
  revalidatePath("/recipes");
  return { ok: true };
}

/** Ligne de composition envoyée par le drawer (quantité en grammes, optionnelle). */
type LigneInput = { composant_id: string; quantite_g: number | null };

/**
 * Crée une fiche technique : la recette + ses lignes de composants.
 * `quantite` est stockée en grammes (le coût ligne = quantite/1000 × coût €/kg).
 */
export async function createRecette(
  _prev: RecipeFormState,
  formData: FormData
): Promise<RecipeFormState> {
  const nom = String(formData.get("nom") ?? "").trim();
  const rendementRaw = String(formData.get("rendement") ?? "").trim();
  const rendement = rendementRaw ? Number(rendementRaw) : null;
  // Temps du batch (min) — déclaratif chef, nourrit le temps ESTIMÉ de Productivité.
  const tempsRaw = String(formData.get("temps_prepa") ?? "").replace(",", ".").trim();
  const tempsPrepaMin = tempsRaw ? Number(tempsRaw) : null;
  const etapes = String(formData.get("etapes") ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let lignes: LigneInput[] = [];
  try {
    lignes = JSON.parse(String(formData.get("lignes") ?? "[]"));
  } catch {
    return { error: "Composition illisible." };
  }

  if (!nom) return { error: "Le nom de la fiche est requis." };
  if (rendement !== null && (!Number.isInteger(rendement) || rendement <= 0))
    return { error: "Le rendement doit être un nombre entier de portions." };
  if (tempsPrepaMin !== null && (!Number.isFinite(tempsPrepaMin) || tempsPrepaMin <= 0))
    return { error: "Le temps de préparation doit être un nombre de minutes positif." };
  if (lignes.length === 0) return { error: "Ajoutez au moins un composant à la fiche." };
  for (const l of lignes) {
    if (l.quantite_g !== null && (!Number.isFinite(l.quantite_g) || l.quantite_g <= 0))
      return { error: "Quantité invalide sur un composant." };
  }

  const supabase = await createClient();

  // La catégorie de chaque ligne vient du composant en base (jamais du client).
  const ids = lignes.map((l) => l.composant_id);
  const { data: composants, error: compError } = await supabase
    .from("composant")
    .select("id, categorie")
    .in("id", ids);
  if (compError) return { error: compError.message };
  const catParId = new Map((composants ?? []).map((c) => [c.id, c.categorie]));
  if (lignes.some((l) => !catParId.has(l.composant_id)))
    return { error: "Un composant sélectionné n'existe plus." };

  const { data: recette, error: recError } = await supabase
    .from("recette")
    .insert({ nom, rendement, etapes, temps_prepa_min: tempsPrepaMin })
    .select("id")
    .single();
  if (recError) return { error: recError.message };

  const { error: ligneError } = await supabase.from("recette_composant").insert(
    lignes.map((l) => ({
      recette_id: recette.id,
      composant_id: l.composant_id,
      quantite: l.quantite_g,
      categorie: catParId.get(l.composant_id)!,
    }))
  );
  if (ligneError) {
    // Pas de transaction côté PostgREST : on retire la recette orpheline.
    await supabase.from("recette").delete().eq("id", recette.id);
    return { error: ligneError.message };
  }

  revalidatePath("/recipes");
  return { ok: true };
}
