"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type InsightActionState = { error?: string; ok?: boolean } | undefined;

/** Marquer traité / reporter — vraie mutation de statut (pas de toast démo). */
export async function changerStatutInsight(
  id: string,
  statut: "traite" | "reporte" | "ouvert"
): Promise<InsightActionState> {
  if (!id) return { error: "Insight introuvable." };
  if (!["traite", "reporte", "ouvert"].includes(statut)) return { error: "Statut invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("insight").update({ statut }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/insight");
  revalidatePath("/dashboard");
  return { ok: true };
}
