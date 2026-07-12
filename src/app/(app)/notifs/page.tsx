import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Notification, NotificationPreference } from "@/lib/supabase/database.types";
import { NotifsBoard } from "./NotifsBoard";

export const metadata = { title: "Notifications — Atelier ALM" };

/**
 * Notifications — centre d'alertes + préférences par profil. Les règles de
 * génération (seuils stock, DLC, commandes à confirmer) = POINT OUVERT #2 :
 * la table se remplit quand elles seront validées ; ici structure + états.
 */
export default async function NotifsPage() {
  const m = SCREEN_META.notifs;
  let notifications: (Notification & { heure: string })[] = [];
  let preferences: NotificationPreference[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const maintenant = new Date();
    const depuis = new Date(maintenant.getTime() - 30 * 86400000).toISOString();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const [n, p] = await Promise.all([
      supabase.from("notification").select("*").gte("occurred_at", depuis).order("occurred_at", { ascending: false }),
      user
        ? supabase.from("notification_preference").select("*").eq("profil_id", user.id)
        : Promise.resolve({ data: [] }),
    ]);
    const fmtHeure = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
    notifications = ((n.data ?? []) as Notification[]).map((x) => ({
      ...x,
      heure: fmtHeure.format(new Date(x.occurred_at)),
    }));
    preferences = (p.data ?? []) as NotificationPreference[];
  }

  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      <NotifsBoard notifications={notifications} preferences={preferences} />
    </>
  );
}
