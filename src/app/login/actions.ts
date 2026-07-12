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
  redirect("/dashboard");
}

/**
 * ⚠ Les inscriptions publiques sont DÉSACTIVÉES côté Supabase (arbitrage
 * sécurité du 12 juil. 2026) : cet appel renvoie signup_disabled. Conservé
 * comme base du futur écran d'invitation (point ouvert §7.3).
 */
export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: "Connexion base non configurée." };
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const nom = String(formData.get("nom") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nom } },
  });
  if (error) return { error: erreurFr(error.message) };
  // Selon la config du projet, une confirmation e-mail peut être requise.
  redirect("/dashboard");
}

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
