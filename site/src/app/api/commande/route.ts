import { commandeSchema } from "@/lib/validation";
import { clientEcriture } from "@/lib/supabase/ecrivain";
import { clientLecture } from "@/lib/supabase/serveur";
import { creneauxRetraitBoutique, prochainRetraitTruck } from "@/lib/data/creneaux";
import { autorise, ipDe } from "@/lib/ratelimit";
import { emailPrecommandeRecue } from "@/lib/email";

/**
 * Precommande (boutique click & collect + truck) → vente web_a_confirmer via la RPC
 * web_creer_precommande (0030). Le client n'envoie JAMAIS de prix : montant recalcule
 * en base. Paiement au retrait → moyen_paiement pose a 'especes' (corrige au retrait,
 * cote Atelier). Creneau boutique valide contre la source (creneaux derives) ; cutoff
 * truck = veille 23h59 (prochainRetraitTruck). Statut client : toujours "en attente".
 */
export async function POST(request: Request) {
  if (!autorise(`commande:${ipDe(request)}`)) {
    return Response.json({ error: "Trop de demandes, reessayez dans un instant." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Requete invalide." }, { status: 400 });
  }
  const parsed = commandeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Donnees invalides." }, { status: 400 });
  }
  const c = parsed.data;

  const ecriture = clientEcriture();
  if (!ecriture) {
    return Response.json({ error: "Service momentanement indisponible." }, { status: 503 });
  }

  let emplacementId: string | null = null;
  let dueAtIso: string;
  let retraitLabel: string;

  if (c.canal === "boutique") {
    const creneaux = await creneauxRetraitBoutique();
    const trouve = creneaux.find((cr) => cr.iso === c.creneau);
    if (!trouve) {
      return Response.json({ error: "Ce creneau de retrait n'est plus disponible." }, { status: 400 });
    }
    dueAtIso = trouve.iso;
    retraitLabel = trouve.label;
  } else {
    const lecture = clientLecture();
    if (!lecture || !c.emplacement_code) {
      return Response.json({ error: "Emplacement indisponible." }, { status: 400 });
    }
    const { data: empl } = await lecture
      .from("emplacement")
      .select("id, jour_semaine")
      .eq("code", c.emplacement_code)
      .eq("actif", true)
      .maybeSingle();
    if (!empl || empl.jour_semaine == null) {
      return Response.json({ error: "Cet emplacement n'est pas disponible." }, { status: 400 });
    }
    const retrait = prochainRetraitTruck(empl.jour_semaine);
    if (!retrait) {
      return Response.json({ error: "Aucune date de marche disponible a la precommande." }, { status: 400 });
    }
    emplacementId = empl.id;
    dueAtIso = retrait.iso;
    retraitLabel = retrait.label;
  }

  const { data: venteId, error } = await ecriture.rpc("web_creer_precommande", {
    p_canal: c.canal,
    p_emplacement_id: emplacementId,
    p_due_at: dueAtIso,
    p_moyen_paiement: "especes",
    p_client: c.client,
    p_lignes: c.lignes,
  });
  if (error || !venteId) {
    console.error("[site ALM] web_creer_precommande echec:", error?.message ?? error);
    return Response.json({ error: "Votre commande n'a pas pu etre enregistree. Verifiez votre panier." }, { status: 400 });
  }

  const reference = String(venteId).slice(0, 8).toUpperCase();
  await emailPrecommandeRecue(c.client.email, { reference, retraitLabel }); // best-effort, ne leve jamais

  return Response.json({
    ok: true,
    reference,
    retrait: retraitLabel,
    statut: "En attente de confirmation par l'atelier",
  });
}
