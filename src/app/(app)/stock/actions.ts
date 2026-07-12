"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type StockFormState = { error?: string; ok?: boolean } | undefined;

function lireQuantite(formData: FormData, nom: string): number | { error: string } {
  const raw = String(formData.get(nom) ?? "").replace(",", ".").trim();
  const n = Number(raw);
  if (!raw || !Number.isFinite(n)) return { error: "Quantité invalide." };
  return Math.round(n * 1000) / 1000;
}

/**
 * Réception : crée le lot (n°, DLC) et son mouvement d'entrée (+kg).
 * Convention : mouvement_stock.quantite est SIGNÉE (réception +, sortie −,
 * ajustement ±) — le stock d'un composant = Σ quantite.
 */
export async function enregistrerReception(
  _prev: StockFormState,
  formData: FormData
): Promise<StockFormState> {
  const composantId = String(formData.get("composant_id") ?? "");
  const numero = String(formData.get("numero") ?? "").trim() || null;
  const dlc = String(formData.get("dlc") ?? "").trim() || null;
  const quantite = lireQuantite(formData, "quantite");

  if (!composantId) return { error: "Choisissez un composant." };
  if (typeof quantite === "object") return quantite;
  if (quantite <= 0) return { error: "Une réception doit être positive." };

  const supabase = await createClient();
  const { data: lot, error: lotError } = await supabase
    .from("lot")
    .insert({ composant_id: composantId, numero, dlc, quantite, recu_le: new Date().toISOString().slice(0, 10) })
    .select("id")
    .single();
  if (lotError) return { error: lotError.message };

  const { error: mvtError } = await supabase.from("mouvement_stock").insert({
    composant_id: composantId,
    lot_id: lot.id,
    type: "reception",
    quantite,
    note: numero ? `Réception lot ${numero}` : "Réception",
  });
  if (mvtError) {
    await supabase.from("lot").delete().eq("id", lot.id);
    return { error: mvtError.message };
  }

  revalidatePath("/stock");
  return { ok: true };
}

/**
 * Ajustement d'inventaire : le comptage réel remplace le stock théorique —
 * on écrit l'ÉCART (signé), calculé côté serveur depuis les mouvements.
 */
export async function ajusterStock(
  _prev: StockFormState,
  formData: FormData
): Promise<StockFormState> {
  const composantId = String(formData.get("composant_id") ?? "");
  const comptage = lireQuantite(formData, "comptage");
  if (!composantId) return { error: "Composant introuvable." };
  if (typeof comptage === "object") return comptage;
  if (comptage < 0) return { error: "Le comptage ne peut pas être négatif." };

  const supabase = await createClient();
  const { data: mvts, error: mvtError } = await supabase
    .from("mouvement_stock")
    .select("quantite")
    .eq("composant_id", composantId);
  if (mvtError) return { error: mvtError.message };
  const stockTheorique = (mvts ?? []).reduce((acc, m) => acc + Number(m.quantite), 0);
  const ecart = Math.round((comptage - stockTheorique) * 1000) / 1000;
  if (ecart === 0) return { ok: true };

  const { error } = await supabase.from("mouvement_stock").insert({
    composant_id: composantId,
    type: "ajustement",
    quantite: ecart,
    note: `Inventaire : comptage ${comptage} kg (théorique ${stockTheorique.toFixed(3)} kg)`,
  });
  if (error) return { error: error.message };

  revalidatePath("/stock");
  return { ok: true };
}

/**
 * Définit / met à jour le seuil bas d'un composant (config PARTAGÉE).
 * Vide = suppression de l'override → retour au défaut par catégorie
 * (seuil effectif, src/lib/stock.ts). Pour un composant à la pièce, le même
 * formulaire porte le poids d'une pièce (conversion des sorties — B8).
 */
export async function definirSeuil(
  _prev: StockFormState,
  formData: FormData
): Promise<StockFormState> {
  const composantId = String(formData.get("composant_id") ?? "");
  const raw = String(formData.get("seuil") ?? "").replace(",", ".").trim();
  if (!composantId) return { error: "Composant introuvable." };

  const supabase = await createClient();
  if (!raw) {
    const { error } = await supabase.from("seuil_stock").delete().eq("composant_id", composantId);
    if (error) return { error: error.message };
  } else {
    const seuil = Number(raw);
    if (!Number.isFinite(seuil) || seuil < 0) return { error: "Seuil invalide." };
    const { error } = await supabase.from("seuil_stock").upsert({ composant_id: composantId, seuil_bas: seuil });
    if (error) return { error: error.message };
  }

  // Poids d'une pièce (présent uniquement pour les composants unite=piece).
  if (formData.has("poids_piece")) {
    const rawPoids = String(formData.get("poids_piece") ?? "").replace(",", ".").trim();
    const poids = rawPoids ? Number(rawPoids) : null;
    if (poids !== null && (!Number.isFinite(poids) || poids <= 0)) return { error: "Poids par pièce invalide." };
    const { error } = await supabase.from("composant").update({ poids_piece_g: poids }).eq("id", composantId);
    if (error) return { error: error.message };
  }

  revalidatePath("/stock");
  return { ok: true };
}

/** « ↺ défaut » : efface l'override — le seuil redevient le défaut hérité. */
export async function retirerSeuil(composantId: string): Promise<StockFormState> {
  if (!composantId) return { error: "Composant introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.from("seuil_stock").delete().eq("composant_id", composantId);
  if (error) return { error: error.message };

  revalidatePath("/stock");
  return { ok: true };
}

/**
 * Liste d'achat : upsert de LA ligne vivante du composant (unique) —
 * qté retenue (override manuel), fournisseur libre, flag commandé.
 * La feature s'arrête là : l'entrée en stock reste l'Ajuster de Niveaux.
 */
export async function upsertReappro(
  composantId: string,
  patch: { qte_retenue?: number | null; fournisseur?: string | null; commande?: boolean }
): Promise<StockFormState> {
  if (!composantId) return { error: "Composant introuvable." };
  if (patch.qte_retenue != null && (!Number.isFinite(patch.qte_retenue) || patch.qte_retenue < 0))
    return { error: "Quantité invalide." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("reappro_ligne")
    .upsert({ composant_id: composantId, ...patch }, { onConflict: "composant_id" });
  if (error) return { error: error.message };

  revalidatePath("/stock");
  return { ok: true };
}
