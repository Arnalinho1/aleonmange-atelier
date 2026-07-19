"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Canal, LigneMode } from "@/lib/supabase/database.types";

export type ProductFormState = { error?: string; ok?: boolean } | undefined;

function lireProduit(formData: FormData) {
  const nom = String(formData.get("nom") ?? "").trim();
  const canal = String(formData.get("canal") ?? "") as Canal;
  const mode = String(formData.get("mode") ?? "") as LigneMode;
  const categorie = String(formData.get("categorie") ?? "").trim() || null;
  const isBowl = formData.get("is_bowl") === "on";
  const recetteId = String(formData.get("recette_id") ?? "").trim() || null;
  const prixRaw = String(formData.get("prix") ?? "").replace(",", ".");
  const prix = prixRaw ? Number(prixRaw) : NaN;
  // Coût d'achat (revendus sans fiche) — même unité que le prix (€/pièce ou €/kg).
  const coutAchatRaw = String(formData.get("cout_achat") ?? "").replace(",", ".").trim();
  const coutAchat = coutAchatRaw ? Number(coutAchatRaw) : null;
  // Contenu SITE PUBLIC (0020) : description affichée sous le nom, visibilité sur le site.
  const description = String(formData.get("description") ?? "").trim() || null;
  const visibleSite = formData.get("visible_site") === "on";
  return { nom, canal, mode, categorie, isBowl, recetteId, prix, coutAchat, description, visibleSite };
}

function validerProduit(p: ReturnType<typeof lireProduit>): string | null {
  if (!p.nom) return "Le nom est requis.";
  if (!["truck", "boutique", "traiteur"].includes(p.canal)) return "Canal invalide.";
  if (!["unite", "poids"].includes(p.mode)) return "Mode invalide.";
  if (!Number.isFinite(p.prix) || p.prix <= 0) return "Prix invalide.";
  if (p.coutAchat !== null && (!Number.isFinite(p.coutAchat) || p.coutAchat < 0)) return "Coût d'achat invalide.";
  return null;
}

/**
 * Crée un produit au catalogue — CTA réel (écrit vraiment en base, pas un toast).
 * C'est l'entrée du vrai contenu (le catalogue démarre vide). La fiche technique
 * liée (recette_id) alimente coût matière / marge brute et le dépliage bowl.
 */
export async function createProduit(
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const p = lireProduit(formData);
  const invalide = validerProduit(p);
  if (invalide) return { error: invalide };

  const supabase = await createClient();
  const { error } = await supabase.from("produit").insert({
    nom: p.nom,
    categorie: p.categorie,
    canal: p.canal,
    mode: p.mode,
    is_bowl: p.isBowl,
    recette_id: p.recetteId,
    // Selon le mode : prix_unitaire (unite) OU prix_kg (poids). Jamais les deux.
    prix_unitaire: p.mode === "unite" ? p.prix : null,
    prix_kg: p.mode === "poids" ? p.prix : null,
    cout_achat: p.coutAchat,
    description: p.description,
    visible_site: p.visibleSite,
  });

  if (error) return { error: error.message };
  revalidatePath("/catalog");
  return { ok: true };
}

export async function updateProduit(
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Produit introuvable." };
  const p = lireProduit(formData);
  const invalide = validerProduit(p);
  if (invalide) return { error: invalide };

  const supabase = await createClient();
  const { error } = await supabase
    .from("produit")
    .update({
      nom: p.nom,
      categorie: p.categorie,
      canal: p.canal,
      mode: p.mode,
      is_bowl: p.isBowl,
      recette_id: p.recetteId,
      prix_unitaire: p.mode === "unite" ? p.prix : null,
      prix_kg: p.mode === "poids" ? p.prix : null,
      cout_achat: p.coutAchat,
      description: p.description,
      visible_site: p.visibleSite,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/catalog");
  revalidatePath("/recipes"); // la marge brute matière y dépend du produit lié
  return { ok: true };
}

/** Retirer du canal = soft delete (les ventes passées gardent leur produit). */
export async function toggleProduitActif(id: string, actif: boolean): Promise<ProductFormState> {
  if (!id) return { error: "Produit introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.from("produit").update({ actif }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/catalog");
  revalidatePath("/recipes");
  return { ok: true };
}
