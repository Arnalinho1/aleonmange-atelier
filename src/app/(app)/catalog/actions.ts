"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Canal, LigneMode } from "@/lib/supabase/database.types";

export type ProductFormState = { error?: string; ok?: boolean } | undefined;

/**
 * Crée un produit au catalogue — CTA réel (écrit vraiment en base, pas un toast).
 * C'est l'entrée du vrai contenu (le catalogue démarre vide).
 */
export async function createProduit(
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const nom = String(formData.get("nom") ?? "").trim();
  const canal = String(formData.get("canal") ?? "") as Canal;
  const mode = String(formData.get("mode") ?? "") as LigneMode;
  const categorie = String(formData.get("categorie") ?? "").trim() || null;
  const isBowl = formData.get("is_bowl") === "on";
  const prixRaw = String(formData.get("prix") ?? "").replace(",", ".");
  const prix = prixRaw ? Number(prixRaw) : NaN;

  if (!nom) return { error: "Le nom est requis." };
  if (!["truck", "boutique", "traiteur"].includes(canal)) return { error: "Canal invalide." };
  if (!["unite", "poids"].includes(mode)) return { error: "Mode invalide." };
  if (!Number.isFinite(prix) || prix <= 0) return { error: "Prix invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("produit").insert({
    nom,
    categorie,
    canal,
    mode,
    is_bowl: isBowl,
    // Selon le mode : prix_unitaire (unite) OU prix_kg (poids). Jamais les deux.
    prix_unitaire: mode === "unite" ? prix : null,
    prix_kg: mode === "poids" ? prix : null,
  });

  if (error) return { error: error.message };
  revalidatePath("/catalog");
  return { ok: true };
}
