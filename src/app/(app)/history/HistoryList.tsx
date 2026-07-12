"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { CANAL_COLOR, CANAL_LABEL, CATEGORIE_COLOR, PAIEMENT_LABEL } from "@/lib/nav";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card, SectionHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { ChanFilter, type ChanFilterValue } from "@/components/ui/ChanFilter";
import { fmtEuro } from "@/lib/calculs";
import type { Canal, Emplacement, Paiement, SourceVente } from "@/lib/supabase/database.types";

/** Vente remise aplatie côté serveur (jour/heure précalculés en Europe/Paris). */
export type VenteRemise = {
  id: string;
  occurred_at: string;
  jour: string; // YYYY-MM-DD Europe/Paris
  heure: string; // HH:MM Europe/Paris
  canal: Canal;
  emplacement_id: string | null;
  moyen_paiement: Paiement;
  montant_total: number;
  source_vente: SourceVente;
  client_nom: string | null;
  lignes: {
    libelle: string;
    qte: number | null;
    poids_g: number | null;
    montant: number;
    composants: { nom: string; categorie: string }[];
  }[];
};

const PERIODES = [
  { id: "7j", label: "7 jours", jours: 7 },
  { id: "30j", label: "30 jours", jours: 30 },
  { id: "tout", label: "Tout", jours: Infinity },
] as const;

/**
 * Historique — lit v_vente_remise, la MÊME source que Finances (HANDOFF §03).
 * Lecture seule sur le passé : filtres + détail, aucune mutation.
 */
