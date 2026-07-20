"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { clientSession, authConfiguree } from "@/lib/supabase/session";
import { clientEcriture } from "@/lib/supabase/ecrivain";
import { emailNewsletterConfirmer } from "@/lib/email";

export type EtatAuth = { erreur?: string; info?: string } | undefined;

/** Origine (proto + host) de la requete, pour construire les URLs de retour des
 *  mails (confirmation compte, confirmation newsletter). */
async function origineDemande(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Inscription newsletter (double opt-in) au moment de la creation de compte, si
 *  la case est cochee. Best-effort : ne bloque JAMAIS l'inscription du compte. */
async function inscrireNewsletterSiDemande(email: string, origine: string): Promise<void> {
  try {
    const ecriture = clientEcriture();
    if (!ecriture) return;
    const { data, error } = await ecriture.rpc("web_inscrire_newsletter", { p_email: email });
    if (error) return;
    const ligne = Array.isArray(data) ? data[0] : data;
    if (ligne?.statut === "en_attente" && ligne.token) {
      await emailNewsletterConfirmer(email, { lien: `${origine}/newsletter/confirmer?token=${ligne.token}` });
    }
  } catch {
    // best-effort
  }
}

/**
 * Creation de compte client. On marque raw_user_meta_data.kind='client' : le
 * trigger 0040 (fail-closed) ne cree AUCUN profil -> le compte reste un simple
 * client, jamais equipe. Le rattachement au socle client (0039) se fait au
 * retour du mail de confirmation (email VERIFIE). L'opt-in fidelite choisi ici
 * est porte en metadata puis pose (date) au rattachement ; la newsletter passe
 * par son propre double opt-in.
 */
export async function sInscrire(_prev: EtatAuth, formData: FormData): Promise<EtatAuth> {
  if (!authConfiguree()) return { erreur: "Service momentanément indisponible." };

  const email = String(formData.get("email") ?? "").trim();
  const motDePasse = String(formData.get("motdepasse") ?? "");
  const prenom = String(formData.get("prenom") ?? "").trim();
  const nom = String(formData.get("nom") ?? "").trim();
  const optInFidelite = formData.get("fidelite") === "on";
  const optInNewsletter = formData.get("newsletter") === "on";

  if (!email || !motDePasse) return { erreur: "E-mail et mot de passe requis." };
  if (motDePasse.length < 6) return { erreur: "Mot de passe trop court (6 caractères minimum)." };

  const origine = await origineDemande();
  const supabase = await clientSession();
  const { error } = await supabase.auth.signUp({
    email,
    password: motDePasse,
    options: {
      data: {
        kind: "client",
        nom: [prenom, nom].filter(Boolean).join(" "),
        fidelite_opt_in: optInFidelite,
      },
      emailRedirectTo: `${origine}/compte/auth/callback`,
    },
  });
  if (error) return { erreur: messageFr(error.message) };

  if (optInNewsletter) await inscrireNewsletterSiDemande(email, origine);

  return {
    info: "Vérifiez votre boîte mail : cliquez le lien de confirmation pour activer votre compte.",
  };
}

/** Connexion. Sur succes, la session (cookies) est posee et on rejoint /compte. */
export async function seConnecter(_prev: EtatAuth, formData: FormData): Promise<EtatAuth> {
  if (!authConfiguree()) return { erreur: "Service momentanément indisponible." };

  const email = String(formData.get("email") ?? "").trim();
  const motDePasse = String(formData.get("motdepasse") ?? "");

  const supabase = await clientSession();
  const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
  if (error) return { erreur: messageFr(error.message) };

  redirect("/compte");
}

export async function seDeconnecter() {
  const supabase = await clientSession();
  await supabase.auth.signOut();
  redirect("/compte/connexion");
}

/** Dispatcher unique pour useActionState (action stable entre les rendus) :
 *  branche sur le champ cache "mode" (connexion | creation). */
export async function authentifier(prev: EtatAuth, formData: FormData): Promise<EtatAuth> {
  const mode = String(formData.get("mode") ?? "connexion");
  return mode === "creation" ? sInscrire(prev, formData) : seConnecter(prev, formData);
}

/** Messages d'erreur Supabase traduits, sans divulguer l'existence d'un compte. */
function messageFr(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "E-mail ou mot de passe incorrect.";
  if (/email not confirmed/i.test(msg)) return "E-mail non confirmé : cliquez le lien reçu par mail.";
  if (/password should be|password.*short/i.test(msg)) return "Mot de passe trop court (6 caractères minimum).";
  if (/already registered|already exists|user.*exists/i.test(msg))
    return "Un compte existe déjà avec cet e-mail : connectez-vous.";
  if (/signups?.*(not allowed|disabled)/i.test(msg)) return "Les inscriptions sont momentanément fermées.";
  if (/rate limit|too many/i.test(msg)) return "Trop de tentatives, réessayez dans un instant.";
  return "Une erreur est survenue. Réessayez.";
}
