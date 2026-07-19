import { newsletterSchema } from "@/lib/validation";
import { clientEcriture } from "@/lib/supabase/ecrivain";
import { autorise, ipDe } from "@/lib/ratelimit";
import { emailNewsletterConfirmer } from "@/lib/email";

/**
 * Inscription newsletter → DOUBLE opt-in via web_inscrire_newsletter (0030). Le token
 * ne quitte JAMAIS le serveur (il sert a construire le lien de confirmation email).
 * Reponse TOUJOURS generique : ne revele pas si l'adresse etait deja inscrite.
 */
export async function POST(request: Request) {
  if (!autorise(`newsletter:${ipDe(request)}`)) {
    return Response.json({ error: "Trop de demandes, reessayez dans un instant." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Requete invalide." }, { status: 400 });
  }
  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Adresse email invalide." }, { status: 400 });
  }

  const ecriture = clientEcriture();
  if (!ecriture) {
    return Response.json({ error: "Service momentanement indisponible." }, { status: 503 });
  }

  const { data, error } = await ecriture.rpc("web_inscrire_newsletter", { p_email: parsed.data.email });
  if (error) {
    console.error("[site ALM] web_inscrire_newsletter echec:", error.message);
    return Response.json({ error: "L'inscription n'a pas pu aboutir. Reessayez." }, { status: 400 });
  }

  const ligne = Array.isArray(data) ? data[0] : data;
  if (ligne?.statut === "en_attente" && ligne.token) {
    const lien = `${new URL(request.url).origin}/newsletter/confirmer?token=${ligne.token}`;
    await emailNewsletterConfirmer(parsed.data.email, { lien }); // best-effort
  }

  // Generique dans TOUS les cas (nouvelle inscription, deja en attente, ou deja confirmee).
  return Response.json({ ok: true, message: "Verifiez votre boite mail pour confirmer votre inscription." });
}
