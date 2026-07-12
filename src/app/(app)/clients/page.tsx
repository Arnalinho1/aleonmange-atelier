import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { KpiCard } from "@/components/ui/KpiCard";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Client } from "@/lib/supabase/database.types";
import { ClientsManager, type ClientStats } from "./ClientsManager";

export const metadata = { title: "Clients — Atelier ALM" };

/**
 * CRM léger (HANDOFF §02 clients). Les agrégats (commandes, CA, dernière
 * commande) dérivent de v_vente_remise — la MÊME source que Historique et
 * Finances (un calcul, plusieurs vues ; le CA n'est jamais recompté ici).
 * Le funnel communauté de la maquette (démo) est hors périmètre v1.
 */
export default async function ClientsPage() {
  const m = SCREEN_META.clients;
  let clients: Client[] = [];
  const stats: ClientStats = {};

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const [c, v] = await Promise.all([
      supabase.from("client").select("*").order("actif", { ascending: false }).order("nom"),
      supabase.from("v_vente_remise").select("client_id, montant_total, occurred_at").not("client_id", "is", null),
    ]);
    clients = c.data ?? [];
    for (const vente of v.data ?? []) {
      const id = vente.client_id as string;
      const s = stats[id] ?? { commandes: 0, ca: 0, derniere: null };
      s.commandes += 1;
      s.ca += vente.montant_total;
      if (!s.derniere || vente.occurred_at > s.derniere) s.derniere = vente.occurred_at;
      stats[id] = s;
    }
  }

  const actifs = clients.filter((c) => c.actif);
  const pros = actifs.filter((c) => c.type === "pro").length;
  const caTotal = Object.values(stats).reduce((acc, s) => acc + s.ca, 0);
  const cmdTotal = Object.values(stats).reduce((acc, s) => acc + s.commandes, 0);

  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />

      {clients.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
          <KpiCard variant="light" label="Clients actifs" value={String(actifs.length)} />
          <KpiCard variant="light" label="Pros" value={String(pros)} />
          <KpiCard variant="light" label="Particuliers" value={String(actifs.length - pros)} />
          <KpiCard variant="light" label="Commandes rattachées" value={String(cmdTotal)} sub="ventes remises" />
          <KpiCard variant="light" label="CA rattaché" value={`${caTotal.toFixed(2).replace(".", ",")} €`} tag={{ label: "Calculé", tone: "calcule" }} />
        </div>
      )}

      <ClientsManager clients={clients} stats={stats} />
    </>
  );
}
