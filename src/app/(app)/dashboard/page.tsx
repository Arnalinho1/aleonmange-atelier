import Link from "next/link";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Dot } from "@/components/ui/Badge";
import { SCREEN_META, CANAL_COLOR, CANAL_LABEL, CATEGORIE_COLOR } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { trierInsights, URGENCE_COLOR, URGENCE_LABEL } from "@/lib/insights";
import { fmtEuro } from "@/lib/calculs";
import type { Canal, Insight, Vente, VenteLigne } from "@/lib/supabase/database.types";

export const metadata = { title: "Tableau de bord — Atelier ALM" };

type Verdict = { couleur: string; fond: string; label: string };

/**
 * Tableau de bord — AGRÈGE les autres écrans, ne recalcule jamais à côté :
 * CA = v_vente_remise du jour · key insights = MÊME source qu'Insight
 * (tri partagé, .slice(0,3)) · commandes = v_commande_ouverte · alertes =
 * notifications non lues. Le verdict tricolore est une règle INDICATIVE
 * (documentée ci-dessous), à valider — POINT OUVERT #2.
 */
export default async function DashboardPage() {
  const m = SCREEN_META.dashboard;

  const fmtJour = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });
  const fmtHeure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
  const maintenant = new Date();
  const aujourdhui = fmtJour.format(maintenant);
  const jMoins7 = fmtJour.format(new Date(maintenant.getTime() - 7 * 86400000));
  const jPlus1 = fmtJour.format(new Date(maintenant.getTime() + 86400000));
  const jPlus2 = fmtJour.format(new Date(maintenant.getTime() + 2 * 86400000));

  let ventesJour: Omit<Vente, "fulfillment" | "created_at">[] = [];
  let caJMoins7 = 0;
  let topPlats: { libelle: string; qte: number; montant: number }[] = [];
  let ouvertes: Vente[] = [];
  let chargeComposants: { nom: string; categorie: string; portions: number }[] = [];
  let insights: Insight[] = [];
  const alertes = { critique: 0, alerte: 0, info: 0 };

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const [v, o, ins, notif] = await Promise.all([
      supabase
        .from("v_vente_remise")
        .select("*")
        .gte("occurred_at", new Date(maintenant.getTime() - 9 * 86400000).toISOString()),
      supabase.from("v_commande_ouverte").select("*").order("due_at", { ascending: true, nullsFirst: false }),
      supabase.from("insight").select("*").neq("statut", "traite"),
      supabase.from("notification").select("severite").eq("lu", false),
    ]);

    const remises = (v.data ?? []) as Omit<Vente, "fulfillment" | "created_at">[];
    ventesJour = remises.filter((x) => fmtJour.format(new Date(x.occurred_at)) === aujourdhui);
    caJMoins7 = remises
      .filter((x) => fmtJour.format(new Date(x.occurred_at)) === jMoins7)
      .reduce((acc, x) => acc + x.montant_total, 0);

    // Top plats du jour (lignes des ventes remises d'aujourd'hui)
    if (ventesJour.length > 0) {
      const { data: lignes } = await supabase
        .from("vente_ligne")
        .select("vente_id, libelle, qte, montant")
        .in("vente_id", ventesJour.map((x) => x.id));
      const parPlat = new Map<string, { libelle: string; qte: number; montant: number }>();
      for (const l of (lignes ?? []) as Pick<VenteLigne, "vente_id" | "libelle" | "qte" | "montant">[]) {
        const cur = parPlat.get(l.libelle) ?? { libelle: l.libelle, qte: 0, montant: 0 };
        cur.qte += l.qte ?? 1;
        cur.montant += l.montant;
        parPlat.set(l.libelle, cur);
      }
      topPlats = [...parPlat.values()].sort((a, b) => b.qte - a.qte).slice(0, 3);
    }

    ouvertes = (o.data ?? []) as Vente[];
    // Charge par composant des commandes ouvertes
    if (ouvertes.length > 0) {
      const { data: lignesOuvertes } = await supabase
        .from("vente_ligne")
        .select("id, qte, vente_id")
        .in("vente_id", ouvertes.map((x) => x.id));
      const qteParLigne = new Map((lignesOuvertes ?? []).map((l) => [l.id, l.qte ?? 1]));
      const { data: vlc } = (lignesOuvertes ?? []).length
        ? await supabase
            .from("vente_ligne_composant")
            .select("ligne_id, categorie, composant(nom)")
            .in("ligne_id", (lignesOuvertes ?? []).map((l) => l.id))
        : { data: [] };
      const map = new Map<string, { nom: string; categorie: string; portions: number }>();
      for (const row of (vlc ?? []) as { ligne_id: string; categorie: string; composant: { nom: string } | null }[]) {
        const nom = row.composant?.nom ?? "Composant retiré";
        const cur = map.get(nom) ?? { nom, categorie: row.categorie, portions: 0 };
        cur.portions += qteParLigne.get(row.ligne_id) ?? 1;
        map.set(nom, cur);
      }
      chargeComposants = [...map.values()].sort((a, b) => b.portions - a.portions).slice(0, 5);
    }

    insights = trierInsights((ins.data ?? []) as Insight[]).slice(0, 3);

    for (const n of (notif.data ?? []) as { severite: string }[]) {
      if (n.severite === "critique") alertes.critique++;
      else if (n.severite === "alerte") alertes.alerte++;
      else alertes.info++;
    }
  }

  const ca = ventesJour.reduce((acc, x) => acc + x.montant_total, 0);
  const nbVentes = ventesJour.length;
  const caParCanal = { truck: 0, boutique: 0, traiteur: 0 } as Record<Canal, number>;
  for (const x of ventesJour) caParCanal[x.canal] += x.montant_total;

  const enRetard = ouvertes.filter((x) => x.due_at && new Date(x.due_at) < maintenant);
  const prochaine = ouvertes.find((x) => x.due_at && new Date(x.due_at) >= maintenant);
  const traiteurProches = ouvertes.filter(
    (x) => x.canal === "traiteur" && x.due_at && [aujourdhui, jPlus1, jPlus2].includes(fmtJour.format(new Date(x.due_at)))
  );
  const portionsRestantes = chargeComposants.reduce((acc, c) => acc + c.portions, 0);

  // ── Verdict tricolore — règle INDICATIVE, à valider (POINT OUVERT #2) :
  // rouge si commande en retard ou alerte critique · vert si CA ≥ J-7 (>0) ·
  // ambre si activité · « pas encore démarrée » sinon.
  let verdict: Verdict;
  if (enRetard.length > 0 || alertes.critique > 0) {
    verdict = { couleur: "#b00d1a", fond: "#f7e7e4", label: "Journée sous tension" };
  } else if (ca > 0 && ca >= caJMoins7) {
    verdict = { couleur: "#1f8a5b", fond: "#e9f3ec", label: "Bonne journée" };
  } else if (ca > 0 || ouvertes.length > 0) {
    verdict = { couleur: "#b07a2e", fond: "#f6eedd", label: "Journée dans le rythme" };
  } else {
    verdict = { couleur: "#6b7469", fond: "#efe9dc", label: "Journée pas encore démarrée" };
  }

  const dateLabel = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(maintenant);

  return (
    <>
      <ScreenHeader rubrique={`${m.rubrique} · ${dateLabel}`} titre={m.titre} desc={m.desc} />

      {/* Verdict tricolore */}
      <div
        className="flex items-center gap-4 flex-wrap"
        style={{ border: `1px solid ${verdict.couleur}40`, borderLeft: `5px solid ${verdict.couleur}`, background: verdict.fond, borderRadius: 16, padding: "16px 20px", marginBottom: 18 }}
      >
        <div className="flex items-center gap-3" style={{ flex: 1 }}>
          <Dot color={verdict.couleur} size={12} />
          <div>
            <p className="font-display" style={{ fontSize: 20, fontWeight: 800, color: verdict.couleur }}>{verdict.label}</p>
            <p className="font-mono" style={{ fontSize: 10, color: "#8a7f6a" }}>règle indicative — à valider (point ouvert #2)</p>
          </div>
        </div>
        <div className="flex gap-5 flex-wrap">
          <Fact label="CA du jour" valeur={`${fmtEuro(ca)} €`} />
          <Fact label="Ventes" valeur={String(nbVentes)} />
          <Fact label="À produire" valeur={String(ouvertes.length)} />
          <Fact label="En retard" valeur={String(enRetard.length)} accent={enRetard.length > 0 ? "#b00d1a" : undefined} />
        </div>
      </div>

      {/* Key insights — même source qu'Insight, .slice(0,3) */}
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <p className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: ".1em", color: "#a79b84" }}>
          Les 3 points chauds · lus depuis Insight (même tri, jamais recalculés)
        </p>
        <Link href="/insight" style={{ fontSize: 12.5, fontWeight: 600, color: "#1493be" }}>
          Ouvrir Insight →
        </Link>
      </div>
      {insights.length === 0 ? (
        <Card style={{ padding: 16, marginBottom: 18 }}>
          <p style={{ fontSize: 13, color: "#6b7469" }}>
            Rien à signaler — les insights naissent avec l&apos;activité (règles à valider, point ouvert #2).
          </p>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(255px,1fr))", gap: 12, marginBottom: 18 }}>
          {insights.map((i) => (
            <Link key={i.id} href="/insight">
              <Card className="transition-transform hover:-translate-y-px" style={{ padding: 14, height: "100%" }}>
                <p className="font-mono uppercase flex items-center gap-2" style={{ fontSize: 9.5, letterSpacing: ".08em", color: URGENCE_COLOR[i.urgence], marginBottom: 6 }}>
                  <Dot color={URGENCE_COLOR[i.urgence]} size={7} /> {URGENCE_LABEL[i.urgence]}
                </p>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: "#0e3947", lineHeight: 1.4 }}>{i.constat}</p>
                {i.chiffre && (
                  <p className="font-mono" style={{ fontSize: 12, color: "#b00d1a", marginTop: 6 }}>{i.chiffre}</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* CA du jour par canal */}
      <Card style={{ padding: 18, marginBottom: 16 }}>
        <div className="flex items-baseline justify-between flex-wrap gap-2" style={{ marginBottom: 12 }}>
          <p className="font-display" style={{ fontSize: 16, fontWeight: 700, color: "#0e3947" }}>CA du jour par canal</p>
          <div className="flex items-baseline gap-3">
            <span className="font-display" style={{ fontSize: 30, fontWeight: 800, color: "#0e3947" }}>{fmtEuro(ca)} €</span>
            <DeltaPill valeur={ca} reference={caJMoins7} />
          </div>
        </div>
        {nbVentes === 0 ? (
          <p style={{ fontSize: 13, color: "#6b7469" }}>Aucune donnée aujourd&apos;hui — le CA apparaît à la première vente remise.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(Object.keys(caParCanal) as Canal[]).map((c) => (
              <div key={c} className="flex items-center gap-3">
                <span className="flex items-center gap-2" style={{ width: 100, fontSize: 12.5, fontWeight: 600, color: "#0e3947" }}>
                  <Dot color={CANAL_COLOR[c]} size={7} /> {CANAL_LABEL[c]}
                </span>
                <div style={{ flex: 1, height: 8, borderRadius: 100, background: "#e4dac6" }}>
                  <div style={{ width: ca > 0 ? `${(caParCanal[c] / ca) * 100}%` : 0, height: "100%", borderRadius: 100, background: CANAL_COLOR[c] }} />
                </div>
                <span className="font-mono" style={{ width: 80, textAlign: "right", fontSize: 12.5, fontWeight: 600, color: "#0e3947" }}>
                  {fmtEuro(caParCanal[c])} €
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Grille business */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12, marginBottom: 16 }}>
        <Card style={{ padding: 16 }}>
          <BlocTitre titre="Objectif du jour" />
          <p style={{ fontSize: 13, color: "#6b7469" }}>Aucun objectif défini — le paramétrage d&apos;objectifs reste à cadrer.</p>
        </Card>
        <Card style={{ padding: 16 }}>
          <BlocTitre titre="Ventes du jour" />
          {nbVentes === 0 ? (
            <p style={{ fontSize: 13, color: "#6b7469" }}>Aucune donnée aujourd&apos;hui.</p>
          ) : (
            <>
              <p className="font-display" style={{ fontSize: 28, fontWeight: 800, color: "#0e3947" }}>{nbVentes}</p>
              <div style={{ borderTop: "1px solid #efe7d6", marginTop: 8, paddingTop: 8 }}>
                <p className="font-mono" style={{ fontSize: 11, color: "#8a7f6a" }}>
                  panier moyen · <strong style={{ color: "#0e3947" }}>{fmtEuro(ca / nbVentes)} €</strong>
                </p>
              </div>
            </>
          )}
        </Card>
        <Card style={{ padding: 16 }}>
          <BlocTitre titre="Plats qui performent" />
          {topPlats.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6b7469" }}>Aucune donnée aujourd&apos;hui.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {topPlats.map((p, i) => (
                <div key={p.libelle} className="flex items-center gap-2">
                  <span className="font-mono" style={{ fontSize: 10.5, color: "#a79b84", width: 16 }}>#{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: "#0e3947", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.libelle}</span>
                  <span className="font-mono" style={{ fontSize: 11.5, color: "#6b7469" }}>× {p.qte}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Grille opérationnelle */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, alignItems: "start" }} className="fz-users-grid">
        <Card style={{ overflow: "hidden" }}>
          <SectionHeader titre="Charge à produire" action={<Link href="/orders" style={{ fontSize: 12, fontWeight: 600, color: "#1493be" }}>Plan complet →</Link>} />
          <div style={{ padding: 16 }}>
            {ouvertes.length === 0 ? (
              <p style={{ fontSize: 13, color: "#6b7469" }}>Aucune commande à produire.</p>
            ) : (
              <>
                <div className="flex gap-6" style={{ marginBottom: 12 }}>
                  <div>
                    <p className="font-display" style={{ fontSize: 26, fontWeight: 800, color: "#0e3947" }}>{portionsRestantes || ouvertes.length}</p>
                    <p className="font-mono" style={{ fontSize: 9.5, color: "#a79b84" }}>portions restantes</p>
                  </div>
                  <div>
                    <p className="font-display" style={{ fontSize: 26, fontWeight: 800, color: "#0e3947" }}>
                      {prochaine?.due_at ? fmtHeure.format(new Date(prochaine.due_at)) : "—"}
                    </p>
                    <p className="font-mono" style={{ fontSize: 9.5, color: "#a79b84" }}>prochain créneau</p>
                  </div>
                </div>
                {chargeComposants.map((comp) => (
                  <div key={comp.nom} className="flex items-center gap-2" style={{ padding: "4px 0" }}>
                    <Dot color={CATEGORIE_COLOR[comp.categorie] ?? "#9a927f"} size={7} />
                    <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: "#0e3947" }}>{comp.nom}</span>
                    <span className="font-mono" style={{ fontSize: 11.5, color: "#6b7469" }}>{comp.portions} portion{comp.portions > 1 ? "s" : ""}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card style={{ overflow: "hidden" }}>
            <SectionHeader titre="Commandes traiteur à honorer" sous="J / J+1 / J+2" />
            <div style={{ padding: 16 }}>
              {traiteurProches.length === 0 ? (
                <p style={{ fontSize: 13, color: "#6b7469" }}>Aucune commande traiteur sur 3 jours.</p>
              ) : (
                traiteurProches.map((x) => (
                  <Link key={x.id} href="/orders" className="flex items-center gap-3" style={{ padding: "7px 0", borderBottom: "1px solid #efe7d6" }}>
                    <span className="font-mono" style={{ fontSize: 10.5, fontWeight: 600, color: "#b07a2e", background: "rgba(233,162,59,.2)", borderRadius: 100, padding: "2px 8px" }}>
                      {x.due_at ? `${fmtJour.format(new Date(x.due_at)) === aujourdhui ? "AUJ" : fmtJour.format(new Date(x.due_at)) === jPlus1 ? "J+1" : "J+2"} · ${fmtHeure.format(new Date(x.due_at))}` : "—"}
                    </span>
                    <span style={{ flex: 1, fontSize: 12.5, color: "#0e3947", fontWeight: 600 }}>
                      {x.couverts ? `${x.couverts} couverts` : "—"}
                    </span>
                    <span className="font-mono" style={{ fontSize: 12.5, fontWeight: 600, color: "#0e3947" }}>{fmtEuro(x.montant_total)} €</span>
                  </Link>
                ))
              )}
            </div>
          </Card>

          <Card style={{ overflow: "hidden" }}>
            <SectionHeader titre="Alertes vitales" action={<Link href="/notifs" style={{ fontSize: 12, fontWeight: 600, color: "#1493be" }}>Notifications →</Link>} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, padding: 16 }}>
              <Compteur label="Critiques" valeur={alertes.critique} couleur="#c0442e" />
              <Compteur label="Alertes" valeur={alertes.alerte} couleur="#a9761e" />
              <Compteur label="Infos" valeur={alertes.info} couleur="#1493be" />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function Fact({ label, valeur, accent }: { label: string; valeur: string; accent?: string }) {
  return (
    <div style={{ textAlign: "right" }}>
      <p className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: ".08em", color: "#8a7f6a" }}>{label}</p>
      <p className="font-display" style={{ fontSize: 17, fontWeight: 800, color: accent ?? "#0e3947" }}>{valeur}</p>
    </div>
  );
}

function BlocTitre({ titre }: { titre: string }) {
  return (
    <p className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: ".09em", color: "#a79b84", marginBottom: 8 }}>{titre}</p>
  );
}

function Compteur({ label, valeur, couleur }: { label: string; valeur: number; couleur: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p className="font-display" style={{ fontSize: 28, fontWeight: 800, color: valeur > 0 ? couleur : "#c9c1ae" }}>{valeur}</p>
      <p className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: ".07em", color: "#a79b84" }}>{label}</p>
    </div>
  );
}

/** Delta vs J-7 (même jour de semaine) — « — » sans référence (jamais de % sur 0). */
function DeltaPill({ valeur, reference }: { valeur: number; reference: number }) {
  if (reference <= 0) {
    return (
      <span className="font-mono" style={{ fontSize: 10.5, color: "#9a927f" }}>
        vs J-7 : —
      </span>
    );
  }
  const delta = ((valeur - reference) / reference) * 100;
  const positif = delta >= 0;
  return (
    <span
      className="font-mono"
      style={{ fontSize: 11, fontWeight: 600, color: positif ? "#1f8a5b" : "#b00d1a", background: positif ? "#e9f3ec" : "#f7e7e4", borderRadius: 100, padding: "3px 9px" }}
    >
      {positif ? "+" : ""}{delta.toFixed(0)} % vs J-7
    </span>
  );
}
