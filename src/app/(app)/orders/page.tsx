import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/ui/KpiCard";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { enLots } from "@/lib/supabase/lots";
import { fmtEuro } from "@/lib/calculs";
import type { Vente, VenteLigne } from "@/lib/supabase/database.types";
import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { OrdersQueue, type CommandeOuverte } from "./OrdersQueue";

export const metadata = { title: "Commandes du jour — Atelier ALM" };

/**
 * File de production — lit UNIQUEMENT v_commande_ouverte (précommandes non
 * remises, HANDOFF §03) : le comptoir instantané, déjà remis, n'apparaît
 * jamais ici. Le CTA fait avancer le fulfillment (vraie mutation, journalisée
 * dans fulfillment_event) ; à « remis », la commande bascule dans le CA.
 */
export default async function OrdersPage() {
  const m = SCREEN_META.orders;
  let commandes: CommandeOuverte[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: ouvertes } = await supabase
      .from("v_commande_ouverte")
      .select("*")
      .order("due_at", { ascending: true, nullsFirst: false });
    const ventes = (ouvertes ?? []) as Vente[];

    if (ventes.length > 0) {
      const ids = ventes.map((v) => v.id);
      const clientIds = [...new Set(ventes.map((v) => v.client_id).filter(Boolean))] as string[];
      const [lignesBrutes, cl] = await Promise.all([
        enLots(ids, (lot) => supabase.from("vente_ligne").select("*").in("vente_id", lot)),
        enLots(clientIds, (lot) => supabase.from("client").select("id, nom").in("id", lot)),
      ]);
      const lignes = lignesBrutes as VenteLigne[];
      const clientParId = new Map((cl as { id: string; nom: string }[]).map((x) => [x.id, x.nom]));

      const ligneIds = lignes.map((x) => x.id);
      const vlc = await enLots(ligneIds, (lot) =>
        supabase.from("vente_ligne_composant").select("ligne_id, categorie, composant(nom)").in("ligne_id", lot)
      );
      const compsParLigne = new Map<string, { nom: string; categorie: string }[]>();
      for (const row of vlc as unknown as { ligne_id: string; categorie: string; composant: { nom: string } | null }[]) {
        const arr = compsParLigne.get(row.ligne_id) ?? [];
        arr.push({ nom: row.composant?.nom ?? "Composant retiré", categorie: row.categorie });
        compsParLigne.set(row.ligne_id, arr);
      }

      const fmtJour = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });
      const fmtHeure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

      commandes = ventes.map((v) => {
        const due = v.due_at ? new Date(v.due_at) : null;
        return {
          id: v.id,
          canal: v.canal,
          fulfillment: v.fulfillment,
          montant_total: v.montant_total,
          couverts: v.couverts,
          due_at: v.due_at,
          client_nom: v.client_id ? clientParId.get(v.client_id) ?? null : null,
          due_jour: due ? fmtJour.format(due) : "sans-echeance",
          due_creneau: due ? fmtHeure.format(due) : "—",
          lignes: lignes
            .filter((x) => x.vente_id === v.id)
            .map((x) => ({
              libelle: x.libelle,
              qte: x.qte,
              poids_g: x.poids_g,
              composants: compsParLigne.get(x.id) ?? [],
            })),
        };
      });
    }
  }

  const portionsTotal = commandes.reduce(
    (acc, c) => acc + c.lignes.reduce((a, l) => a + (l.qte ?? 1), 0),
    0
  );
  const caEnAttente = commandes.reduce((acc, c) => acc + c.montant_total, 0);
  const prochaine = commandes[0];

  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />

      <p style={{ fontSize: 12.5, color: "#6b7469", background: "#f1ead9", borderRadius: 10, padding: "9px 12px", marginBottom: 16 }}>
        Seules les <strong>précommandes non remises</strong> apparaissent ici (traiteur, click &amp; collect).
        Le comptoir instantané est déjà remis — il vit dans l&apos;<Link href="/history" style={{ color: "#1493be", fontWeight: 600 }}>Historique</Link>.
      </p>

      {commandes.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={30} strokeWidth={1.6} />}
          titre="Aucune commande à produire"
          message="Les précommandes non remises (traiteur et click & collect) apparaîtront ici, groupées par créneau. Le comptoir instantané n'y figure pas."
        />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 20 }}>
            <KpiCard label="Commandes ouvertes" value={String(commandes.length)} />
            <KpiCard label="Portions à produire" value={String(portionsTotal)} />
            <KpiCard
              label="Prochaine échéance"
              value={prochaine?.due_creneau ?? "—"}
              sub={prochaine ? prochaine.due_jour : undefined}
            />
            <KpiCard label="CA en attente" value={`${fmtEuro(caEnAttente)} €`} sub="compté à la remise, jamais avant" />
          </div>
          <OrdersQueue commandes={commandes} />
        </>
      )}
    </>
  );
}
