"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import { CATEGORIE_COLOR, CATEGORIE_LABEL } from "@/lib/nav";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card, SectionHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import type { Composant, Lot } from "@/lib/supabase/database.types";
import { ajusterStock, definirSeuil, enregistrerReception } from "./actions";

export type StockComposant = {
  composant: Composant;
  stock: number;
  seuil: number | null;
  lots: Lot[];
};

type DrawerStock =
  | { mode: "reception" }
  | { mode: "ajuster"; ligne: StockComposant }
  | { mode: "seuil"; ligne: StockComposant }
  | null;

/**
 * Stocks — inventaire par composant (stock = Σ mouvements signés), lots +
 * DLC (rotation FEFO), seuils. Les RÈGLES d'alerte automatiques (notifs)
 * restent le POINT OUVERT #2 — ici, seul le statut visuel sous seuil
 * utilisateur est affiché.
 */
export function StockBoard({ lignes }: { lignes: StockComposant[] }) {
  const router = useRouter();
  const [drawer, setDrawer] = useState<DrawerStock>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const sousSeuil = lignes.filter((l) => l.seuil != null && l.stock < l.seuil);
  const lotsEnCours = useMemo(
    () =>
      lignes
        .flatMap((l) => l.lots.map((lot) => ({ lot, composant: l.composant })))
        .filter((x) => x.lot.dlc != null)
        .sort((a, b) => (a.lot.dlc ?? "").localeCompare(b.lot.dlc ?? "")),
    [lignes]
  );
  const prochaineDlc = lotsEnCours[0]?.lot.dlc ?? null;

  function soumettre(action: typeof enregistrerReception, formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const res = await action(undefined, formData);
      if (res?.error) setError(res.error);
      else {
        setDrawer(null);
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className="flex justify-end" style={{ marginBottom: 16 }}>
        <button
          onClick={() => { setError(undefined); setDrawer({ mode: "reception" }); }}
          className="flex items-center gap-2 font-display transition-opacity hover:opacity-90"
          style={{ background: "#1493be", color: "#f6f1e7", fontWeight: 700, fontSize: 14, padding: "9px 15px", borderRadius: 11 }}
        >
          <Plus size={16} strokeWidth={2.4} />
          Saisir une réception
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 20 }} className="fz-stock-kpi">
        <KpiCard label="Composants suivis" value={String(lignes.length)} />
        <KpiCard label="Sous le seuil" value={String(sousSeuil.length)} sub={sousSeuil.length > 0 ? sousSeuil.map((s) => s.composant.nom).slice(0, 2).join(", ") : "aucune alerte"} />
        <KpiCard label="Lots en cours" value={String(lotsEnCours.length)} />
        <KpiCard label="Prochaine DLC" value={prochaineDlc ? fmtDate(prochaineDlc) : "—"} sub="seuils d'alerte à valider (point ouvert)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, alignItems: "start" }} className="fz-users-grid">
        {/* Tableau composants */}
        <Card style={{ overflow: "hidden" }}>
          <SectionHeader titre="Inventaire par composant" sous="Stock = Σ mouvements (réceptions, sorties, ajustements) en kg." />
          <div>
            <div
              className="font-mono uppercase"
              style={{ display: "grid", gridTemplateColumns: "1.6fr .8fr .7fr .9fr", gap: 8, padding: "8px 16px", fontSize: 10, letterSpacing: ".08em", color: "#a79b84", borderBottom: "1px solid #efe7d6" }}
            >
              <span>Composant</span>
              <span style={{ textAlign: "right" }}>Stock</span>
              <span>Statut</span>
              <span style={{ textAlign: "right" }}>Inventaire</span>
            </div>
            {lignes.map((l) => {
              const deplie = ouvert === l.composant.id;
              const statut: { tone: "succes" | "alerte" | "critique"; label: string } =
                l.stock <= 0
                  ? { tone: "critique", label: "Rupture" }
                  : l.seuil != null && l.stock < l.seuil
                    ? { tone: "alerte", label: "Bas" }
                    : { tone: "succes", label: "OK" };
              return (
                <div key={l.composant.id} style={{ borderBottom: "1px solid #efe7d6" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.6fr .8fr .7fr .9fr", gap: 8, padding: "10px 16px", alignItems: "center" }}>
                    <button onClick={() => setOuvert(deplie ? null : l.composant.id)} className="flex items-center gap-2" style={{ textAlign: "left" }}>
                      {deplie ? <ChevronDown size={14} style={{ color: "#9a927f" }} /> : <ChevronRight size={14} style={{ color: "#9a927f" }} />}
                      <Dot color={CATEGORIE_COLOR[l.composant.categorie]} size={7} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "#0e3947" }}>{l.composant.nom}</span>
                        <span className="font-mono" style={{ fontSize: 10, color: "#a79b84" }}>
                          {CATEGORIE_LABEL[l.composant.categorie]} · seuil {l.seuil != null ? `${fmtKg(l.seuil)} ${uniteAbr(l.composant.unite)}` : "—"} · {l.lots.length} lot{l.lots.length > 1 ? "s" : ""}
                        </span>
                      </span>
                    </button>
                    <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: "#0e3947", textAlign: "right" }}>
                      {fmtKg(l.stock)} {uniteAbr(l.composant.unite)}
                    </span>
                    <span><Badge tone={statut.tone}>{statut.label}</Badge></span>
                    <span className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setError(undefined); setDrawer({ mode: "ajuster", ligne: l }); }}
                        style={{ fontSize: 12, fontWeight: 600, color: "#1493be" }}
                      >
                        Ajuster
                      </button>
                      <button
                        onClick={() => { setError(undefined); setDrawer({ mode: "seuil", ligne: l }); }}
                        style={{ fontSize: 12, fontWeight: 600, color: "#b07a2e" }}
                      >
                        Seuil
                      </button>
                    </span>
                  </div>
                  {deplie && (
                    <div style={{ margin: "0 16px 12px", background: "#f1ead9", borderRadius: 10, padding: "10px 12px" }}>
                      <p className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: ".08em", color: "#8a7f6a", marginBottom: 6 }}>
                        Lots · rotation FEFO (première DLC sortie la première)
                      </p>
                      {l.lots.length === 0 ? (
                        <p style={{ fontSize: 12, color: "#6b7469" }}>Aucun lot enregistré.</p>
                      ) : (
                        <div>
                          <div className="font-mono uppercase" style={{ display: "grid", gridTemplateColumns: "1fr .8fr .6fr .8fr", gap: 6, fontSize: 9, color: "#a79b84", paddingBottom: 4 }}>
                            <span>N° lot</span><span>Reçu le</span><span style={{ textAlign: "right" }}>Qté</span><span style={{ textAlign: "right" }}>DLC</span>
                          </div>
                          {[...l.lots]
                            .sort((a, b) => (a.dlc ?? "9999").localeCompare(b.dlc ?? "9999"))
                            .map((lot) => (
                              <div key={lot.id} className="font-mono" style={{ display: "grid", gridTemplateColumns: "1fr .8fr .6fr .8fr", gap: 6, fontSize: 11.5, color: "#0e3947", padding: "3px 0", borderTop: "1px solid #e4dac6" }}>
                                <span>{lot.numero ?? "—"}</span>
                                <span>{lot.recu_le ? fmtDate(lot.recu_le) : "—"}</span>
                                <span style={{ textAlign: "right" }}>{lot.quantite != null ? `${fmtKg(lot.quantite)} ${uniteAbr(l.composant.unite)}` : "—"}</span>
                                <span style={{ textAlign: "right", color: "#b07a2e", fontWeight: 600 }}>{lot.dlc ? fmtDate(lot.dlc) : "—"}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Lots en cours / DLC */}
        <Card style={{ overflow: "hidden" }}>
          <SectionHeader titre="Lots en cours · DLC" sous="Triés par date limite (FEFO)." />
          <div style={{ padding: 16 }}>
            {lotsEnCours.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "#6b7469" }}>Aucun lot daté en cours.</p>
            ) : (
              lotsEnCours.map(({ lot, composant }) => (
                <div key={lot.id} className="flex items-center gap-2" style={{ padding: "7px 0", borderBottom: "1px solid #efe7d6" }}>
                  <Dot color={CATEGORIE_COLOR[composant.categorie]} size={7} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#0e3947" }}>{composant.nom}</span>
                    <span className="font-mono" style={{ fontSize: 10, color: "#a79b84" }}>
                      {lot.numero ?? "sans n°"} · {lot.quantite != null ? `${fmtKg(lot.quantite)} ${uniteAbr(composant.unite)}` : "—"}
                    </span>
                  </span>
                  <span className="font-mono" style={{ fontSize: 11.5, fontWeight: 600, color: "#b07a2e" }}>
                    DLC {lot.dlc ? fmtDate(lot.dlc) : "—"}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Drawer réception / ajustement / seuil */}
      {drawer && (
        <div className="fixed inset-0 flex justify-end" style={{ background: "rgba(15,24,19,.5)", zIndex: 70 }} onClick={() => setDrawer(null)}>
          <div
            className="fz-scroll h-full overflow-y-auto"
            style={{ width: "min(420px,92vw)", background: "#fbf8f1", boxShadow: "-20px 0 60px rgba(0,0,0,.25)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between" style={{ background: "#0e3947", padding: "18px 20px" }}>
              <div>
                <p className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: ".14em", color: "#8fcfe2" }}>Stocks</p>
                <p className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "#f6f1e7" }}>
                  {drawer.mode === "reception" ? "Saisir une réception" : drawer.mode === "ajuster" ? `Ajuster — ${drawer.ligne.composant.nom}` : `Seuil — ${drawer.ligne.composant.nom}`}
                </p>
              </div>
              <button onClick={() => setDrawer(null)} style={{ color: "#8fcfe2" }}><X size={20} /></button>
            </div>

            {drawer.mode === "reception" && (
              <form action={(fd) => soumettre(enregistrerReception, fd)} className="flex flex-col gap-4" style={{ padding: 20 }}>
                <label className="flex flex-col gap-1.5">
                  <Libelle>Composant</Libelle>
                  <select name="composant_id" required className="outline-none" style={champ}>
                    <option value="">— choisir —</option>
                    {lignes.map((l) => (
                      <option key={l.composant.id} value={l.composant.id}>{l.composant.nom}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <Libelle>Quantité reçue (kg / pièces / L selon le composant)</Libelle>
                  <input name="quantite" required inputMode="decimal" placeholder="ex : 5,0" className="outline-none" style={champ} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <Libelle>N° de lot (optionnel)</Libelle>
                  <input name="numero" placeholder="ex : LOT-2026-041" className="outline-none" style={champ} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <Libelle>DLC (optionnel)</Libelle>
                  <input name="dlc" type="date" className="outline-none" style={champ} />
                </label>
                <PiedDrawer pending={pending} error={error} onCancel={() => setDrawer(null)} label="Enregistrer la réception" />
              </form>
            )}

            {drawer.mode === "ajuster" && (
              <form action={(fd) => soumettre(ajusterStock, fd)} className="flex flex-col gap-4" style={{ padding: 20 }}>
                <input type="hidden" name="composant_id" value={drawer.ligne.composant.id} />
                <p style={{ fontSize: 13, color: "#6b7469" }}>
                  Stock théorique actuel : <strong className="font-mono" style={{ color: "#0e3947" }}>{fmtKg(drawer.ligne.stock)} {uniteAbr(drawer.ligne.composant.unite)}</strong>
                </p>
                <label className="flex flex-col gap-1.5">
                  <Libelle>Comptage réel (dans l&apos;unité du composant)</Libelle>
                  <input name="comptage" required inputMode="decimal" placeholder="ex : 3,2" className="outline-none font-display" style={{ ...champ, fontSize: 22, fontWeight: 700 }} />
                </label>
                <p style={{ fontSize: 12, color: "#9a927f", background: "#f1ead9", borderRadius: 8, padding: "8px 10px" }}>
                  L&apos;écart d&apos;inventaire est calculé côté serveur et journalisé en mouvement « ajustement ».
                </p>
                <PiedDrawer pending={pending} error={error} onCancel={() => setDrawer(null)} label="Valider l'inventaire" />
              </form>
            )}

            {drawer.mode === "seuil" && (
              <form action={(fd) => soumettre(definirSeuil, fd)} className="flex flex-col gap-4" style={{ padding: 20 }}>
                <input type="hidden" name="composant_id" value={drawer.ligne.composant.id} />
                <label className="flex flex-col gap-1.5">
                  <Libelle>Seuil bas (unité du composant) — vide pour retirer</Libelle>
                  <input
                    name="seuil"
                    defaultValue={drawer.ligne.seuil != null ? String(drawer.ligne.seuil).replace(".", ",") : ""}
                    inputMode="decimal"
                    placeholder="ex : 2,0"
                    className="outline-none"
                    style={champ}
                  />
                </label>
                <p style={{ fontSize: 12, color: "#9a927f" }}>
                  Sous ce seuil, le composant passe en statut « Bas ». Les alertes automatiques (notifications)
                  restent à valider — point ouvert.
                </p>
                <PiedDrawer pending={pending} error={error} onCancel={() => setDrawer(null)} label="Enregistrer le seuil" />
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const champ: React.CSSProperties = { background: "#fff", border: "1px solid #dfd4bf", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "#0e3947" };

function Libelle({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: ".1em", color: "#9a927f" }}>
      {children}
    </span>
  );
}

function PiedDrawer({ pending, error, onCancel, label }: { pending: boolean; error?: string; onCancel: () => void; label: string }) {
  return (
    <>
      {error && (
        <p style={{ fontSize: 12.5, color: "#c0442e", background: "rgba(192,68,46,.1)", borderRadius: 8, padding: "8px 10px" }}>{error}</p>
      )}
      <div className="flex gap-2" style={{ marginTop: 4 }}>
        <button type="button" onClick={onCancel} style={{ flex: 1, padding: "11px", borderRadius: 11, border: "1px solid #dfd4bf", background: "#fbf8f1", fontSize: 14, fontWeight: 600, color: "#6b7469" }}>
          Annuler
        </button>
        <button type="submit" disabled={pending} className="font-display" style={{ flex: 1, padding: "11px", borderRadius: 11, background: "#1493be", color: "#f6f1e7", fontWeight: 700, fontSize: 14, opacity: pending ? 0.6 : 1 }}>
          {pending ? "…" : label}
        </button>
      </div>
    </>
  );
}

/** Abréviation d'affichage de l'unité de stock du composant (0009). */
function uniteAbr(unite: string): string {
  return unite === "piece" ? "pc" : unite === "l" ? "L" : "kg";
}

function fmtKg(n: number): string {
  return (Math.round(n * 1000) / 1000).toString().replace(".", ",");
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Europe/Paris" }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));
}
