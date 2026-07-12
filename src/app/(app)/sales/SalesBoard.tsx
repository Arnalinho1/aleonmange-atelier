"use client";

import { useMemo, useState } from "react";
import { CANAL_COLOR, CANAL_LABEL } from "@/lib/nav";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card, SectionHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { ChanFilter, type ChanFilterValue } from "@/components/ui/ChanFilter";
import { fmtEuro } from "@/lib/calculs";
import type { Canal, Emplacement } from "@/lib/supabase/database.types";

export type VenteTendance = {
  id: string;
  occurred_at: string;
  jour: string; // YYYY-MM-DD Europe/Paris
  canal: Canal;
  emplacement_id: string | null;
  montant_total: number;
};
export type LigneTendance = { vente_id: string; libelle: string; qte: number | null };

const PERIODES = [
  { id: "7j", label: "7 jours", jours: 7 },
  { id: "30j", label: "30 jours", jours: 30 },
  { id: "90j", label: "90 jours", jours: 90 },
] as const;

const CANAUX: Canal[] = ["truck", "boutique", "traiteur"];

/**
 * Ventes & tendances — agrégats de v_vente_remise (dérivation, jamais une
 * source parallèle). Saisonnalité 7 jours cliquable (le clic filtre KPI et
 * matrice). Les « invendus » de la maquette (volumes démo) sont hors v1.
 */
