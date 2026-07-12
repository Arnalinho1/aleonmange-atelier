"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronRight, Plus, RotateCcw, ShoppingCart, X } from "lucide-react";
import { CATEGORIE_COLOR, CATEGORIE_LABEL } from "@/lib/nav";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card, SectionHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { fmtEuro } from "@/lib/calculs";
import { seuilEffectif } from "@/lib/stock";
import type { Composant, Lot, ReapproLigne } from "@/lib/supabase/database.types";
import { ajusterStock, definirSeuil, enregistrerReception, retirerSeuil, upsertReappro } from "./actions";

export type StockComposant = {
  composant: Composant;
  stock: number;
  seuil: number | null;
  lots: Lot[];
  reappro: ReapproLigne | null;
};

type DrawerStock =
  | { mode: "reception" }
  | { mode: "ajuster"; ligne: StockComposant }
  | { mode: "seuil"; ligne: StockComposant }
  | null;

type LigneRachat = {
  ligne: StockComposant;
  seuilEff: number;
  rupture: boolean;
  manque: number;
  suggere: number;
  qte: number;
  override: boolean;
  cout: number | null;
  commande: boolean;
};

/**
 * Stocks — deux onglets (handoff « Profil & Stock » §02) :
 * · Niveaux : inventaire par composant (stock = Σ mouvements signés), lots +
 *   DLC (rotation FEFO), seuils. Statut vs SEUIL EFFECTIF (override ?? défaut
 *   par catégorie — src/lib/stock.ts, source unique).
 * · À racheter : liste de courses persistée (reappro_ligne). Manque = CALCULÉ,
 *   quantité suggérée = ESTIMÉE (cible forfaitaire 2×seuil). S'arrête au flag
 *   « commandé » — l'entrée en stock reste l'action Ajuster.
 */
