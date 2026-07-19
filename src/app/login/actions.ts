"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type AuthState = { error?: string } | undefined;

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: "Connexion base non configurée." };
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: erreurFr(error.message) };
  // Écran d'accueil = préférence PERSONNELLE (user_preference) — une source,
  // plusieurs lecteurs (handoff Profil & Stock §01).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let accueil = "dashboard";
  if (user) {
    const { data: pref } = await supabase
      .from("user_preference")
      .select("ecran_accueil")
      .eq("profil_id", user.id)
      .maybeSingle();
    if (pref?.ecran_accueil) accueil = pref.ecran_accueil;
  }
  redirect(`/${accueil}`);
}

// Pas d'inscription sur l'Atelier : les inscriptions Supabase sont ouvertes
// globalement (espace client du site public, Vague 4), mais un compte SANS
// profil n'a AUCUN accès (fail-closed via le hook app_role / est_chef()) :
// se créer un compte ici ne donnerait rien. Un membre d'équipe se provisionne
// par la table profil (futur écran d'invitation /users), jamais par une
// auto-inscription. L'ancienne action signUp (sans kind='client') aurait
// provisionné un chef : supprimée.

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function erreurFr(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "Identifiants invalides.";
  if (/already registered/i.test(msg)) return "Cet e-mail est déjà utilisé.";
  if (/password should be/i.test(msg)) return "Mot de passe trop court (6 caractères min).";
  if (/email not confirmed/i.test(msg)) return "E-mail non confirmé — vérifie ta boîte mail.";
  return msg;
}
