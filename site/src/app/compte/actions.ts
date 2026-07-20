"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { clientSession, authConfiguree } from "@/lib/supabase/session";

export type EtatAuth = { erreur?: string; info?: string } | undefined;

/** Origine (proto + host) de la requete, pour construire l'URL de retour du
 *  mail de confirmation : localhost:3002 en dev, aleonmange.app en prod. */
async function origineDemande(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Creation de compte client. On marque raw_user_meta_data.kind='client' : le
 * trigger 0040 (fail-closed) ne cree AUCUN profil -> le compte reste un simple
 * client, jamais equipe. Le rattachement au socle client (0039) se fait au
 * retour du mail de confirmation (email VERIFIE). L'opt-in fidelite choisi ici
 * est porte en metadata puis pose (date) au rattachement.
 */
export async function sInscrire(_prev: EtatAuth, formData: FormData): Promise<EtatAuth> {
  if (!authConfiguree()) return { erreur: "Service momentanement indisponible." };

  const email = String(formData.get("email") ?? "").trim();
  const motDePasse = String(formData.get("motdepasse") ?? "");
  const prenom = String(formData.get("prenom") ?? "").trim();
  const nom = String(formData.get("nom") ?? "").trim();
  const optInFidelite = formData.get("fidelite") === "on";

  if (!email || !motDePasse) return { erreur: "E-mail et mot de passe requis." };
  if (motDePasse.length < 6) return { erreur: "Mot de passe trop court (6 caracteres minimum)." };

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
      emailRedirectTo: `${await origineDemande()}/compte/auth/callback`,
    },
  });
  if (error) return { erreur: messageFr(error.message) };

  return {
    info: "Verifiez votre boite mail : cliquez le lien de confirmation pour activer votre compte.",
  };
}

/** Connexion. Sur succes, la session (cookies) est posee et on rejoint /compte. */
export async function seConnecter(_prev: EtatAuth, formData: FormData): Promise<EtatAuth> {
  if (!authConfiguree()) return { erreur: "Service momentanement indisponible." };

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
  if (/email not confirmed/i.test(msg)) return "E-mail non confirme : cliquez le lien recu par mail.";
  if (/password should be|password.*short/i.test(msg)) return "Mot de passe trop court (6 caracteres minimum).";
  if (/already registered|already exists|user.*exists/i.test(msg))
    return "Un compte existe deja avec cet e-mail : connectez-vous.";
  if (/signups?.*(not allowed|disabled)/i.test(msg)) return "Les inscriptions sont momentanement fermees.";
  if (/rate limit|too many/i.test(msg)) return "Trop de tentatives, reessayez dans un instant.";
  return "Une erreur est survenue. Reessayez.";
}