export function SalesBoard({
  ventes,
  lignes,
  emplacements,
}: {
  ventes: VenteTendance[];
  lignes: LigneTendance[];
  emplacements: Emplacement[];
}) {
  const [periode, setPeriode] = useState<(typeof PERIODES)[number]["id"]>("7j");
  const [filtre, setFiltre] = useState<ChanFilterValue>({ canal: "all", emplacementId: "all" });
  const [jourPick, setJourPick] = useState<string | null>(null);
  const [maintenant] = useState(() => Date.now());

  const base = useMemo(() => {
    const p = PERIODES.find((x) => x.id === periode)!;
    const limite = maintenant - p.jours * 86400000;
    return ventes.filter(
      (v) =>
        new Date(v.occurred_at).getTime() >= limite &&
        (filtre.canal === "all" || v.canal === filtre.canal) &&
        (filtre.canal !== "truck" || filtre.emplacementId === "all" || v.emplacement_id === filtre.emplacementId)
    );
  }, [ventes, periode, filtre, maintenant]);

  const filtrees = useMemo(
    () => (jourPick ? base.filter((v) => v.jour === jourPick) : base),
    [base, jourPick]
  );

  const ca = filtrees.reduce((acc, v) => acc + v.montant_total, 0);
  const nb = filtrees.length;

  // Matrice plat × canal (sur le jeu filtré)
  const matrice = useMemo(() => {
    const ids = new Set(filtrees.map((v) => v.id));
    const canalParVente = new Map(filtrees.map((v) => [v.id, v.canal]));
    const map = new Map<string, { libelle: string; parCanal: Record<Canal, number>; total: number }>();
    for (const l of lignes) {
      if (!ids.has(l.vente_id)) continue;
      const canal = canalParVente.get(l.vente_id)!;
      const cur = map.get(l.libelle) ?? { libelle: l.libelle, parCanal: { truck: 0, boutique: 0, traiteur: 0 }, total: 0 };
      const q = l.qte ?? 1;
      cur.parCanal[canal] += q;
      cur.total += q;
      map.set(l.libelle, cur);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [filtrees, lignes]);
  const maxCellule = Math.max(1, ...matrice.flatMap((m) => CANAUX.map((c) => m.parCanal[c])));

  // Saisonnalité : 7 derniers jours (indépendante du jour sélectionné)
  const septJours = useMemo(() => {
    const out: { jour: string; label: string; ca: number }[] = [];
    const fmtJour = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });
    const fmtLabel = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", timeZone: "Europe/Paris" });
    for (let i = 6; i >= 0; i--) {
      const d = new Date(maintenant - i * 86400000);
      const jour = fmtJour.format(d);
      out.push({ jour, label: fmtLabel.format(d), ca: base.filter((v) => v.jour === jour).reduce((a, v) => a + v.montant_total, 0) });
    }
    return out;
  }, [base, maintenant]);
  const maxJour = Math.max(1, ...septJours.map((j) => j.ca));
  const meilleurJour = septJours.reduce((best, j) => (j.ca > best.ca ? j : best), septJours[0]);

  // CA par emplacement (si canal truck) — sinon détail par jour
  const parEmplacement = useMemo(() => {
    if (filtre.canal !== "truck") return [];
    const map = new Map<string, number>();
    for (const v of filtrees) {
      if (!v.emplacement_id) continue;
      map.set(v.emplacement_id, (map.get(v.emplacement_id) ?? 0) + v.montant_total);
    }
    return emplacements
      .map((e) => ({ libelle: e.libelle, ca: map.get(e.id) ?? 0 }))
      .filter((x) => x.ca > 0)
      .sort((a, b) => b.ca - a.ca);
  }, [filtrees, filtre.canal, emplacements]);

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: 12 }}>
        <div className="flex gap-2">
          {PERIODES.map((p) => (
            <button
              key={p.id}
              onClick={() => { setPeriode(p.id); setJourPick(null); }}
              style={{
                padding: "7px 13px", borderRadius: 100, fontSize: 12.5, fontWeight: 600,
                border: periode === p.id ? "1px solid transparent" : "1px solid #dfd4bf",
                background: periode === p.id ? "#0e3947" : "#fbf8f1",
                color: periode === p.id ? "#f6f1e7" : "#6b7469",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        {jourPick && (
          <button
            onClick={() => setJourPick(null)}
            className="font-mono"
            style={{ padding: "6px 12px", borderRadius: 100, fontSize: 11.5, fontWeight: 600, background: "rgba(216,16,32,.1)", color: "#b00d1a" }}
          >
            Jour sélectionné : {jourPick} — réinitialiser ✕
          </button>
        )}
        <span className="font-mono" style={{ marginLeft: "auto", fontSize: 11, color: "#9a927f" }}>
          dérivé de v_vente_remise — jamais une source parallèle
        </span>
      </div>

      <ChanFilter emplacements={emplacements} value={filtre} onChange={(v) => { setFiltre(v); setJourPick(null); }} note="Recalcule tout l'écran." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 20 }}>
        <KpiCard variant="light" label="CA" value={`${fmtEuro(ca)} €`} tag={{ label: "Calculé", tone: "calcule" }} />
        <KpiCard variant="light" label="Ventes" value={String(nb)} />
        <KpiCard variant="light" label="Panier moyen" value={nb > 0 ? `${fmtEuro(ca / nb)} €` : "—"} />
        <KpiCard
          variant="light"
          label="Meilleur jour (7 j)"
          value={meilleurJour && meilleurJour.ca > 0 ? meilleurJour.label : "—"}
          sub={meilleurJour && meilleurJour.ca > 0 ? `${fmtEuro(meilleurJour.ca)} €` : "pas encore de tendance"}
        />
      </div>

      {nb === 0 && !jourPick ? (
        <Card style={{ padding: 24, marginBottom: 16 }}>
          <p style={{ fontSize: 13.5, color: "#6b7469" }}>
            Pas encore de tendance — revenez après quelques ventes.
          </p>
        </Card>
      ) : (
        <>
          {/* Matrice plat × canal */}
          <Card style={{ overflow: "hidden", marginBottom: 16 }}>
            <SectionHeader titre="Matrice plat × canal" compteur={`${matrice.length} plat${matrice.length > 1 ? "s" : ""}`} action={<Badge tone="calcule">Calculé</Badge>} />
            {matrice.length === 0 ? (
              <p style={{ fontSize: 13, color: "#6b7469", padding: 16 }}>Aucune ligne sur ce filtre.</p>
            ) : (
              <div style={{ padding: "8px 16px 14px" }}>
                <div
                  className="font-mono uppercase"
                  style={{ display: "grid", gridTemplateColumns: "1.9fr repeat(3,.72fr) .6fr", gap: 6, padding: "6px 0", fontSize: 10, letterSpacing: ".08em", color: "#a79b84", borderBottom: "1px solid #efe7d6" }}
                >
                  <span>Plat</span>
                  {CANAUX.map((c) => (
                    <span key={c} className="flex items-center justify-center gap-1">
                      <Dot color={CANAL_COLOR[c]} size={6} /> {CANAL_LABEL[c].split(" ")[0]}
                    </span>
                  ))}
                  <span style={{ textAlign: "right" }}>Total</span>
                </div>
                {matrice.map((mrow) => (
                  <div
                    key={mrow.libelle}
                    style={{ display: "grid", gridTemplateColumns: "1.9fr repeat(3,.72fr) .6fr", gap: 6, padding: "6px 0", alignItems: "center", borderBottom: "1px solid #efe7d6" }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#0e3947", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mrow.libelle}</span>
                    {CANAUX.map((c) => {
                      const q = mrow.parCanal[c];
                      const alpha = q > 0 ? 0.12 + 0.55 * (q / maxCellule) : 0;
                      return (
                        <span
                          key={c}
                          className="font-mono"
                          style={{
                            textAlign: "center", fontSize: 12, fontWeight: 600, borderRadius: 8, padding: "5px 0",
                            background: q > 0 ? `rgba(20,147,190,${alpha.toFixed(2)})` : "transparent",
                            color: q > 0 ? "#0e3947" : "#c9c1ae",
                          }}
                        >
                          {q > 0 ? q : "·"}
                        </span>
                      );
                    })}
                    <span className="font-display" style={{ fontSize: 14, fontWeight: 800, color: "#0e3947", textAlign: "right" }}>{mrow.total}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Saisonnalité 7 jours + carte latérale */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, alignItems: "start" }} className="fz-users-grid">
            <Card style={{ padding: 16 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "#0e3947" }}>Saisonnalité — 7 jours</p>
                <Badge tone="calcule">Calculé · occurred_at</Badge>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8, alignItems: "end", height: 150 }}>
                {septJours.map((j) => (
                  <button
                    key={j.jour}
                    onClick={() => setJourPick(jourPick === j.jour ? null : j.jour)}
                    title={`${j.label} · ${fmtEuro(j.ca)} €`}
                    className="flex flex-col items-center justify-end transition-opacity hover:opacity-80"
                    style={{ height: "100%" }}
                  >
                    <span className="font-mono" style={{ fontSize: 9.5, color: "#8a7f6a", marginBottom: 3 }}>
                      {j.ca > 0 ? fmtEuro(j.ca) : ""}
                    </span>
                    <span
                      style={{
                        width: "100%",
                        height: `${Math.max(j.ca > 0 ? 8 : 2, (j.ca / maxJour) * 100)}%`,
                        borderRadius: "6px 6px 0 0",
                        background: jourPick === j.jour ? "#d81020" : j.ca > 0 ? "#1493be" : "#e4dac6",
                      }}
                    />
                  </button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8, marginTop: 6 }}>
                {septJours.map((j) => (
                  <span key={j.jour} className="font-mono" style={{ fontSize: 9.5, color: jourPick === j.jour ? "#b00d1a" : "#a79b84", textAlign: "center" }}>
                    {j.label}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "#9a927f", marginTop: 10 }}>
                Cliquez un jour pour filtrer les KPI et la matrice.
              </p>
            </Card>

            <Card style={{ overflow: "hidden" }}>
              <SectionHeader titre={filtre.canal === "truck" ? "CA par emplacement" : "Détail par jour"} />
              <div style={{ padding: 16 }}>
                {filtre.canal === "truck" ? (
                  parEmplacement.length === 0 ? (
                    <p style={{ fontSize: 12.5, color: "#6b7469" }}>Aucune vente truck sur le filtre.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {parEmplacement.map((e) => (
                        <div key={e.libelle}>
                          <div className="flex items-center justify-between" style={{ marginBottom: 3 }}>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0e3947" }}>{e.libelle}</span>
                            <span className="font-mono" style={{ fontSize: 12, fontWeight: 600, color: "#0e3947" }}>{fmtEuro(e.ca)} €</span>
                          </div>
                          <div style={{ height: 7, borderRadius: 100, background: "#e4dac6" }}>
                            <div style={{ width: `${(e.ca / Math.max(1, parEmplacement[0].ca)) * 100}%`, height: "100%", borderRadius: 100, background: "#b07a2e" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="flex flex-col">
                    {septJours.filter((j) => j.ca > 0).length === 0 ? (
                      <p style={{ fontSize: 12.5, color: "#6b7469" }}>Pas de ventes sur les 7 derniers jours.</p>
                    ) : (
                      septJours
                        .filter((j) => j.ca > 0)
                        .map((j) => (
                          <div key={j.jour} className="flex items-center justify-between" style={{ padding: "6px 0", borderBottom: "1px solid #efe7d6" }}>
                            <span className="font-mono" style={{ fontSize: 12, color: "#6b7469" }}>{j.label}</span>
                            <span className="font-mono" style={{ fontSize: 12.5, fontWeight: 600, color: "#0e3947" }}>{fmtEuro(j.ca)} €</span>
                          </div>
                        ))
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
