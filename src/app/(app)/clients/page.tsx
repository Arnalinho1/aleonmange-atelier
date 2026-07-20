import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { KpiCard } from "@/components/ui/KpiCard";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Client } from "@/lib/supabase/database.types";
import { ClientsManager, type ClientStats, type FideliteMap } from "./ClientsManager";

export const metadata = { title: "Clients — Atelier ALM" };

/**
 * CRM léger (HANDOFF §02 clients). Les agrégats (commandes, CA, dernière
 * commande) dérivent de v_vente_remise — la MÊME source que Historique et
 * Finances (un calcul, plusieurs vues ; le CA n'est jamais recompté ici).
 * La fidélité (Vague 4) dérive de v_fidelite_client (compteur JAMAIS stocké) :
 * palier affiché + geste « appliquer une récompense » (fidelite_redemption).
 */
export default async function ClientsPage() {
  const m = SCREEN_META.clients;
  let clients: Client[] = [];
  const stats: ClientStats = {};
  const fidelite: FideliteMap = {};
  let seuilFid = 0;
  let rewardFid = "une récompense";

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const [c, v, fidRows, param] = await Promise.all([
      supabase.from("client").select("*").order("actif", { ascending: false }).order("nom"),
      supabase.from("v_vente_remise").select("client_id, montant_total, occurred_at").not("client_id", "is", null),
      supabase.from("v_fidelite_client").select("client_id, passages, recompenses_utilisees"),
      supabase.from("parametre_fidelite").select("seuil, recompense").maybeSingle(),
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
    seuilFid = param.data?.seuil ?? 0;
    rewardFid = param.data?.recompense ?? "une récompense";
    for (const r of fidRows.data ?? []) {
      const passages = r.passages ?? 0;
      const rachats = r.recompenses_utilisees ?? 0;
      fidelite[r.client_id] = {
        passages,
        cycle: seuilFid > 0 ? passages % seuilFid : 0,
        disponibles: seuilFid > 0 ? Math.max(0, Math.floor(passages / seuilFid) - rachats) : 0,
      };
    }
  }

  const actifs = clients.filter((c) => c.actif);
  const pros = actifs.filter((c) => c.type === "pro").length;
  const caTotal = Object.values(stats).reduce((acc, s) => acc + s.ca, 0);
  const cmdTotal = Object.values(stats).reduce((acc, s) => acc + s.commandes, 0);
  const recompensesDispo = Object.values(fidelite).reduce((acc, f) => acc + (f.disponibles > 0 ? 1 : 0), 0);

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
          {recompensesDispo > 0 && (
            <KpiCard variant="light" label="Récompenses à remettre" value={String(recompensesDispo)} sub="fidélité" />
          )}
        </div>
      )}

      <ClientsManager clients={clients} stats={stats} fidelite={fidelite} seuil={seuilFid} reward={rewardFid} />
    </>
  );
}
