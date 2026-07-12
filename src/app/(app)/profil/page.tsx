import { redirect } from "next/navigation";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Profil, UserPreference } from "@/lib/supabase/database.types";
import { ProfilBoard } from "./ProfilBoard";

export const metadata = { title: "Mon profil — Atelier ALM" };

/**
 * Mon profil — écran PERSONNEL (handoff « Profil & Stock » §01). Un profil
 * existe toujours pour un utilisateur connecté : pas d'état vide, défauts
 * fonctionnels sans configuration (canal « ask », accueil dashboard).
 */
export default async function ProfilPage() {
  const m = SCREEN_META.profile;
  let profil: Profil | null = null;
  let email = "";
  let preference: UserPreference | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    email = user.email ?? "";
    const [p, pref] = await Promise.all([
      supabase.from("profil").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("user_preference").select("*").eq("profil_id", user.id).maybeSingle(),
    ]);
    profil = (p.data as Profil | null) ?? null;
    preference = (pref.data as UserPreference | null) ?? null;
  }

  if (!profil) redirect("/login");

  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      <ProfilBoard profil={profil} email={email} preference={preference} />
    </>
  );
}
