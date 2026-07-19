import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ROLE_LABEL } from "@/lib/nav";

/**
 * Shell commun à tous les écrans : sidebar persistante + topbar + zone contenu.
 * Charge le profil courant et les badges dynamiques (notifs non lues, commandes
 * ouvertes) depuis Supabase. Badges masqués quand 0 — jamais "0".
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let profil: { nom: string; role: string } | undefined;
  const badges: { notifs?: number; orders?: number } = {};
  let hasUnread = false;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: p } = await supabase
        .from("profil")
        .select("nom, role")
        .eq("id", user.id)
        .maybeSingle();
      if (p) profil = { nom: p.nom, role: `${ROLE_LABEL[p.role] ?? ""} · A Léon Mange` };

      const [{ count: unread }, { count: openOrders }, { count: webPending }] = await Promise.all([
        supabase.from("notification").select("id", { count: "exact", head: true }).eq("lu", false),
        supabase.from("v_commande_ouverte").select("id", { count: "exact", head: true }),
        // web_a_confirmer est EXCLU de v_commande_ouverte (0029) → compte à part.
        // REGLE 0031 : filtre refuse_le IS NULL (les refusées ne sont plus en attente).
        supabase.from("vente").select("id", { count: "exact", head: true }).eq("fulfillment", "web_a_confirmer").is("refuse_le", null),
      ]);
      if (unread && unread > 0) {
        badges.notifs = unread;
        hasUnread = true;
      }
      const totalOrders = (openOrders ?? 0) + (webPending ?? 0);
      if (totalOrders > 0) badges.orders = totalOrders;
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar badges={badges} profil={profil} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar hasUnread={hasUnread} />
        <main className="flex-1 overflow-y-auto" style={{ padding: "clamp(20px,3vw,34px)" }}>
          <div style={{ maxWidth: 1240, margin: "0 auto" }}>{children}</div>
        </main>
      </div>
    </div>
  );
}