export function HistoryList({ ventes, emplacements }: { ventes: VenteRemise[]; emplacements: Emplacement[] }) {
  const [periode, setPeriode] = useState<(typeof PERIODES)[number]["id"]>("7j");
  const [filtre, setFiltre] = useState<ChanFilterValue>({ canal: "all", emplacementId: "all" });
  const [recherche, setRecherche] = useState("");
  const [ouverte, setOuverte] = useState<string | null>(null);
  // Instant de référence capturé une fois (règle purity : pas de Date.now() au rendu).
  const [maintenant] = useState(() => Date.now());

  const filtrees = useMemo(() => {
    const p = PERIODES.find((x) => x.id === periode)!;
    const limite = Number.isFinite(p.jours) ? maintenant - p.jours * 86400000 : -Infinity;
    const q = recherche.trim().toLowerCase();
    return ventes.filter((v) => {
      if (new Date(v.occurred_at).getTime() < limite) return false;
      if (filtre.canal !== "all" && v.canal !== filtre.canal) return false;
      if (filtre.canal === "truck" && filtre.emplacementId !== "all" && v.emplacement_id !== filtre.emplacementId) return false;
      if (q && !v.lignes.some((l) => l.libelle.toLowerCase().includes(q)) && !(v.client_nom ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [ventes, periode, filtre, recherche, maintenant]);

  // KPI recalculés en live sur le jeu filtré — panier moyen MASQUÉ si 0 vente (jamais 0/0).
  const ca = filtrees.reduce((acc, v) => acc + v.montant_total, 0);
  const nb = filtrees.length;

  const parJour = useMemo(() => {
    const map = new Map<string, VenteRemise[]>();
    for (const v of filtrees) {
      const arr = map.get(v.jour) ?? [];
      arr.push(v);
      map.set(v.jour, arr);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [filtrees]);

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: 12 }}>
        <div className="flex gap-2">
          {PERIODES.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriode(p.id)}
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
        <div className="flex items-center gap-2" style={{ background: "#f6f1e7", border: "1px solid #dfd4bf", borderRadius: 100, padding: "7px 13px", maxWidth: 260, flex: 1 }}>
          <Search size={14} style={{ color: "#9a927f", flexShrink: 0 }} />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Filtrer par plat ou client…"
            className="outline-none"
            style={{ background: "transparent", fontSize: 12.5, color: "#0e3947", width: "100%" }}
          />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <ChanFilter emplacements={emplacements} value={filtre} onChange={setFiltre} note="Recalcule les KPI en live." />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 20 }}>
        <KpiCard label="CA (remis)" value={`${fmtEuro(ca)} €`} sub="fulfillment = remis uniquement" />
        <KpiCard label="Ventes" value={String(nb)} />
        <KpiCard label="Panier moyen" value={nb > 0 ? `${fmtEuro(ca / nb)} €` : "—"} sub={nb === 0 ? "aucune vente sur le filtre" : undefined} />
      </div>

      {parJour.length === 0 ? (
        <Card style={{ padding: 24 }}>
          <p style={{ fontSize: 13.5, color: "#6b7469" }}>Aucune vente sur cette période / ce filtre.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {parJour.map(([jour, liste]) => {
            const totalJour = liste.reduce((acc, v) => acc + v.montant_total, 0);
            return (
              <Card key={jour} style={{ overflow: "hidden" }}>
                <SectionHeader
                  titre={libelleJour(jour)}
                  compteur={`${liste.length} vente${liste.length > 1 ? "s" : ""} · ${fmtEuro(totalJour)} €`}
                />
                <div>
                  {liste.map((v) => {
                    const depliee = ouverte === v.id;
                    const pastilles = [...new Set(v.lignes.flatMap((l) => l.composants.map((comp) => comp.categorie)))];
                    const resume = v.lignes
                      .map((l) => `${l.qte != null && l.qte > 1 ? `${l.qte} × ` : ""}${l.libelle}${l.poids_g != null ? ` (${l.poids_g} g)` : ""}`)
                      .join(" · ");
                    return (
                      <div key={v.id} style={{ borderBottom: "1px solid #efe7d6" }}>
                        <button
                          onClick={() => setOuverte(depliee ? null : v.id)}
                          className="flex items-center gap-3"
                          style={{ width: "100%", padding: "10px 16px", textAlign: "left" }}
                        >
                          <span className="font-mono" style={{ width: 46, fontSize: 12, color: "#8a7f6a", flexShrink: 0 }}>{v.heure}</span>
                          {depliee ? <ChevronDown size={14} style={{ color: "#9a927f" }} /> : <ChevronRight size={14} style={{ color: "#9a927f" }} />}
                          <span className="flex items-center gap-1" style={{ flexShrink: 0 }}>
                            {pastilles.map((cat) => (
                              <Dot key={cat} color={CATEGORIE_COLOR[cat] ?? "#9a927f"} size={7} />
                            ))}
                          </span>
                          <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: "#0e3947", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {resume}
                            {v.client_nom && <span style={{ color: "#6b7469", fontWeight: 400 }}> — {v.client_nom}</span>}
                          </span>
                          {v.source_vente === "import" && <Badge tone="demo">Import</Badge>}
                          <span
                            className="flex items-center gap-1 font-mono"
                            style={{ fontSize: 10, color: CANAL_COLOR[v.canal], background: `${CANAL_COLOR[v.canal]}18`, borderRadius: 100, padding: "2px 8px", flexShrink: 0 }}
                          >
                            <Dot color={CANAL_COLOR[v.canal]} size={6} />
                            {CANAL_LABEL[v.canal]}
                          </span>
                          <span className="font-mono" style={{ fontSize: 10.5, color: "#6b7469", background: "#f1ead9", borderRadius: 100, padding: "2px 8px", flexShrink: 0 }}>
                            {PAIEMENT_LABEL[v.moyen_paiement]}
                          </span>
                          <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "#0e3947", whiteSpace: "nowrap" }}>
                            {fmtEuro(v.montant_total)} €
                          </span>
                        </button>
                        {depliee && (
                          <div style={{ padding: "0 16px 12px 62px" }}>
                            {v.lignes.map((l, i) => (
                              <div key={i} className="flex items-center gap-2 flex-wrap" style={{ padding: "4px 0", borderTop: i > 0 ? "1px solid #efe7d6" : "none" }}>
                                <span style={{ fontSize: 12.5, color: "#0e3947", fontWeight: 600 }}>
                                  {l.qte != null ? `${l.qte} × ` : ""}{l.libelle}{l.poids_g != null ? ` (${l.poids_g} g)` : ""}
                                </span>
                                {l.composants.map((comp, k) => (
                                  <span key={k} className="flex items-center gap-1 font-mono" style={{ fontSize: 10, color: "#6b7469", background: "#fbf8f1", border: "1px solid #e4dac6", borderRadius: 100, padding: "1px 7px" }}>
                                    <Dot color={CATEGORIE_COLOR[comp.categorie] ?? "#9a927f"} size={5} />
                                    {comp.nom}
                                  </span>
                                ))}
                                <span className="font-mono" style={{ marginLeft: "auto", fontSize: 12, color: "#6b7469" }}>
                                  {fmtEuro(l.montant)} €
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function libelleJour(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const auj = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date());
  const hier = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date(Date.now() - 86400000));
  const libelle = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(date);
  if (iso === auj) return `Aujourd'hui — ${libelle}`;
  if (iso === hier) return `Hier — ${libelle}`;
  return libelle.charAt(0).toUpperCase() + libelle.slice(1);
}
