"use client";

import { useMemo, useState } from "react";
import { CANAL_COLOR, CANAL_LABEL } from "@/lib/nav";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card, SectionHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
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
  portions: number;
  saisie: string; // occurred_at de la vente
  en_prod: string | null;
  pret: string | null;
  remis: string | null;
};

const PERIODES = [
  { id: "7j", label: "7 jours", jours: 7 },
  { id: "30j", label: "30 jours", jours: 30 },
  { id: "90j", label: "90 jours", jours: 90 },
] as const;

/**
 * Productivité — charge de production du vendu (tous canaux : rythme réel,
 * coût matière consommé — primitive PARTAGÉE avec Finances —, temps ESTIMÉ
 * des fiches) + cadences réelles du cycle de commande (fulfillment_event).
 * Mise en page volontairement fonctionnelle : le design final viendra de CD.
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
  const [periode, setPeriode] = useState<(typeof PERIODES)[number]["id"]>("30j");
  const [maintenant] = useState(() => Date.now());

  // ── Charge de production : ventes remises filtrées canal × période.
  const limite = maintenant - PERIODES.find((x) => x.id === periode)!.jours * 86400000;
  const ventesFiltrees = useMemo(
    () =>
      ventes.filter(
        (v) => new Date(v.occurred_at).getTime() >= limite && (canal === "all" || v.canal === canal)
      ),
    [ventes, canal, limite]
  );
  const idsFiltres = useMemo(() => new Set(ventesFiltrees.map((v) => v.id)), [ventesFiltrees]);
  const lignesFiltrees = useMemo(() => lignes.filter((l) => idsFiltres.has(l.vente_id)), [lignes, idsFiltres]);

  const rythme = useMemo(() => rythmeVentes(ventesFiltrees), [ventesFiltrees]);
  const services = useMemo(() => servicesTruck(ventesFiltrees), [ventesFiltrees]);
  const jours = useMemo(
    () => ventesParJour(ventesFiltrees.filter((v) => v.canal === "boutique")),
    [ventesFiltrees]
  );
  const charge = useMemo(() => chargeProduction(lignesFiltrees), [lignesFiltrees]);
  const maxHisto = Math.max(1, ...rythme.histogramme.map((h) => h.ventes));

  const filtres = useMemo(
    () => cycles.filter((c) => canal === "all" || c.canal === canal),
    [cycles, canal]
  );

  const remises = filtres.filter((c) => c.remis != null);
  const dureeMoyenne = (extract: (c: CycleCommande) => number | null): number | null => {
    const vals = filtres.map(extract).filter((x): x is number => x != null && x >= 0);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  const cycleTotal = dureeMoyenne((c) => (c.remis ? minutes(c.saisie, c.remis) : null));
  const tempsProd = dureeMoyenne((c) => (c.en_prod && c.pret ? minutes(c.en_prod, c.pret) : null));
  const attenteRetrait = dureeMoyenne((c) => (c.pret && c.remis ? minutes(c.pret, c.remis) : null));

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 16 }}>
        {(["all", "truck", "boutique", "traiteur"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCanal(c)}
            className="flex items-center gap-1.5"
            style={{
              padding: "7px 13px", borderRadius: 100, fontSize: 12.5, fontWeight: 600,
              border: canal === c ? "1px solid transparent" : "1px solid #dfd4bf",
              background: canal === c ? "#0e3947" : "#fbf8f1",
              color: canal === c ? "#f6f1e7" : "#6b7469",
            }}
          >
            {c !== "all" && <Dot color={CANAL_COLOR[c]} size={7} />}
            {c === "all" ? "Tous" : CANAL_LABEL[c]}
          </button>
        ))}
        <div className="flex gap-1" style={{ marginLeft: "auto", background: "#ede7da", borderRadius: 100, padding: 3 }}>
          {PERIODES.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriode(p.id)}
              style={{
                padding: "5px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                background: periode === p.id ? "#0e3947" : "transparent",
                color: periode === p.id ? "#f6f1e7" : "#6b7469",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Charge de production du vendu (ventes remises — même périmètre que le CA) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginBottom: 16 }}>
        <KpiCard
          variant="light"
          label="Ventes remises"
          value={String(ventesFiltrees.length)}
          tag={{ label: "Calculé", tone: "calcule" }}
          sub={`CA ${fmtEuro(charge.ca)} € sur la période`}
        />
        <KpiCard
          variant="light"
          label="Coût matière consommé"
          value={`${fmtEuro(charge.cout)} €`}
          tag={{ label: "Calculé", tone: "calcule" }}
          sub={`couverture ${fmtCouverture(charge.couverture)} du CA · ${charge.lignesSansCout} ligne${charge.lignesSansCout > 1 ? "s" : ""} sans coût`}
        />
        <KpiCard
          variant="light"
          label="Temps de production estimé"
          value={charge.minutes > 0 ? fmtHeuresTravail(charge.minutes) : "—"}
          tag={{ label: "Estimé", tone: "demo" }}
          sub={
            charge.lignesSansTemps > 0
              ? `${charge.lignesSansTemps} ligne${charge.lignesSansTemps > 1 ? "s" : ""} au temps non défini`
              : "temps des fiches (déclaratif)"
          }
        />
        <KpiCard
          variant="light"
          label="Pic de charge"
          value={rythme.pic ? `${rythme.pic.heure} h` : "—"}
          sub={
            rythme.pic
              ? `${rythme.pic.ventes} ventes sur ce créneau · débit moyen ${rythme.debitParHeureActive != null ? rythme.debitParHeureActive.toFixed(1).replace(".", ",") : "—"}/h active`
              : "aucune vente horodatée"
          }
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, alignItems: "start", marginBottom: 20 }} className="fz-users-grid">
        {/* Rythme horaire */}
        <Card style={{ overflow: "hidden" }}>
          <SectionHeader
            titre="Rythme de vente par heure"
            sous="Heure d'encaissement réelle (Europe/Paris), toutes journées de la période cumulées."
            action={<Badge tone="calcule">Calculé</Badge>}
          />
          <div style={{ padding: "12px 16px" }}>
            {rythme.histogramme.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "#6b7469" }}>Aucune vente horodatée sur la période.</p>
            ) : (
              rythme.histogramme.map((h) => (
                <div key={h.heure} className="flex items-center gap-2" style={{ padding: "3px 0" }}>
                  <span className="font-mono" style={{ width: 38, fontSize: 11.5, color: "#6b7469", textAlign: "right" }}>{h.heure} h</span>
                  <span style={{ flex: 1, height: 14, background: "#f1ead9", borderRadius: 4, overflow: "hidden" }}>
                    <span
                      style={{
                        display: "block", height: "100%", borderRadius: 4,
                        width: `${Math.round((h.ventes / maxHisto) * 100)}%`,
                        background: rythme.pic?.heure === h.heure ? "#d81020" : "#1493be",
                      }}
                    />
                  </span>
                  <span className="font-mono" style={{ width: 34, fontSize: 11.5, fontWeight: 700, color: "#0e3947" }}>{h.ventes}</span>
                </div>
              ))
            )}
            {rythme.exclusImport > 0 && (
              <p style={{ fontSize: 11.5, color: "#b07a2e", marginTop: 8 }}>
                {rythme.exclusImport} vente{rythme.exclusImport > 1 ? "s" : ""} importée{rythme.exclusImport > 1 ? "s" : ""} exclue{rythme.exclusImport > 1 ? "s" : ""} des
                calculs horaires (heure fictive 12:00 posée à l&apos;import).
              </p>
            )}
          </div>
        </Card>

        {/* Services truck + jours boutique */}
        <div className="flex flex-col gap-4">
          {(canal === "all" || canal === "truck") && (
            <Card style={{ overflow: "hidden" }}>
              <SectionHeader
                titre="Services truck"
                sous="Un service = un emplacement × une date. Amplitude OBSERVÉE (première → dernière vente), pas les horaires d'ouverture."
              />
              <div style={{ padding: "6px 16px 12px" }}>
                {services.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: "#6b7469", paddingTop: 6 }}>Aucun service truck sur la période.</p>
                ) : (
                  services.slice(0, 8).map((s) => (
                    <div key={`${s.date}-${s.emplacement}`} className="flex items-center gap-2" style={{ padding: "7px 0", borderBottom: "1px solid #efe7d6" }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#0e3947" }}>{s.emplacement}</span>
                        <span className="font-mono" style={{ fontSize: 10.5, color: "#a79b84" }}>
                          {fmtJour(s.date)} · {fmtAmplitude(s.debut, s.fin)} <span style={{ color: "#c0b69e" }}>(observée)</span>
                        </span>
                      </span>
                      <span className="font-mono" style={{ fontSize: 12.5, fontWeight: 700, color: "#0e3947" }}>{s.ventes} ventes</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}
          {(canal === "all" || canal === "boutique") && (
            <Card style={{ overflow: "hidden" }}>
              <SectionHeader titre="Boutique — ventes par jour" sous="Jours d'exploitation (Europe/Paris)." />
              <div style={{ padding: "6px 16px 12px" }}>
                {jours.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: "#6b7469", paddingTop: 6 }}>Aucune vente boutique sur la période.</p>
                ) : (
                  jours.slice(0, 7).map((j) => (
                    <div key={j.jour} className="flex items-center gap-2" style={{ padding: "6px 0", borderBottom: "1px solid #efe7d6" }}>
                      <span className="font-mono" style={{ flex: 1, fontSize: 12, color: "#6b7469" }}>{fmtJour(j.jour)}</span>
                      <span className="font-mono" style={{ fontSize: 12.5, fontWeight: 700, color: "#0e3947" }}>{j.ventes} ventes</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── Cycle de commande (précommandes — inchangé) */}
      <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
        <p className="font-display" style={{ fontSize: 16, fontWeight: 700, color: "#0e3947" }}>Cycle de commande</p>
        <span className="font-mono" style={{ fontSize: 11, color: "#9a927f" }}>
          précommandes uniquement — transitions réelles des Commandes (90 j)
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginBottom: 20 }}>
        <KpiCard variant="light" label="Commandes remises" value={String(remises.length)} tag={{ label: "Calculé", tone: "calcule" }} sub="sur la période (90 j)" />
        <KpiCard variant="light" label="Cycle complet" value={cycleTotal != null ? fmtDuree(cycleTotal) : "—"} sub="saisie → remise (moyenne)" />
        <KpiCard variant="light" label="Temps de production" value={tempsProd != null ? fmtDuree(tempsProd) : "—"} sub="lancement → prêt (moyenne)" />
        <KpiCard variant="light" label="Attente de retrait" value={attenteRetrait != null ? fmtDuree(attenteRetrait) : "—"} sub="prêt → remis (moyenne)" />
      </div>

      <Card style={{ overflow: "hidden" }}>
        <SectionHeader
          titre="Cycles mesurés"
          sous="Une ligne par commande passée en production."
          compteur={`${filtres.length} commande${filtres.length > 1 ? "s" : ""}`}
          action={<Badge tone="calcule">Calculé</Badge>}
        />
        <div>
          <div
            className="font-mono uppercase"
            style={{ display: "grid", gridTemplateColumns: "1fr .9fr .7fr .9fr .9fr .9fr", gap: 8, padding: "8px 16px", fontSize: 10, letterSpacing: ".08em", color: "#a79b84", borderBottom: "1px solid #efe7d6" }}
          >
            <span>Canal</span>
            <span>Saisie</span>
            <span style={{ textAlign: "right" }}>Portions</span>
            <span style={{ textAlign: "right" }}>Production</span>
            <span style={{ textAlign: "right" }}>Attente</span>
            <span style={{ textAlign: "right" }}>Cycle total</span>
          </div>
          {filtres.map((c) => (
            <div
              key={c.vente_id}
              style={{ display: "grid", gridTemplateColumns: "1fr .9fr .7fr .9fr .9fr .9fr", gap: 8, padding: "10px 16px", alignItems: "center", borderBottom: "1px solid #efe7d6" }}
            >
              <span className="flex items-center gap-2" style={{ fontSize: 12.5, fontWeight: 600, color: "#0e3947" }}>
                <Dot color={CANAL_COLOR[c.canal]} size={7} /> {CANAL_LABEL[c.canal]}
              </span>
              <span className="font-mono" style={{ fontSize: 11.5, color: "#6b7469" }}>{fmtDate(c.saisie)}</span>
              <span className="font-mono" style={{ fontSize: 12, color: "#6b7469", textAlign: "right" }}>{c.portions}</span>
              <span className="font-mono" style={{ fontSize: 12, fontWeight: 600, color: "#1493be", textAlign: "right" }}>
                {c.en_prod && c.pret ? fmtDuree(minutes(c.en_prod, c.pret)) : "—"}
              </span>
              <span className="font-mono" style={{ fontSize: 12, color: "#6b7469", textAlign: "right" }}>
                {c.pret && c.remis ? fmtDuree(minutes(c.pret, c.remis)) : "—"}
              </span>
              <span className="font-mono" style={{ fontSize: 12, fontWeight: 600, color: "#0e3947", textAlign: "right" }}>
                {c.remis ? fmtDuree(minutes(c.saisie, c.remis)) : "en cours"}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <p style={{ fontSize: 12, color: "#9a927f", marginTop: 14 }}>
        Le temps de production vient du temps déclaré sur les fiches (÷ rendement × quantités vendues) —
        une ESTIMATION tant que les préparations ne sont pas chronométrées. Coût main-d&apos;œuvre et pertes :
        arbitrage MO à prendre (forfait/portion des Finances vs temps × taux horaire) — signalé, non composé ici.
      </p>
    </>
  );
}

/** Minutes de TRAVAIL cumulées → heures (jamais des jours : ce n'est pas une durée écoulée). */
function fmtHeuresTravail(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${String(Math.round(min % 60)).padStart(2, "0")}`;
}

/** Couverture affichée honnêtement : « 100 % » seulement si TOUT est couvert. */
function fmtCouverture(c: number): string {
  if (c >= 1) return "100 %";
  const pct = c * 100;
  return `${(Math.min(pct, 99.9)).toFixed(1).replace(".", ",")} %`;
}

function fmtJour(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" }).format(new Date(`${iso}T12:00:00Z`));
}

function minutes(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 60000;
}

function fmtDuree(min: number): string {
  if (min < 1) return "< 1 min";
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} h ${String(Math.round(min % 60)).padStart(2, "0")}`;
  return `${Math.round(h / 24)} j`;
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(iso));
}
