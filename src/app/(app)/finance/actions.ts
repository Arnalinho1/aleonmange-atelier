"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FinanceFormState = { error?: string; ok?: boolean } | undefined;

/**
 * Paramètres de rentabilité (singleton) : charges PAR PORTION qui séparent
 * la marge « brute matière » de la marge « nette » — deux calculs, deux
 * libellés, jamais confondus (HANDOFF §03).
 */
export async function saveParametres(
  _prev: FinanceFormState,
  formData: FormData
): Promise<FinanceFormState> {
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
  revalidatePath("/finance");
  return { ok: true };
}
