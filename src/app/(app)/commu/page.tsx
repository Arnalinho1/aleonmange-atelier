import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Emplacement, SocialPost } from "@/lib/supabase/database.types";
import { CommuBoard } from "./CommuBoard";

export const metadata = { title: "Réseaux sociaux — Atelier ALM" };

/**
 * Réseaux sociaux — squelette du référentiel social (POINT OUVERT #4,
 * périmètre à cadrer avec le marketing). Le contenu de la maquette était
 * de la démonstration : ici, seules les vraies publications saisies.
 */
export default async function CommuPage() {
  const m = SCREEN_META.commu;
  let emplacements: Emplacement[] = [];
  let posts: (SocialPost & { quand: string; emplacement_libelle: string | null })[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const [e, p] = await Promise.all([
      supabase.from("emplacement").select("*").eq("actif", true).order("jour_semaine"),
      supabase.from("social_post").select("*").order("created_at", { ascending: false }).limit(30),
    ]);
    emplacements = e.data ?? [];
    const empParId = new Map(emplacements.map((x) => [x.id, x.libelle]));
    const fmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
    posts = ((p.data ?? []) as SocialPost[]).map((x) => ({
      ...x,
      quand: fmt.format(new Date(x.statut === "programme" && x.programme_le ? x.programme_le : x.publie_le ?? x.created_at)),
      emplacement_libelle: x.emplacement_id ? empParId.get(x.emplacement_id) ?? null : null,
    }));
  }

  const dayName = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "Europe/Paris" }).format(new Date());
  const jourSemaineAuj =
    ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].indexOf(dayName) + 1;

  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      <CommuBoard emplacements={emplacements} posts={posts} jourSemaineAuj={jourSemaineAuj} />
    </>
  );
}
