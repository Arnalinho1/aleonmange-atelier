"use client";

import { useMemo, useState } from "react";
import { CANAL_COLOR, CANAL_LABEL } from "@/lib/nav";
import { fmtEuro } from "@/lib/calculs";
import {
  chargeProduction,
  fmtAmplitude,
  rythmeVentes,
  servicesTruck,
  ventesParJour,
  type LigneProduction,
  type VenteProduction,
} from "@/lib/productivite";
import type { Canal } from "@/lib/supabase/database.types";

/** Cycle d'une commande reconstruit depuis fulfillment_event (côté serveur). */
export type CycleCommande = {
  vente_id: string;
  canal: Canal;
  /** Nom de la commande dans la table des cycles (maquette V2). */
  client_nom: string | null;
  portions: number;
  saisie: string; // commande_le de la vente (prise de commande — 0016)
  en_prod: string | null;
  pret: string | null;
  remis: string | null;
};

const PERIODES = [
  { id: "7j", label: "7 j", jours: 7, sous: "7 derniers jours" },
  { id: "30j", label: "30 j", jours: 30, sous: "30 derniers jours" },
  { id: "90j", label: "90 j", jours: 90, sous: "90 derniers jours" },
] as const;

const CANAUX: Canal[] = ["truck", "boutique", "traiteur"];

// Tags d'honnêteté (maquette V2) : Calculé bleu · Estimé teal. Le tag « Démo »
// de la maquette (7/30 j = projections d'un dataset statique) n'est PAS repris :
// ici les périodes sont de VRAIS filtres — étiqueter « Démo » du réel serait
// une fausse honnêteté (écart documenté, validé).
const TAG_BASE: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase",
  padding: "2px 7px", borderRadius: 100, whiteSpace: "nowrap", flexShrink: 0,
};
const TAG_CALCULE: React.CSSProperties = { ...TAG_BASE, background: "rgba(20,147,190,.16)", color: "#1493be" };
const TAG_ESTIME: React.CSSProperties = { ...TAG_BASE, background: "rgba(46,125,110,.15)", color: "#2e7d6e" };

type StatsCanal = {
  canal: Canal;
  ventes: number;
  cout: number;
  couverture: number;
  lignesSansCout: number;
  minutes: number;
  lignesSansTemps: number;
  pic: { heure: number; ventes: number } | null;
  debit: number | null;
  exclusImport: number;
  nbServices: number;
  nbJours: number;
  remises: number;
  cycleMoyenMin: number | null;
  attenteMoyenneMin: number | null;
};

/**
 * Productivité — design CD V2 (12/07/2026). Charge de production du VENDU,
 * adaptée au canal : « Tous » = vue COMPARATIVE (jamais d'agrégat entre
 * unités différentes — un cycle en jours et un débit en ventes/h ne se
 * somment pas) ; truck/boutique = débit + charge ; traiteur = cycle.
 * Dates post-facturation : cycle = commande_le → remise ; rythme/heure de
 * service = occurred_at (= livre_le). Périmètre : ventes remises, même
 * source que le CA. Portage UI pur — tout le calcul vit dans lib/productivite
 * et lib/calculs (une fonction, plusieurs lecteurs).
 */
