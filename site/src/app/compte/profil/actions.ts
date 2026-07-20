"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { clientSession, authConfiguree } from "@/lib/supabase/session";
import { clientEcriture } from "@/lib/supabase/ecrivain";
import { emailNewsletterConfirmer } from "@/lib/email";

export type EtatProfil = { ok?: boolean; erreur?: string; info?: string } | undefined;

/** Abonnement newsletter (double opt-in). L'etat d'abonnement n'est pas lu cote
 *  client en V1 : on propose une (re)inscription ; la desinscription se fait par
 *  le lien present dans chaque email. */
export async function sAbonnerNewsletter(_prev: EtatProfil, formData: FormData): Promise<EtatProfil> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { erreur: "Email introuvable." };
  try {
    const ecriture = clientEcriture();
    if (!ecriture) return { erreur: "Service momentanément indisponible." };
    const { data, error } = await ecriture.rpc("web_inscrire_newsletter", { p_email: email });
    if (error) return { erreur: "L'inscription n'a pas pu aboutir. Réessayez." };
    const ligne = Array.isArray(data) ? data[0] : data;
    if (ligne?.statut === "en_attente" && ligne.token) {
      const h = await headers();
      const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
      const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
      await emailNewsletterConfirmer(email, { lien: `${proto}://${host}/newsletter/confirmer?token=${ligne.token}` });
    }
  } catch {
    return { erreur: "L'inscription n'a pas pu aboutir. Réessayez." };
  }
  return { ok: true, info: "Vérifiez votre boîte mail pour confirmer votre inscription." };
}

/** Maj coordonnees (nom, telephone) via la RPC self-scope web_maj_profil_client (0039).
 *  L'email n'est jamais modifiable ici (identite = compte auth). */
export async function majProfil(_prev: EtatProfil, formData: FormData): Promise<EtatProfil> {
  if (!authConfiguree()) return { erreur: "Service momentanément indisponible." };
  const prenom = String(formData.get("prenom") ?? "").trim();
  const nom = String(formData.get("nom") ?? "").trim();
  const telephone = String(formData.get("telephone") ?? "").trim();
  const nomComplet = [prenom, nom].filter(Boolean).join(" ");

  const supabase = await clientSession();
  const { error } = await supabase.rpc("web_maj_profil_client", {
    p_nom: nomComplet || null,
    p_telephone: telephone || null,
    p_fidelite_opt_in: null,
  });
  if (error) {
    if (/telephone deja utilise/i.test(error.message)) return { erreur: "Ce téléphone est déjà utilisé par un autre client." };
    return { erreur: "La mise à jour n'a pas pu aboutir. Réessayez." };
  }
  revalidatePath("/compte/profil");
  revalidatePath("/compte");
  return { ok: true, info: "Coordonnées enregistrées." };
}

/** Bascule l'opt-in fidelite (date posee a la 1re activation, non retroactif). */
export async function basculerFidelite(formData: FormData): Promise<void> {
  if (!authConfiguree()) return;
  const cible = String(formData.get("cible") ?? "") === "activer";
  const supabase = await clientSession();
  await supabase.rpc("web_maj_profil_client", { p_nom: null, p_telephone: null, p_fidelite_opt_in: cible });
  revalidatePath("/compte/profil");
  revalidatePath("/compte");
}

/** Enregistre les preferences declaratives (STOCKEES, non exploitees en V1).
 *  Ecriture directe dans client_preference (RLS : client_id = mon_client_id()). */
export async function enregistrerPreferences(_prev: EtatProfil, formData: FormData): Promise<EtatProfil> {
  if (!authConfiguree()) return { erreur: "Service momentanément indisponible." };
  const gouts = formData.getAll("gouts").map(String);
  const emplacement = String(formData.get("emplacement_favori") ?? "").trim() || null;
  const frequence = String(formData.get("frequence") ?? "").trim() || null;

  const supabase = await clientSession();
  const { data: c } = await supabase.from("client").select("id").maybeSingle();
  if (!c?.id) return { erreur: "Compte non rattaché." };

  const { error } = await supabase.from("client_preference").upsert(
    { client_id: c.id, gouts, emplacement_favori: emplacement, frequence, updated_le: new Date().toISOString() },
    { onConflict: "client_id" }
  );
  if (error) return { erreur: "Les préférences n'ont pas pu être enregistrées." };
  revalidatePath("/compte/profil");
  return { ok: true, info: "Préférences enregistrées." };
}
