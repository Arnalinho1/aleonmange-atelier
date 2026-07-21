import { panierFraisSchema } from "@/lib/validation";
import { clientEcriture } from "@/lib/supabase/ecrivain";
import { autorise, ipDe } from "@/lib/ratelimit";
import { emailPanierFraisConfirmer } from "@/lib/email";

/**
 * Intention « Panier frais » (teasing) → DOUBLE opt-in STRICT via web_intention_panier_frais
 * (0043). Meme mecanisme que la newsletter (token cote serveur, email de confirmation), mais
 * table dediee : email + vote FACULTATIF (taille/rythme/contenu nullables). Idempotent sur
 * l'email (re-submit met a jour le vote, pas de doublon). Reponse TOUJOURS generique.
 */
export async function POST(request: Request) {
  if (!autorise(`panier-frais:${ipDe(request)}`)) {
    return Response.json({ error: "Trop de demandes, réessayez dans un instant." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }
  const parsed = panierFraisSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Adresse email invalide." }, { status: 400 });
  }

  const ecriture = clientEcriture();
  if (!ecriture) {
    return Response.json({ error: "Service momentanément indisponible." }, { status: 503 });
  }

  const { data, error } = await ecriture.rpc("web_intention_panier_frais", {
    p_email: parsed.data.email,
    p_taille: parsed.data.taille ?? null,
    p_rythme: parsed.data.rythme ?? null,
    p_contenu: parsed.data.contenu ?? null,
  });
  if (error) {
    console.error("[site ALM] web_intention_panier_frais echec:", error.message);
    return Response.json({ error: "L'enregistrement n'a pas pu aboutir. Réessayez." }, { status: 400 });
  }

  const ligne = Array.isArray(data) ? data[0] : data;
  if (ligne?.statut === "en_attente" && ligne.token) {
    const lien = `${new URL(request.url).origin}/panier-frais/confirmer?token=${ligne.token}`;
    await emailPanierFraisConfirmer(parsed.data.email, { lien }); // best-effort
  }

  // Generique dans TOUS les cas (nouvelle intention, deja en attente, ou deja confirmee).
  return Response.json({ ok: true, message: "Vérifiez votre boîte mail pour confirmer votre inscription." });
}
