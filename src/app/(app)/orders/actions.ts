"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Fulfillment } from "@/lib/supabase/database.types";

export type OrderActionState = { error?: string; ok?: boolean } | undefined;

/** Cycle strict — on n'avance que d'UNE étape à la fois (Contrat §01). */
const ETAPE_SUIVANTE: Partial<Record<Fulfillment, Fulfillment>> = {
  a_produire: "en_prod",
  en_prod: "pret",
  pret: "remis",
};

/**
 * Fait avancer le fulfillment d'une commande — vraie mutation, répercutée
 * partout : la commande quitte v_commande_ouverte à « remis » et entre alors
 * dans le CA (v_vente_remise). Chaque transition est journalisée dans
 * fulfillment_event (source des cadences de Productivité).
 */
export async function avancerFulfillment(venteId: string): Promise<OrderActionState> {
  if (!venteId) return { error: "Commande introuvable." };

  const supabase = await createClient();
  const { data: vente, error: venteError } = await supabase
    .from("vente")
    .select("id, fulfillment, mode_vente")
    .eq("id", venteId)
    .maybeSingle();
  if (venteError) return { error: venteError.message };
  if (!vente) return { error: "Commande introuvable." };
  if (vente.mode_vente !== "precommande") return { error: "Une vente instantanée est déjà remise." };

  const vers = ETAPE_SUIVANTE[vente.fulfillment];
  if (!vers) return { error: "Cette commande est déjà remise." };

  const { error: updateError } = await supabase
    .from("vente")
    .update({ fulfillment: vers })
    .eq("id", venteId)
    .eq("fulfillment", vente.fulfillment); // garde-fou concurrence : n'avance que depuis l'état lu
  if (updateError) return { error: updateError.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error: eventError } = await supabase.from("fulfillment_event").insert({
    vente_id: venteId,
    de: vente.fulfillment,
    vers,
    operateur_id: user?.id ?? null,
  });
  if (eventError) return { error: eventError.message };

  revalidatePath("/orders");
  return { ok: true };
}
