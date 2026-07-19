import { devisSchema } from "@/lib/validation";
import { clientEcriture } from "@/lib/supabase/ecrivain";
import { autorise, ipDe } from "@/lib/ratelimit";
import { emailDevisRecu } from "@/lib/email";

/**
 * Demande de devis traiteur → table demande_devis via la RPC web_creer_devis (0030).
 * PAS une vente, contact stocke inline, aucun client cree (Vague 3 : transformation
 * par le chef). Reponse client : "demande envoyee, aucun paiement, reponse sous 48h".
 */
export async function POST(request: Request) {
  if (!autorise(`devis:${ipDe(request)}`)) {
    return Response.json({ error: "Trop de demandes, reessayez dans un instant." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Requete invalide." }, { status: 400 });
  }
  const parsed = devisSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Donnees invalides." }, { status: 400 });
  }

  const ecriture = clientEcriture();
  if (!ecriture) {
    return Response.json({ error: "Service momentanement indisponible." }, { status: 503 });
  }

  const { data: id, error } = await ecriture.rpc("web_creer_devis", { p_devis: parsed.data });
  if (error || !id) {
    console.error("[site ALM] web_creer_devis echec:", error?.message ?? error);
    return Response.json({ error: "Votre demande n'a pas pu etre envoyee. Reessayez." }, { status: 400 });
  }

  await emailDevisRecu(parsed.data.contact_email, { contactNom: parsed.data.contact_nom }); // best-effort

  return Response.json({ ok: true, message: "Demande envoyee, aucun paiement maintenant. Reponse sous 48h." });
}