export function StockBoard({ lignes }: { lignes: StockComposant[] }) {
  const router = useRouter();
  const [onglet, setOnglet] = useState<"niveaux" | "racheter">("niveaux");
  const [drawer, setDrawer] = useState<DrawerStock>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  // Brouillons locaux des inputs de la liste (persistés au blur).
  const [qtes, setQtes] = useState<Record<string, string>>({});
  const [fournisseurs, setFournisseurs] = useState<Record<string, string>>({});

  const seuils = useMemo(
    () => new Map(lignes.map((l) => [l.composant.id, seuilEffectif(l.composant, l.seuil)])),
    [lignes]
  );
  const sousSeuil = lignes.filter((l) => l.stock < (seuils.get(l.composant.id)?.valeur ?? 0));

  // Liste d'achat : composants sous seuil effectif (rupture incluse).
  const rachats: LigneRachat[] = useMemo(() => {
    return lignes
      .filter((l) => l.stock < (seuils.get(l.composant.id)?.valeur ?? 0))
      .map((l) => {
        const seuilEff = seuils.get(l.composant.id)!.valeur;
        const manque = arrondi(Math.max(0, seuilEff - l.stock)); // CALCULÉ
        const suggere = arrondi(Math.max(0, 2 * seuilEff - l.stock)); // ESTIMÉ (cible forfaitaire 2×seuil)
        const brouillon = qtes[l.composant.id];
        const persiste = l.reappro?.qte_retenue != null ? Number(l.reappro.qte_retenue) : null;
        const override = brouillon != null ? brouillon.trim() !== "" : persiste != null;
        const qte = brouillon != null && brouillon.trim() !== ""
          ? Math.max(0, Number(brouillon.replace(",", ".")) || 0)
          : (persiste ?? suggere);
        // Coût : qté × €/kg — composants à la pièce non convertibles sans poids (B8).
        const cout =
          l.composant.unite === "piece" || l.composant.cout_matiere_kg == null
            ? null
            : arrondi(qte * Number(l.composant.cout_matiere_kg));
        return {
          ligne: l,
          seuilEff,
          rupture: l.stock <= 0,
          manque,
          suggere,
          qte,
          override,
          cout,
          commande: l.reappro?.commande ?? false,
        };
      })
      .sort(
        (a, b) =>
          Number(a.commande) - Number(b.commande) ||
          Number(b.rupture) - Number(a.rupture) ||
          (b.cout ?? 0) - (a.cout ?? 0)
      );
  }, [lignes, seuils, qtes]);

  const aCommander = rachats.filter((r) => !r.commande);
  const dejaCommande = rachats.filter((r) => r.commande);

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

  async function sauver(composantId: string, patch: Parameters<typeof upsertReappro>[1]) {
    setError(undefined);
    const res = await upsertReappro(composantId, patch);
    if (res?.error) setError(res.error);
    else router.refresh();
  }

  return (
    <>
      {/* Tabs segmentés Niveaux | À racheter */}
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 16 }}>
        <div className="flex" style={{ background: "#ede7da", borderRadius: 100, padding: 4, width: "fit-content" }}>
          {(["niveaux", "racheter"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setOnglet(t)}
              className="flex items-center gap-2"
              style={{
                padding: "7px 16px", borderRadius: 100, fontSize: 13, fontWeight: 600,
                background: onglet === t ? "#0e3947" : "transparent",
                color: onglet === t ? "#f6f1e7" : "#6b7469",
              }}
            >
              {t === "niveaux" ? "Niveaux" : "À racheter"}
              {t === "racheter" && rachats.length > 0 && (
                <span
                  className="font-mono grid place-items-center rounded-full"
                  style={{
                    fontSize: 10.5, minWidth: 19, height: 19, padding: "0 6px",
                    background: onglet === t ? "rgba(255,255,255,.16)" : "rgba(216,16,32,.14)",
                    color: onglet === t ? "#f6f1e7" : "#b00d1a",
                  }}
                >
                  {rachats.length}
                </span>
              )}
            </button>
          ))}
        </div>
        {onglet === "niveaux" && (
          <button
            onClick={() => { setError(undefined); setDrawer({ mode: "reception" }); }}
            className="flex items-center gap-2 font-display transition-opacity hover:opacity-90"
            style={{ background: "#1493be", color: "#f6f1e7", fontWeight: 700, fontSize: 14, padding: "9px 15px", borderRadius: 11 }}
          >
            <Plus size={16} strokeWidth={2.4} />
            Saisir une réception
          </button>
        )}
      </div>

      {error && (
        <p style={{ fontSize: 12.5, color: "#c0442e", background: "rgba(192,68,46,.1)", borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>{error}</p>
      )}

      {onglet === "niveaux" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 20 }} className="fz-stock-kpi">
            <KpiCard label="Composants suivis" value={String(lignes.length)} />
            <KpiCard label="Sous le seuil" value={String(sousSeuil.length)} sub={sousSeuil.length > 0 ? sousSeuil.map((s) => s.composant.nom).slice(0, 2).join(", ") : "aucune alerte"} />
            <KpiCard label="Lots en cours" value={String(lotsEnCours.length)} />
            <KpiCard label="Prochaine DLC" value={prochaineDlc ? fmtDate(prochaineDlc) : "—"} sub="rotation FEFO" />
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
                  const se = seuils.get(l.composant.id)!;
                  const statut: { tone: "succes" | "alerte" | "critique"; label: string } =
                    l.stock <= 0
                      ? { tone: "critique", label: "Rupture" }
                      : l.stock < se.valeur
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
                              {CATEGORIE_LABEL[l.composant.categorie]} · seuil {fmtKg(se.valeur)} {uniteAbr(l.composant.unite)}{se.source === "defaut" ? " (défaut)" : ""} · {l.lots.length} lot{l.lots.length > 1 ? "s" : ""}
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
        </>
      ) : (
        <>
          {/* KPIs liste d'achat */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 16 }} className="fz-stock-kpi">
            <KpiCard label="Références à racheter" value={String(rachats.length)} sub={`${rachats.filter((r) => r.rupture).length} en rupture`} />
            <KpiCard label="À commander" value={fmtEuro(aCommander.reduce((t, r) => t + (r.cout ?? 0), 0))} sub={`${aCommander.length} ligne${aCommander.length > 1 ? "s" : ""}`} />
            <KpiCard label="Déjà commandé" value={fmtEuro(dejaCommande.reduce((t, r) => t + (r.cout ?? 0), 0))} sub={`${dejaCommande.length} ligne${dejaCommande.length > 1 ? "s" : ""}`} />
          </div>

          {/* Bandeau honnêteté + périmètre */}
          <div className="flex items-center gap-3" style={{ background: "rgba(63,168,206,.1)", border: "1px solid rgba(63,168,206,.25)", borderRadius: 14, padding: "11px 18px", marginBottom: 16 }}>
            <span className="grid place-items-center shrink-0" style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(20,147,190,.15)", color: "#1493be" }}>
              <ShoppingCart size={16} />
            </span>
            <p style={{ fontSize: 13, color: "#38474e" }}>
              <strong style={{ color: "#0e6e8f" }}>Le manque</strong> (seuil − stock) est <strong>calculé</strong>.{" "}
              La <strong style={{ color: "#0e6e8f" }}>quantité suggérée</strong> vient d&apos;une cible de réassort forfaitaire (2×seuil) —{" "}
              <strong>estimation</strong> jusqu&apos;à ce que la conso réelle l&apos;alimente.{" "}
              Liste de courses uniquement : l&apos;entrée en stock reste l&apos;action <strong>Ajuster</strong>{" "}
              de l&apos;onglet Niveaux.
            </p>
          </div>

          <Card style={{ overflow: "hidden" }}>
            <div
              className="font-mono uppercase flex items-center gap-3"
              style={{ padding: "10px 20px", fontSize: 10, letterSpacing: ".07em", color: "#a79b84", borderBottom: "1px solid #efe7d6" }}
            >
              <span style={{ flex: "0 0 22px" }} />
              <span style={{ flex: 1 }}>Composant</span>
              <span style={{ flex: "0 0 110px" }}>Stock / seuil</span>
              <span style={{ flex: "0 0 84px", textAlign: "center" }}>Manque <TagCol>calculé</TagCol></span>
              <span style={{ flex: "0 0 96px", textAlign: "center" }}>Quantité <TagCol>estimé</TagCol></span>
              <span style={{ flex: "0 0 140px" }}>Fournisseur <span style={{ textTransform: "none", letterSpacing: 0, color: "#c0b69e" }}>· option.</span></span>
              <span style={{ flex: "0 0 88px", textAlign: "right" }}>Coût est.</span>
            </div>

            {rachats.length === 0 ? (
              <div style={{ padding: "48px 36px", textAlign: "center" }}>
                <div className="grid place-items-center" style={{ width: 46, height: 46, borderRadius: 13, margin: "0 auto 14px", background: "rgba(20,147,190,.14)", color: "#1493be" }}>
                  <Check size={24} strokeWidth={2.2} />
                </div>
                <p className="font-display" style={{ fontWeight: 700, fontSize: 17, color: "#0e3947" }}>Tout est au-dessus du seuil</p>
                <p style={{ fontSize: 13.5, color: "#8a7f6a", marginTop: 5, maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>
                  Aucun composant à racheter pour l&apos;instant. La liste se remplit dès qu&apos;un stock passe sous son seuil d&apos;alerte.
                </p>
              </div>
            ) : (
              rachats.map((r) => {
                const id = r.ligne.composant.id;
                const abr = uniteAbr(r.ligne.composant.unite);
                return (
                  <div key={id} className="flex items-center gap-3" style={{ padding: "12px 20px", borderBottom: "1px solid #efe7d6", opacity: r.commande ? 0.52 : 1 }}>
                    <button
                      onClick={() => sauver(id, { commande: !r.commande })}
                      title={r.commande ? "Retirer des commandes" : "Marquer comme commandé"}
                      className="grid place-items-center shrink-0"
                      style={{
                        width: 22, height: 22, borderRadius: 7,
                        border: r.commande ? "none" : "2px solid #cdbf9f",
                        background: r.commande ? "#1493be" : "#fbf8f1",
                        color: r.commande ? "#fff" : "transparent",
                      }}
                    >
                      <Check size={13} strokeWidth={3.2} />
                    </button>
                    <span className="flex items-center gap-2.5" style={{ flex: 1, minWidth: 0 }}>
                      <Dot color={CATEGORIE_COLOR[r.ligne.composant.categorie]} size={7} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "#0e3947", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {r.ligne.composant.nom}
                        </span>
                        <span className="font-mono" style={{ fontSize: 10, color: "#a79b84" }}>
                          {CATEGORIE_LABEL[r.ligne.composant.categorie]}
                        </span>
                      </span>
                    </span>
                    <span style={{ flex: "0 0 110px" }}>
                      <span className="font-mono" style={{ display: "block", fontSize: 12, color: "#0e3947" }}>
                        {fmtKg(r.ligne.stock)} / {fmtKg(r.seuilEff)} {abr}
                      </span>
                      <Badge tone={r.rupture ? "critique" : "alerte"}>{r.rupture ? "Rupture" : "Sous seuil"}</Badge>
                    </span>
                    <span className="font-mono" style={{ flex: "0 0 84px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#b00d1a" }}>
                      −{fmtKg(r.manque)} {abr}
                    </span>
                    <span style={{ flex: "0 0 96px" }}>
                      <input
                        value={qtes[id] ?? (r.ligne.reappro?.qte_retenue != null ? String(r.ligne.reappro.qte_retenue).replace(".", ",") : "")}
                        onChange={(e) => setQtes({ ...qtes, [id]: e.target.value })}
                        onBlur={(e) => {
                          const raw = e.target.value.replace(",", ".").trim();
                          const n = raw === "" ? null : Math.max(0, Number(raw) || 0);
                          const persiste = r.ligne.reappro?.qte_retenue != null ? Number(r.ligne.reappro.qte_retenue) : null;
                          if (n !== persiste) sauver(id, { qte_retenue: n });
                        }}
                        inputMode="decimal"
                        placeholder={fmtKg(r.suggere)}
                        className="font-mono outline-none"
                        style={{
                          width: "100%", fontSize: 13.5, fontWeight: 700, textAlign: "center", padding: "8px 6px",
                          border: `1.5px solid ${r.override ? "#3fa8ce" : "#dcd1bb"}`, borderRadius: 9,
                          background: r.commande ? "#ede7da" : "#fbf8f1", color: "#0e3947",
                        }}
                      />
                      <span className="font-mono" style={{ display: "block", fontSize: 9.5, color: "#a79b84", textAlign: "center", marginTop: 3 }}>
                        sugg. {fmtKg(r.suggere)} {abr}{r.override ? " · ajusté" : ""}
                      </span>
                    </span>
                    <span style={{ flex: "0 0 140px" }}>
                      <input
                        value={fournisseurs[id] ?? (r.ligne.reappro?.fournisseur ?? "")}
                        onChange={(e) => setFournisseurs({ ...fournisseurs, [id]: e.target.value })}
                        onBlur={(e) => {
                          const v = e.target.value.trim() || null;
                          if (v !== (r.ligne.reappro?.fournisseur ?? null)) sauver(id, { fournisseur: v });
                        }}
                        placeholder="ex : Metro"
                        className="outline-none"
                        style={{
                          width: "100%", fontSize: 12.5, padding: "8px 10px", border: "1px solid #dcd1bb", borderRadius: 9,
                          background: r.commande ? "#ede7da" : "#fbf8f1", color: "#38474e",
                        }}
                      />
                    </span>
                    <span className="font-mono" style={{ flex: "0 0 88px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#0e3947" }}>
                      {r.cout != null ? fmtEuro(r.cout) : "—"}
                    </span>
                  </div>
                );
              })
            )}
          </Card>
        </>
      )}

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
                <p style={{ fontSize: 13, color: "#6b7469" }}>
                  Seuil effectif actuel :{" "}
                  <strong className="font-mono" style={{ color: "#0e3947" }}>
                    {fmtKg(seuils.get(drawer.ligne.composant.id)!.valeur)} {uniteAbr(drawer.ligne.composant.unite)}
                  </strong>{" "}
                  {seuils.get(drawer.ligne.composant.id)!.source === "defaut"
                    ? `— défaut hérité de la catégorie ${CATEGORIE_LABEL[drawer.ligne.composant.categorie]}.`
                    : "— réglé pour ce composant."}
                </p>
                <label className="flex flex-col gap-1.5">
                  <Libelle>Seuil bas (unité du composant) — vide pour revenir au défaut</Libelle>
                  <input
                    name="seuil"
                    defaultValue={drawer.ligne.seuil != null ? String(drawer.ligne.seuil).replace(".", ",") : ""}
                    inputMode="decimal"
                    placeholder="ex : 2,0"
                    className="outline-none"
                    style={champ}
                  />
                </label>
                {drawer.ligne.seuil != null && (
                  <button
                    type="button"
                    onClick={() => {
                      setError(undefined);
                      startTransition(async () => {
                        const res = await retirerSeuil(drawer.ligne.composant.id);
                        if (res?.error) setError(res.error);
                        else {
                          setDrawer(null);
                          router.refresh();
                        }
                      });
                    }}
                    className="flex items-center gap-1.5"
                    style={{ fontSize: 12.5, fontWeight: 600, color: "#b07a2e", width: "fit-content" }}
                  >
                    <RotateCcw size={13} /> Revenir au défaut de la catégorie
                  </button>
                )}
                <p style={{ fontSize: 12, color: "#9a927f" }}>
                  Sous ce seuil, le composant passe en statut « Bas » et entre dans la liste À racheter.
                  Sans réglage, un défaut par catégorie s&apos;applique (forfait révisable — chantier règles).
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

/** Tag de colonne — honnêteté des données : calculé vs estimé (§2.2). */
function TagCol({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ textTransform: "none", letterSpacing: 0, color: "#c0b69e" }}>· {children}</span>
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

function arrondi(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmtKg(n: number): string {
  return (Math.round(n * 1000) / 1000).toString().replace(".", ",");
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Europe/Paris" }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));
}