export function ProductivityBoard({
  cycles,
  ventes,
  lignes,
}: {
  cycles: CycleCommande[];
  ventes: VenteProduction[];
  lignes: LigneProduction[];
}) {
  const [canal, setCanal] = useState<Canal | "all">("all");
  const [periode, setPeriode] = useState<(typeof PERIODES)[number]["id"]>("90j");
  const [emplacement, setEmplacement] = useState<string>("all");
  const [maintenant] = useState(() => Date.now());

  const per = PERIODES.find((x) => x.id === periode)!;
  const limite = maintenant - per.jours * 86400000;

  const ventesPeriode = useMemo(
    () => ventes.filter((v) => new Date(v.occurred_at).getTime() >= limite),
    [ventes, limite]
  );
  const cyclesPeriode = useMemo(
    () => cycles.filter((c) => c.remis != null && new Date(c.remis).getTime() >= limite),
    [cycles, limite]
  );

  // ── Stats par canal (une passe — servent la vue Tous ET les vues canal)
  const stats = useMemo(() => {
    const lignesParVente = new Map<string, LigneProduction[]>();
    for (const l of lignes) {
      const arr = lignesParVente.get(l.vente_id) ?? [];
      arr.push(l);
      lignesParVente.set(l.vente_id, arr);
    }
    const out = new Map<Canal, StatsCanal>();
    for (const c of CANAUX) {
      const vs = ventesPeriode.filter((v) => v.canal === c);
      const ls = vs.flatMap((v) => lignesParVente.get(v.id) ?? []);
      const charge = chargeProduction(ls);
      const rythme = rythmeVentes(vs);
      const remis = cyclesPeriode.filter((x) => x.canal === c);
      const cyclesMin = remis.map((x) => minutes(x.saisie, x.remis!)).filter((n) => n >= 0);
      const attentes = remis
        .filter((x) => x.pret && x.remis)
        .map((x) => minutes(x.pret!, x.remis!))
        .filter((n) => n >= 0);
      out.set(c, {
        canal: c,
        ventes: vs.length,
        cout: charge.cout,
        couverture: charge.couverture,
        lignesSansCout: charge.lignesSansCout,
        minutes: charge.minutes,
        lignesSansTemps: charge.lignesSansTemps,
        pic: rythme.pic,
        debit: rythme.debitParHeureActive,
        exclusImport: rythme.exclusImport,
        nbServices: servicesTruck(vs).length,
        nbJours: ventesParJour(vs).length,
        remises: remis.length,
        cycleMoyenMin: cyclesMin.length ? cyclesMin.reduce((a, b) => a + b, 0) / cyclesMin.length : null,
        attenteMoyenneMin: attentes.length ? attentes.reduce((a, b) => a + b, 0) / attentes.length : null,
      });
    }
    return out;
  }, [ventesPeriode, cyclesPeriode, lignes]);

  const trio = CANAUX.map((c) => stats.get(c)!);
  const totVentes = trio.reduce((a, s) => a + s.ventes, 0);
  const totCout = trio.reduce((a, s) => a + s.cout, 0);
  const totMin = trio.reduce((a, s) => a + s.minutes, 0);
  const maxCout = Math.max(1, ...trio.map((s) => s.cout));
  const maxMin = Math.max(1, ...trio.map((s) => s.minutes));

  // Insight du bandeau Cumul — DYNAMIQUE (une phrase statique deviendrait
  // fausse si les données bougent) ; jamais de score composite.
  const insight = (() => {
    const actifs = trio.filter((s) => s.ventes > 0);
    if (actifs.length < 2) return "Aucun « score » ne mélange les canaux.";
    const maxTemps = [...actifs].sort((a, b) => b.minutes - a.minutes)[0];
    const maxMatiere = [...actifs].sort((a, b) => b.cout - a.cout)[0];
    const minTemps = [...actifs].sort((a, b) => a.minutes - b.minutes)[0];
    const morceaux = [
      `${CANAL_LABEL[maxTemps.canal]} consomme le plus de temps${maxTemps.canal !== maxMatiere.canal ? ` ; ${CANAL_LABEL[maxMatiere.canal]} concentre la matière` : " et la matière"}`,
    ];
    if (minTemps.canal !== maxTemps.canal) morceaux.push(`${CANAL_LABEL[minTemps.canal]} est le plus léger`);
    return `${morceaux.join(" ; ")}. Aucun « score » ne les mélange.`;
  })();

  // ── Vue FLUX (truck / boutique)
  const fluxCanal: Canal | null = canal === "truck" || canal === "boutique" ? canal : null;
  const flux = fluxCanal ? stats.get(fluxCanal)! : null;
  const ventesFlux = useMemo(() => {
    if (!fluxCanal) return [];
    let vs = ventesPeriode.filter((v) => v.canal === fluxCanal);
    if (fluxCanal === "truck" && emplacement !== "all") vs = vs.filter((v) => v.emplacement === emplacement);
    return vs;
  }, [fluxCanal, ventesPeriode, emplacement]);
  const fluxRythme = useMemo(() => rythmeVentes(ventesFlux), [ventesFlux]);
  const fluxCharge = useMemo(() => {
    if (!fluxCanal) return null;
    const ids = new Set(ventesFlux.map((v) => v.id));
    return chargeProduction(lignes.filter((l) => ids.has(l.vente_id)));
  }, [fluxCanal, ventesFlux, lignes]);
  const fluxServices = useMemo(() => servicesTruck(ventesFlux), [ventesFlux]);
  const fluxJours = useMemo(() => ventesParJour(ventesFlux), [ventesFlux]);
  const emplacements = useMemo(
    () => [...new Set(ventesPeriode.filter((v) => v.canal === "truck" && v.emplacement).map((v) => v.emplacement as string))].sort(),
    [ventesPeriode]
  );

  // ── Vue CYCLE (traiteur)
  const traiteur = stats.get("traiteur")!;
  const cyclesTable = useMemo(
    () =>
      cyclesPeriode
        .filter((c) => c.canal === "traiteur")
        .sort((a, b) => (b.remis ?? "").localeCompare(a.remis ?? ""))
        .slice(0, 8),
    [cyclesPeriode]
  );
  const maxCycleMin = Math.max(1, ...cyclesTable.map((c) => minutes(c.saisie, c.remis!)));

  return (
    <>
      {/* Légende d'honnêteté */}
      <div className="flex gap-2 flex-wrap" style={{ marginBottom: 14 }}>
        <span className="inline-flex items-center gap-1.5 font-mono" style={{ fontSize: 11, fontWeight: 600, padding: "5px 11px", borderRadius: 100, background: "rgba(20,147,190,.14)", color: "#1493be" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1493be" }} />
          Calculé — rythme · débit · coût matière
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono" style={{ fontSize: 11, fontWeight: 600, padding: "5px 11px", borderRadius: 100, background: "rgba(46,125,110,.14)", color: "#2e7d6e" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2e7d6e" }} />
          Estimé — temps (déclaratif chef)
        </span>
      </div>

      {/* Filtres canal + emplacement (truck) + période */}
      <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 10 }}>
        {(["all", ...CANAUX] as const).map((c) => (
          <button
            key={c}
            onClick={() => { setCanal(c); setEmplacement("all"); }}
            className="flex items-center gap-1.5"
            style={{
              padding: "7px 13px", borderRadius: 100, fontSize: 12.5, fontWeight: 600,
              border: canal === c ? "1px solid transparent" : "1px solid #dfd4bf",
              background: canal === c ? "#0e3947" : "#fbf8f1",
              color: canal === c ? "#f6f1e7" : "#6b7469",
            }}
          >
            {c !== "all" && <span style={{ width: 7, height: 7, borderRadius: "50%", background: CANAL_COLOR[c] }} />}
            {c === "all" ? "Tous" : CANAL_LABEL[c]}
          </button>
        ))}
        {canal === "truck" && emplacements.length > 0 && (
          <span className="flex items-center gap-1.5 flex-wrap" style={{ marginLeft: 4, paddingLeft: 10, borderLeft: "1px solid #e1d7c3" }}>
            {["all", ...emplacements].map((e) => (
              <button
                key={e}
                onClick={() => setEmplacement(e)}
                style={{
                  padding: "5px 11px", borderRadius: 100, fontSize: 11.5, fontWeight: 600,
                  border: emplacement === e ? "1px solid transparent" : "1px solid #dfd4bf",
                  background: emplacement === e ? "#1493be" : "#fbf8f1",
                  color: emplacement === e ? "#f6f1e7" : "#6b7469",
                }}
              >
                {e === "all" ? "Tous emplacements" : e}
              </button>
            ))}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2.5 flex-wrap" style={{ marginBottom: 16 }}>
        <span className="font-mono uppercase" style={{ fontSize: 10.5, letterSpacing: ".12em", color: "#b07a2e" }}>Période</span>
        {PERIODES.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriode(p.id)}
            style={{
              padding: "7px 15px", borderRadius: 100, fontSize: 12.5, fontWeight: 600,
              border: periode === p.id ? "1px solid #0e3947" : "1px solid #e1d7c3",
              background: periode === p.id ? "#0e3947" : "#f6f1e7",
              color: periode === p.id ? "#f6f1e7" : "#6b7469",
            }}
          >
            {p.label}
          </button>
        ))}
        <span className="font-mono" style={{ marginLeft: "auto", fontSize: 11, color: "#9a927f", maxWidth: 420, textAlign: "right" }}>
          Le CA n&apos;est qu&apos;un dénominateur de couverture — la marge vit dans Finances.
        </span>
      </div>

      {/* ═══════════ TOUS — vue comparative ═══════════ */}
      {canal === "all" && (
        <>
          <div className="flex items-start gap-3" style={{ background: "rgba(46,125,110,.08)", border: "1px solid rgba(46,125,110,.25)", borderRadius: 14, padding: "13px 16px", marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "#2c5a50", lineHeight: 1.55 }}>
              <strong style={{ color: "#1e4a41" }}>Vue comparative — les canaux ne se fusionnent jamais.</strong>{" "}
              Additionner un cycle traiteur (en jours) et un débit comptoir (en ventes/heure) donne un chiffre qui ne veut
              rien dire. On aligne seulement ce qui partage une unité : <strong>ventes</strong>, <strong>coût matière (€)</strong>{" "}
              et <strong>temps de travail (h)</strong>. Chaque canal garde sa mesure maîtresse.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12, marginBottom: 16 }}>
            {trio.map((s) => {
              const cy = s.canal === "traiteur";
              return (
                <div key={s.canal} style={{ background: "#f6f1e7", border: "1px solid #e1d7c3", borderRadius: 16, padding: "15px 16px", borderTop: `3px solid ${CANAL_COLOR[s.canal]}` }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: 11 }}>
                    <span style={{ width: 11, height: 11, borderRadius: "50%", background: CANAL_COLOR[s.canal], flexShrink: 0 }} />
                    <span className="font-display" style={{ fontWeight: 800, fontSize: 15, color: "#0e3947" }}>{CANAL_LABEL[s.canal]}</span>
                    <span className="font-mono" style={{ marginLeft: "auto", ...TAG_BASE, ...(cy ? { background: "rgba(176,122,46,.16)", color: "#8a6a28" } : { background: "rgba(20,147,190,.14)", color: "#0e6e8f" }) }}>
                      {cy ? "Cycle" : "Débit"}
                    </span>
                  </div>
                  <p style={{ fontSize: 11.5, color: "#8a7f6a" }}>{cy ? "Cycle moyen (saisie → remis)" : "Pic horaire"}</p>
                  <p className="font-display" style={{ fontWeight: 800, fontSize: 24, color: "#0e3947", marginTop: 2, letterSpacing: "-.01em" }}>
                    {cy
                      ? s.cycleMoyenMin != null ? `≈ ${fmtJours(s.cycleMoyenMin)}` : "—"
                      : s.pic ? `${s.pic.heure} h` : "—"}
                  </p>
                  <p style={{ fontSize: 11.5, color: "#9a927f", marginTop: 3 }}>
                    {cy
                      ? `${s.remises} remise${s.remises > 1 ? "s" : ""}${s.attenteMoyenneMin != null ? ` · attente ≈ ${fmtHeuresTravail(s.attenteMoyenneMin)}` : ""}`
                      : `${s.debit != null ? `≈ ${s.debit.toFixed(1).replace(".", ",")} /h` : "—"} active · ${s.canal === "truck" ? `${s.nbServices} service${s.nbServices > 1 ? "s" : ""}` : `${s.nbJours} jour${s.nbJours > 1 ? "s" : ""} actifs`}`}
                  </p>
                  <div className="flex flex-col gap-1.5" style={{ marginTop: 12, paddingTop: 11, borderTop: "1px solid #e9e0ce" }}>
                    <p className="flex items-baseline justify-between gap-2">
                      <span style={{ fontSize: 12, color: "#6b7469" }}>Ventes remises</span>
                      <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: "#0e3947" }}>{s.ventes.toLocaleString("fr-FR")}</span>
                    </p>
                    <p className="flex items-baseline justify-between gap-2">
                      <span style={{ fontSize: 12, color: "#6b7469" }}>Coût matière <span style={{ fontSize: 10, color: "#9a927f" }}>couv. {fmtCouverture(s.couverture)}</span></span>
                      <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: "#0e3947" }}>{fmtEuro(s.cout)} €</span>
                    </p>
                    <p className="flex items-baseline justify-between gap-2">
                      <span style={{ fontSize: 12, color: "#6b7469" }}>Temps <span style={{ fontSize: 10, color: "#2e7d6e", fontWeight: 700 }}>estimé</span></span>
                      <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: "#2e7d6e" }}>{fmtHeuresTravail(s.minutes)}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16, marginBottom: 16 }}>
            <BarresComparatives
              titre="Coût matière consommé"
              tag={<span className="font-mono" style={TAG_CALCULE}>Calculé</span>}
              sous="Par canal, même unité (€). Comparé — jamais additionné en score."
              lignes={trio.map((s) => ({ canal: s.canal, valeur: `${fmtEuro(s.cout)} €`, pct: Math.max(5, Math.round((s.cout / maxCout) * 100)), couleurValeur: "#0e3947" }))}
            />
            <BarresComparatives
              titre="Temps de travail estimé"
              tag={<span className="font-mono" style={TAG_ESTIME}>Estimé</span>}
              sous="Heures de travail cumulées (déclaratif chef). Pas une durée écoulée."
              lignes={trio.map((s) => ({ canal: s.canal, valeur: fmtHeuresTravail(s.minutes), pct: Math.max(5, Math.round((s.minutes / maxMin) * 100)), couleurValeur: "#2e7d6e" }))}
            />
          </div>

          {/* Bandeau Cumul — même unité uniquement, jamais de score composite */}
          <div className="flex items-center gap-5 flex-wrap" style={{ background: "#0e3947", color: "#f6f1e7", borderRadius: 14, padding: "15px 20px" }}>
            <span className="font-mono uppercase" style={{ fontSize: 10.5, letterSpacing: ".08em", color: "#8fcfe2", flexShrink: 0 }}>
              Cumul {per.label} · même unité
            </span>
            <span style={{ fontSize: 13.5, color: "#dce7ea" }}>
              <b className="font-display" style={{ fontSize: 16, color: "#fff" }}>{totVentes.toLocaleString("fr-FR")}</b> ventes
            </span>
            <span style={{ fontSize: 13.5, color: "#dce7ea" }}>
              <b className="font-display" style={{ fontSize: 16, color: "#fff" }}>{fmtEuro(totCout)} €</b> matière
            </span>
            <span style={{ fontSize: 13.5, color: "#dce7ea" }}>
              <b className="font-display" style={{ fontSize: 16, color: "#f0c173" }}>{fmtHeuresTravail(totMin)}</b> estimées
            </span>
            <span style={{ marginLeft: "auto", flex: "1 1 240px", minWidth: 200, fontSize: 12, color: "#aec3c9", lineHeight: 1.5, textAlign: "right" }}>{insight}</span>
          </div>
        </>
      )}

      {/* ═══════════ TRUCK / BOUTIQUE — débit + charge ═══════════ */}
      {flux && fluxCharge && (
        ventesFlux.length === 0 ? (
          <div style={{ background: "#f6f1e7", border: "1px dashed #c9bc9e", borderRadius: 16, padding: 40, textAlign: "center", color: "#8a7f6a", fontSize: 14 }}>
            Aucune vente remise sur la période pour {CANAL_LABEL[flux.canal]}.
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 16 }}>
              <KpiV2 label="Ventes remises" valeur={ventesFlux.length.toLocaleString("fr-FR")} sous={per.sous} tag="calc" />
              <KpiV2 label="Débit · heure active" valeur={fluxRythme.debitParHeureActive != null ? `≈ ${fluxRythme.debitParHeureActive.toFixed(1).replace(".", ",")} /h` : "—"} sous="ventes par heure de service" tag="calc" />
              <KpiV2 label="Coût matière consommé" valeur={`${fmtEuro(fluxCharge.cout)} €`} sous={`couv. ${fmtCouverture(fluxCharge.couverture)} · ${fluxCharge.lignesSansCout} ligne${fluxCharge.lignesSansCout > 1 ? "s" : ""} sans coût`} tag="calc" />
              <KpiV2 label="Temps estimé" valeur={fmtHeuresTravail(fluxCharge.minutes)} sous={`${fluxCharge.lignesSansTemps} ligne${fluxCharge.lignesSansTemps > 1 ? "s" : ""} au temps non défini`} tag="est" />
            </div>

            <section style={{ background: "#f6f1e7", border: "1px solid #e1d7c3", borderRadius: 18, padding: "18px 22px", marginBottom: 16 }}>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="font-display" style={{ fontWeight: 800, fontSize: 18, color: "#0e3947" }}>Rythme horaire · {CANAL_LABEL[flux.canal]}</h2>
                <span className="font-mono" style={TAG_CALCULE}>Calculé</span>
              </div>
              <p style={{ margin: "5px 0 16px", fontSize: 13, color: "#8a7f6a" }}>Ventes par heure (Europe/Paris) — le pic est mis en avant.</p>
              {fluxRythme.histogramme.length === 0 ? (
                <div style={{ padding: 26, textAlign: "center", color: "#9a927f", fontSize: 13, background: "#efe7d6", borderRadius: 12 }}>
                  Aucune vente horaire sur la période — voir les imports exclus.
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  {fluxRythme.histogramme.map((h) => {
                    const max = Math.max(1, ...fluxRythme.histogramme.map((x) => x.ventes));
                    return (
                      <div key={h.heure} className="flex flex-col items-center gap-1.5" style={{ flex: 1 }}>
                        <span className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: "#0e3947" }}>{h.ventes.toLocaleString("fr-FR")}</span>
                        <div className="flex items-end" style={{ width: "100%", height: 120, background: "#efe7d6", borderRadius: 6 }}>
                          <span style={{ display: "block", width: "100%", borderRadius: 6, height: `${Math.max(4, Math.round((h.ventes / max) * 100))}%`, background: fluxRythme.pic?.heure === h.heure ? "#1493be" : "#a9cadb" }} />
                        </div>
                        <span className="font-mono" style={{ fontSize: 10, color: "#9a927f" }}>{h.heure} h</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {fluxRythme.exclusImport > 0 && (
                <div className="flex items-start gap-2" style={{ marginTop: 13, padding: "10px 13px", borderRadius: 11, background: "rgba(176,122,46,.1)", border: "1px solid rgba(176,122,46,.22)" }}>
                  <span className="font-mono" style={{ fontSize: 11, color: "#b07a2e", flexShrink: 0 }}>!</span>
                  <span style={{ fontSize: 12.5, color: "#7a5a22", lineHeight: 1.5 }}>
                    {fluxRythme.exclusImport} vente{fluxRythme.exclusImport > 1 ? "s" : ""} importée{fluxRythme.exclusImport > 1 ? "s" : ""} (heure fictive 12:00) exclue{fluxRythme.exclusImport > 1 ? "s" : ""} des calculs horaires.
                  </span>
                </div>
              )}
            </section>

            <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 16, alignItems: "start" }} className="fz-users-grid">
              <section style={{ background: "#f6f1e7", border: "1px solid #e1d7c3", borderRadius: 18, overflow: "hidden" }}>
                <div className="flex items-center gap-2.5" style={{ padding: "15px 20px", borderBottom: "1px solid #e9e0ce" }}>
                  <span className="font-display" style={{ fontWeight: 800, fontSize: 16, color: "#0e3947" }}>
                    {flux.canal === "truck" ? "Services observés" : "Jours d'activité"}
                  </span>
                  <span className="font-mono" style={TAG_CALCULE}>Calculé</span>
                </div>
                {flux.canal === "truck" && (
                  <p style={{ padding: "8px 20px 2px", fontSize: 11.5, color: "#9a927f", lineHeight: 1.45 }}>
                    Amplitude <b style={{ color: "#6b7469" }}>(observée)</b> = première → dernière vente, pas les horaires d&apos;ouverture.
                  </p>
                )}
                <div style={{ padding: "6px 14px 12px" }}>
                  {(flux.canal === "truck" ? fluxServices.length : fluxJours.length) === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", color: "#9a927f", fontSize: 13 }}>Aucun service sur la période.</div>
                  ) : flux.canal === "truck" ? (
                    fluxServices.slice(0, 8).map((s) => (
                      <div key={`${s.date}-${s.emplacement}`} className="flex items-center gap-3" style={{ padding: "11px 6px", borderBottom: "1px solid #efe7d6" }}>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "block", fontWeight: 600, fontSize: 14, color: "#0e3947" }}>{s.emplacement}</span>
                          <span style={{ fontSize: 11.5, color: "#9a927f" }}>{fmtJourCourt(s.date)}</span>
                        </span>
                        <span className="font-mono" style={{ fontSize: 12.5, fontWeight: 700, color: "#1493be", flexShrink: 0 }}>{s.ventes} ventes</span>
                        <span className="font-mono" style={{ fontSize: 12, color: "#6b7469", flexShrink: 0, minWidth: 104, textAlign: "right" }}>{fmtAmplitude(s.debut, s.fin)}</span>
                      </div>
                    ))
                  ) : (
                    fluxJours.slice(0, 8).map((j) => (
                      <div key={j.jour} className="flex items-center gap-3" style={{ padding: "11px 6px", borderBottom: "1px solid #efe7d6" }}>
                        <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: "#0e3947" }}>{fmtJourCourt(j.jour)}</span>
                        <span className="font-mono" style={{ fontSize: 12.5, fontWeight: 700, color: "#1493be" }}>{j.ventes} ventes</span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <ChargeSection cout={fluxCharge.cout} couverture={fluxCharge.couverture} sansCout={fluxCharge.lignesSansCout} minutes={fluxCharge.minutes} sansTemps={fluxCharge.lignesSansTemps} titreSous={null} />
            </div>
          </>
        )
      )}

      {/* ═══════════ TRAITEUR — cycle ═══════════ */}
      {canal === "traiteur" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 16 }}>
            <KpiV2 label="Commandes remises" valeur={traiteur.remises.toLocaleString("fr-FR")} sous={per.sous} tag="calc" />
            <KpiV2 label="Cycle complet moyen" valeur={traiteur.cycleMoyenMin != null ? `≈ ${fmtJours(traiteur.cycleMoyenMin)}` : "—"} sous="saisie → remis" tag="calc" />
            <KpiV2 label="Temps estimé" valeur={fmtHeuresTravail(traiteur.minutes)} sous={`${traiteur.lignesSansTemps} ligne${traiteur.lignesSansTemps > 1 ? "s" : ""} au temps non défini`} tag="est" />
            <KpiV2 label="Attente de retrait" valeur={traiteur.attenteMoyenneMin != null ? `≈ ${fmtHeuresTravail(traiteur.attenteMoyenneMin)}` : "—"} sous="prêt → remis" tag="calc" />
          </div>

          {cyclesTable.length === 0 ? (
            <div style={{ background: "#f6f1e7", border: "1px dashed #c9bc9e", borderRadius: 16, padding: 32, textAlign: "center", color: "#8a7f6a", fontSize: 14, marginBottom: 16 }}>
              Aucun cycle remis sur la période — les indicateurs de charge ci-dessous restent affichés.
            </div>
          ) : (
            <section style={{ background: "#f6f1e7", border: "1px solid #e1d7c3", borderRadius: 18, padding: "18px 22px", marginBottom: 16 }}>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="font-display" style={{ fontWeight: 800, fontSize: 18, color: "#0e3947" }}>Cycles de production</h2>
                <span className="font-mono" style={TAG_CALCULE}>Calculé</span>
                <span className="font-mono" style={{ marginLeft: "auto", fontSize: 10.5, color: "#9a927f" }}>
                  saisie <span style={{ color: "#c9bc9e" }}>→</span> en prod <span style={{ color: "#c9bc9e" }}>→</span> prêt <span style={{ color: "#c9bc9e" }}>→</span> remis
                </span>
              </div>
              <p style={{ margin: "5px 0 16px", fontSize: 13, color: "#8a7f6a" }}>
                Chaque commande traiteur traverse le cycle complet ; le comptoir et le truck naissent « remis ».
              </p>
              <div className="font-mono uppercase" style={{ display: "grid", gridTemplateColumns: "1.9fr .8fr 1fr .8fr", gap: 8, padding: "0 6px 9px", fontSize: 10, letterSpacing: ".05em", color: "#a79b84" }}>
                <span>Commande</span>
                <span style={{ textAlign: "right" }}>Portions</span>
                <span style={{ textAlign: "right" }}>Saisie → remis</span>
                <span style={{ textAlign: "right" }}>Cycle</span>
              </div>
              <div className="flex flex-col gap-2">
                {cyclesTable.map((c) => {
                  const min = minutes(c.saisie, c.remis!);
                  return (
                    <div key={c.vente_id} style={{ background: "#fbf8f1", border: "1px solid #e4dac6", borderRadius: 12, padding: "11px 13px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1.9fr .8fr 1fr .8fr", gap: 8, alignItems: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: "#0e3947", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.client_nom ?? "Sans client"}
                        </span>
                        <span className="font-mono" style={{ textAlign: "right", fontSize: 13, color: "#6b7469" }}>{c.portions} port.</span>
                        <span className="font-mono" style={{ textAlign: "right", fontSize: 12.5, color: "#6b7469" }}>{fmtDateCourte(c.saisie)} → {fmtDateCourte(c.remis!)}</span>
                        <span className="font-mono" style={{ textAlign: "right", fontWeight: 700, fontSize: 13.5, color: "#b07a2e" }}>{fmtJours(min)}</span>
                      </div>
                      <div style={{ marginTop: 9, height: 6, borderRadius: 100, background: "#e4dac6", overflow: "hidden" }}>
                        <span style={{ display: "block", height: "100%", borderRadius: 100, background: "#b07a2e", width: `${Math.round((min / maxCycleMin) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <ChargeSection cout={traiteur.cout} couverture={traiteur.couverture} sansCout={traiteur.lignesSansCout} minutes={traiteur.minutes} sansTemps={traiteur.lignesSansTemps} titreSous="Le cycle est la mesure maîtresse du traiteur ; coût matière et temps restent disponibles." />
        </>
      )}
    </>
  );
}

/** KPI carte claire (maquette V2) avec tag d'honnêteté. */
function KpiV2({ label, valeur, sous, tag }: { label: string; valeur: string; sous: string; tag: "calc" | "est" }) {
  return (
    <div style={{ background: "#f6f1e7", border: "1px solid #e1d7c3", borderRadius: 16, padding: "16px 17px" }}>
      <div className="flex items-center justify-between gap-2">
        <span style={{ fontSize: 12.5, color: "#6b7469" }}>{label}</span>
        <span className="font-mono" style={tag === "est" ? TAG_ESTIME : TAG_CALCULE}>{tag === "est" ? "Estimé" : "Calculé"}</span>
      </div>
      <p className="font-display" style={{ marginTop: 9, fontWeight: 800, fontSize: 25, color: "#0e3947" }}>{valeur}</p>
      <p style={{ marginTop: 3, fontSize: 12, color: "#9a927f" }}>{sous}</p>
    </div>
  );
}

/** Barres comparatives par canal — une seule unité par section, jamais de score. */
function BarresComparatives({
  titre,
  tag,
  sous,
  lignes,
}: {
  titre: string;
  tag: React.ReactNode;
  sous: string;
  lignes: { canal: Canal; valeur: string; pct: number; couleurValeur: string }[];
}) {
  return (
    <section style={{ background: "#f6f1e7", border: "1px solid #e1d7c3", borderRadius: 18, padding: "18px 20px" }}>
      <div className="flex items-center gap-2.5" style={{ marginBottom: 3 }}>
        <h2 className="font-display" style={{ fontWeight: 800, fontSize: 16, color: "#0e3947" }}>{titre}</h2>
        {tag}
      </div>
      <p style={{ margin: "0 0 15px", fontSize: 12, color: "#8a7f6a" }}>{sous}</p>
      <div className="flex flex-col gap-3">
        {lignes.map((l) => (
          <div key={l.canal}>
            <div className="flex items-center justify-between gap-2" style={{ marginBottom: 5 }}>
              <span className="inline-flex items-center gap-2" style={{ fontSize: 13, color: "#0e3947" }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: CANAL_COLOR[l.canal] }} />
                {CANAL_LABEL[l.canal]}
              </span>
              <span className="font-mono" style={{ fontWeight: 700, fontSize: 13, color: l.couleurValeur }}>{l.valeur}</span>
            </div>
            <div style={{ height: 9, borderRadius: 100, background: "#e4dac6", overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", borderRadius: 100, background: CANAL_COLOR[l.canal], width: `${l.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Tuiles Charge de production (coût [Calculé] + temps [Estimé], note MO du §5). */
function ChargeSection({
  cout,
  couverture,
  sansCout,
  minutes,
  sansTemps,
  titreSous,
}: {
  cout: number;
  couverture: number;
  sansCout: number;
  minutes: number;
  sansTemps: number;
  titreSous: string | null;
}) {
  const tuiles = (
    <>
      <div style={{ background: "#fbf8f1", border: "1px solid #e4dac6", borderRadius: 14, padding: "14px 15px" }}>
        <div className="flex items-center justify-between gap-2">
          <span style={{ fontSize: 12.5, color: "#6b7469" }}>Coût matière consommé</span>
          <span className="font-mono" style={TAG_CALCULE}>Calculé</span>
        </div>
        <p className="font-display" style={{ fontWeight: 800, fontSize: 22, color: "#0e3947", marginTop: 6 }}>{fmtEuro(cout)} €</p>
        <p className="inline-flex items-center gap-1.5" style={{ marginTop: 8, fontSize: 12, color: "#2e7d46", background: "rgba(46,125,70,.1)", borderRadius: 8, padding: "3px 9px" }}>
          ✓ couverture {fmtCouverture(couverture)} · {sansCout} ligne{sansCout > 1 ? "s" : ""} sans coût
        </p>
      </div>
      <div style={{ background: "#fbf8f1", border: "1px solid #e4dac6", borderRadius: 14, padding: "14px 15px" }}>
        <div className="flex items-center justify-between gap-2">
          <span style={{ fontSize: 12.5, color: "#6b7469" }}>Temps de travail estimé</span>
          <span className="font-mono" style={TAG_ESTIME}>Estimé</span>
        </div>
        <p className="font-display" style={{ fontWeight: 800, fontSize: 22, color: "#2e7d6e", marginTop: 6 }}>{fmtHeuresTravail(minutes)}</p>
        <p style={{ marginTop: 8, fontSize: 11.5, color: "#9a927f", lineHeight: 1.5 }}>
          {sansTemps} ligne{sansTemps > 1 ? "s" : ""} au temps non défini. Heures de travail cumulées (temps × quantités),
          pas une durée écoulée — convertibles en coût plus tard, aucun taux appliqué aujourd&apos;hui.
        </p>
      </div>
    </>
  );
  return (
    <section style={{ background: "#f6f1e7", border: "1px solid #e1d7c3", borderRadius: 18, padding: "18px 20px" }}>
      <div className="flex items-baseline gap-2" style={{ marginBottom: titreSous ? 4 : 13 }}>
        <h2 className="font-display" style={{ fontWeight: 800, fontSize: 16, color: "#0e3947" }}>Charge de production</h2>
        {titreSous && <span style={{ fontSize: 12, color: "#9a927f" }}>· en second plan</span>}
      </div>
      {titreSous && <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "#8a7f6a" }}>{titreSous}</p>}
      {titreSous ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>{tuiles}</div>
      ) : (
        <div className="flex flex-col gap-3">{tuiles}</div>
      )}
    </section>
  );
}

function minutes(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 60000;
}

/** Minutes de TRAVAIL cumulées → heures (jamais des jours : ce n'est pas une durée écoulée). */
function fmtHeuresTravail(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${String(Math.round(min % 60)).padStart(2, "0")}`;
}

/** Durée de CYCLE (écoulée) → jours entiers dès 24 h, sinon heures. */
function fmtJours(min: number): string {
  if (min >= 1440) return `${Math.round(min / 1440)} j`;
  return fmtHeuresTravail(min);
}

/** Couverture affichée honnêtement : « 100 % » seulement si TOUT est couvert. */
function fmtCouverture(c: number): string {
  if (c >= 1) return "100 %";
  return `${Math.min(c * 100, 99.9).toFixed(1).replace(".", ",")} %`;
}

function fmtJourCourt(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" }).format(new Date(`${iso}T12:00:00Z`));
}

function fmtDateCourte(isoDateTime: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" }).format(new Date(isoDateTime));
}
