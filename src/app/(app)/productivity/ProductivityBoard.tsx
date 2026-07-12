"use client";

import { useMemo, useState } from "react";
import { CANAL_COLOR, CANAL_LABEL } from "@/lib/nav";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card, SectionHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
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

/**
 * Productivité — cadences RÉELLES mesurées sur les transitions horodatées
 * de fulfillment_event (écrites par Commandes du jour). Les blocs maquette
 * dépendant des lots (temps par lot, MO, pertes) suivront la Phase 4.
 */
export function ProductivityBoard({ cycles }: { cycles: CycleCommande[] }) {
  const [canal, setCanal] = useState<Canal | "all">("all");

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
        <span className="font-mono" style={{ marginLeft: "auto", fontSize: 11, color: "#9a927f" }}>
          mesuré sur les transitions réelles des Commandes
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
        Temps par lot, coût main-d&apos;œuvre et pertes arrivent avec les lots de production (Phase 4) et
        les temps théoriques des fiches — signalé, non simulé.
      </p>
    </>
  );
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
