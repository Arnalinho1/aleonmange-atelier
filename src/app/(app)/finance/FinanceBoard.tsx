"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { CANAL_COLOR, CANAL_LABEL, PAIEMENT_LABEL } from "@/lib/nav";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card, SectionHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { fmtEuro } from "@/lib/calculs";
import type { Canal, Paiement, ParametreRentabilite, SourceVente, StatutPaiement } from "@/lib/supabase/database.types";
import Link from "next/link";
import { enregistrerReglement } from "../orders/actions";

/** Vente remise aplatie + lignes costées côté serveur (source unique calculs.ts). */
export type VenteFinance = {
  id: string;
  occurred_at: string;
  jour: string;
  canal: Canal;
  montant_total: number;
  moyen_paiement: Paiement;
  source_vente: SourceVente;
};
export type LigneFinance = {
  vente_id: string;
  libelle: string;
  qte: number | null;
  montant: number;
  /** Coût matière de la ligne (fiche liée × qte) — null si non calculable. */
  cout: number | null;
};
/** Événement de trésorerie (v_encaissement) — CA ENCAISSÉ, imputé à encaisse_le. */
export type EncaissementFinance = {
  id: string;
  encaisse_le: string;
  canal: Canal;
  montant: number;
};
/** Créance en cours (statut du/partiel) — le pipeline B2B en attente de règlement. */
export type AttenteReglement = {
  id: string;
  canal: Canal;
  client_nom: string | null;
  montant_total: number;
  restant: number;
  statut_paiement: StatutPaiement;
  echeance_paiement: string | null;
  livree: boolean;
};

const PERIODES = [
  { id: "7j", label: "7 jours", jours: 7 },
  { id: "30j", label: "30 jours", jours: 30 },
  { id: "90j", label: "90 jours", jours: 90 },
] as const;

/**
 * Finances — DEUX CA, deux sources, deux libellés, jamais confondus :
 * « CA facturé » (v_vente_remise, imputé au jour de LIVRAISON) et
 * « CA encaissé » (v_encaissement, imputé au jour de RÈGLEMENT). Au comptoir
 * ils coïncident ; l'écart vit sur le traiteur B2B (créances J+30, encart
 * « En attente de règlement »). Marges aux libellés DISTINCTS : « brute
 * matière » vs « nette » (après MO + transport par portion). Export CSV réel.
 */
export function FinanceBoard({
  ventes,
  lignes,
  encaissements,
  enAttente,
  parametres,
}: {
  ventes: VenteFinance[];
  lignes: LigneFinance[];
  encaissements: EncaissementFinance[];
  enAttente: AttenteReglement[];
  parametres: ParametreRentabilite | null;
}) {
  const router = useRouter();
  const [periode, setPeriode] = useState<(typeof PERIODES)[number]["id"]>("30j");
  const [canal, setCanal] = useState<Canal | "all">("all");
  const [error, setError] = useState<string | undefined>();
  const [maintenant] = useState(() => Date.now());

  const filtrees = useMemo(() => {
    const p = PERIODES.find((x) => x.id === periode)!;
    const limite = maintenant - p.jours * 86400000;
    return ventes.filter(
      (v) => new Date(v.occurred_at).getTime() >= limite && (canal === "all" || v.canal === canal)
    );
  }, [ventes, periode, canal, maintenant]);

  const idsFiltres = useMemo(() => new Set(filtrees.map((v) => v.id)), [filtrees]);
  const lignesFiltrees = useMemo(() => lignes.filter((l) => idsFiltres.has(l.vente_id)), [lignes, idsFiltres]);

  const ca = filtrees.reduce((acc, v) => acc + v.montant_total, 0);
  const lignesCostees = lignesFiltrees.filter((l) => l.cout != null);
  const cout = lignesCostees.reduce((acc, l) => acc + (l.cout ?? 0), 0);
  const margeBrute = ca - cout;
  const portions = lignesFiltrees.reduce((acc, l) => acc + (l.qte ?? 1), 0);
  const chargesPortion =
    parametres && (parametres.mo_par_portion != null || parametres.transport_par_portion != null)
      ? (parametres.mo_par_portion ?? 0) + (parametres.transport_par_portion ?? 0)
      : null;
  const margeNette = chargesPortion != null ? margeBrute - chargesPortion * portions : null;

  // CA ENCAISSÉ (trésorerie) — même fenêtre période × canal, imputé à encaisse_le.
  const encaisseFiltre = useMemo(() => {
    const p = PERIODES.find((x) => x.id === periode)!;
    const limite = maintenant - p.jours * 86400000;
    return encaissements.filter(
      (e) => new Date(e.encaisse_le).getTime() >= limite && (canal === "all" || e.canal === canal)
    );
  }, [encaissements, periode, canal, maintenant]);
  const caEncaisse = encaisseFiltre.reduce((acc, e) => acc + e.montant, 0);

  // Créances en cours — filtrées par canal SEULEMENT (une créance reste due,
  // quelle que soit la fenêtre d'analyse).
  const attenteFiltree = enAttente.filter((a) => canal === "all" || a.canal === canal);
  const totalAttente = attenteFiltree.reduce((acc, a) => acc + a.restant, 0);
  const aujourdhuiIso = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date(maintenant));

  // Table par plat
  const parPlat = useMemo(() => {
    const map = new Map<string, { libelle: string; qte: number; ca: number; cout: number | null }>();
    for (const l of lignesFiltrees) {
      const cur = map.get(l.libelle) ?? { libelle: l.libelle, qte: 0, ca: 0, cout: null };
      cur.qte += l.qte ?? 1;
      cur.ca += l.montant;
      if (l.cout != null) cur.cout = (cur.cout ?? 0) + l.cout;
      map.set(l.libelle, cur);
    }
    return [...map.values()].sort((a, b) => b.ca - a.ca);
  }, [lignesFiltrees]);

  // CA par canal (sur le jeu périodé, hors filtre canal pour la ventilation)
  const parCanal = useMemo(() => {
    const p = PERIODES.find((x) => x.id === periode)!;
    const limite = maintenant - p.jours * 86400000;
    const base = ventes.filter((v) => new Date(v.occurred_at).getTime() >= limite);
    const acc = { truck: { ca: 0, n: 0 }, boutique: { ca: 0, n: 0 }, traiteur: { ca: 0, n: 0 } };
    for (const v of base) {
      acc[v.canal].ca += v.montant_total;
      acc[v.canal].n += 1;
    }
    return acc;
  }, [ventes, periode, maintenant]);
  const caTotal = Object.values(parCanal).reduce((a, x) => a + x.ca, 0);

  /** Export compta : CSV réel des ventes remises filtrées. */
  function exporterCsv() {
    const lignesCsv = [
      "date;canal;montant;paiement;source",
      ...filtrees.map((v) =>
        [v.jour, v.canal, v.montant_total.toFixed(2).replace(".", ","), PAIEMENT_LABEL[v.moyen_paiement], v.source_vente].join(";")
      ),
    ];
    const blob = new Blob(["﻿" + lignesCsv.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compta-alm-${periode}${canal === "all" ? "" : `-${canal}`}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: 16 }}>
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
        <span style={{ width: 1, height: 22, background: "#e1d7c3" }} />
        <div className="flex gap-2">
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
        </div>
        <span className="font-mono" style={{ marginLeft: "auto", fontSize: 11, color: "#9a927f" }}>
          ventes remises uniquement — même source que l&apos;Historique
        </span>
      </div>

      {error && (
        <p style={{ fontSize: 12.5, color: "#c0442e", background: "rgba(192,68,46,.1)", borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>{error}</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 16 }} className="fz-fin-kpi">
        <KpiCard
          label="CA facturé"
          value={`${fmtEuro(ca)} €`}
          sub={`prestations livrées · ${filtrees.length} vente${filtrees.length > 1 ? "s" : ""} · au jour de livraison`}
        />
        <KpiCard
          label="CA encaissé"
          value={`${fmtEuro(caEncaisse)} €`}
          sub={`trésorerie · ${encaisseFiltre.length} règlement${encaisseFiltre.length > 1 ? "s" : ""} · au jour de règlement`}
        />
        <KpiCard
          label="Coût matière"
          value={lignesCostees.length > 0 ? `${fmtEuro(cout)} €` : "—"}
          sub={`${lignesCostees.length}/${lignesFiltrees.length} lignes costées`}
        />
        <KpiCard
          label="Marge brute matière"
          value={lignesCostees.length > 0 ? `${fmtEuro(margeBrute)} €` : "—"}
          sub="CA facturé − coût matière"
        />
        <KpiCard
          label="Marge nette"
          value={margeNette != null && lignesCostees.length > 0 ? `${fmtEuro(margeNette)} €` : "—"}
          sub={chargesPortion == null ? "paramètres MO/transport manquants" : "après MO + transport"}
        />
      </div>

      {/* En attente de règlement — le pipeline des créances traiteur B2B (livré ≠ réglé) */}
      <Card style={{ overflow: "hidden", marginBottom: 20 }}>
        <SectionHeader
          titre="En attente de règlement"
          sous="Créances en cours (dû / partiel) — hors filtre de période : une créance reste due tant qu'elle n'est pas soldée."
          compteur={attenteFiltree.length > 0 ? `${attenteFiltree.length} créance${attenteFiltree.length > 1 ? "s" : ""} · ${fmtEuro(totalAttente)} €` : undefined}
        />
        {attenteFiltree.length === 0 ? (
          <p style={{ fontSize: 13, color: "#6b7469", padding: 16 }}>Aucune créance en cours — tout est réglé.</p>
        ) : (
          <div>
            {attenteFiltree.map((a) => {
              const enRetard = a.echeance_paiement != null && a.echeance_paiement < aujourdhuiIso;
              return (
                <div key={a.id} className="flex items-center gap-3 flex-wrap" style={{ padding: "10px 16px", borderBottom: "1px solid #efe7d6" }}>
                  <Dot color={CANAL_COLOR[a.canal]} size={7} />
                  <span style={{ minWidth: 160 }}>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "#0e3947" }}>{a.client_nom ?? "Sans client"}</span>
                    <span className="font-mono" style={{ fontSize: 10, color: "#a79b84" }}>
                      {CANAL_LABEL[a.canal]} · {a.livree ? "livrée" : "à livrer"}
                    </span>
                  </span>
                  <Badge tone={a.statut_paiement === "du" ? "critique" : "alerte"}>
                    {a.statut_paiement === "du" ? "Dû" : "Partiel"}
                  </Badge>
                  <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: "#0e3947" }}>
                    {fmtEuro(a.restant)} €
                    {a.statut_paiement === "partiel" && (
                      <span style={{ fontWeight: 400, color: "#9a927f" }}> / {fmtEuro(a.montant_total)} €</span>
                    )}
                  </span>
                  <span className="font-mono" style={{ fontSize: 11.5, color: enRetard ? "#b00d1a" : "#6b7469", fontWeight: enRetard ? 700 : 400 }}>
                    {a.echeance_paiement != null
                      ? `échéance ${fmtDateCourt(a.echeance_paiement)}${enRetard ? " · EN RETARD" : ""}`
                      : "échéance fixée à la livraison (J+30)"}
                  </span>
                  <span style={{ marginLeft: "auto" }}>
                    <ReglementRapide venteId={a.id} restant={a.restant} onDone={() => router.refresh()} onError={setError} />
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, alignItems: "start" }} className="fz-users-grid">
        {/* CA & marge par plat */}
        <Card style={{ overflow: "hidden" }}>
          <SectionHeader titre="CA & marge nette par plat" sous="Coût = fiche technique liée ; « — » si non costé." />
          {parPlat.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6b7469", padding: 16 }}>Pas de données sur la période.</p>
          ) : (
            <div>
              <div
                className="font-mono uppercase"
                style={{ display: "grid", gridTemplateColumns: "1.8fr .6fr .8fr .8fr .8fr .6fr", gap: 8, padding: "8px 16px", fontSize: 10, letterSpacing: ".08em", color: "#a79b84", borderBottom: "1px solid #efe7d6" }}
              >
                <span>Plat</span>
                <span style={{ textAlign: "right" }}>Ventes</span>
                <span style={{ textAlign: "right" }}>CA</span>
                <span style={{ textAlign: "right" }}>Coût</span>
                <span style={{ textAlign: "right" }}>Nette</span>
                <span style={{ textAlign: "right" }}>%</span>
              </div>
              {parPlat.map((p) => {
                const nette =
                  p.cout != null && chargesPortion != null ? p.ca - p.cout - chargesPortion * p.qte : null;
                return (
                  <div
                    key={p.libelle}
                    style={{ display: "grid", gridTemplateColumns: "1.8fr .6fr .8fr .8fr .8fr .6fr", gap: 8, padding: "10px 16px", alignItems: "center", borderBottom: "1px solid #efe7d6" }}
                  >
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0e3947", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.libelle}</span>
                    <span className="font-mono" style={{ fontSize: 12, color: "#6b7469", textAlign: "right" }}>{p.qte}</span>
                    <span className="font-mono" style={{ fontSize: 12.5, fontWeight: 600, color: "#0e3947", textAlign: "right" }}>{fmtEuro(p.ca)} €</span>
                    <span className="font-mono" style={{ fontSize: 12, color: "#6b7469", textAlign: "right" }}>{p.cout != null ? `${fmtEuro(p.cout)} €` : "—"}</span>
                    <span className="font-mono" style={{ fontSize: 12.5, fontWeight: 600, color: "#1493be", textAlign: "right" }}>{nette != null ? `${fmtEuro(nette)} €` : "—"}</span>
                    <span className="font-mono" style={{ fontSize: 11.5, color: nette != null && p.ca > 0 ? (nette >= 0 ? "#1f8a5b" : "#b00d1a") : "#9a927f", textAlign: "right" }}>
                      {nette != null && p.ca > 0 ? `${Math.round((nette / p.ca) * 100)} %` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          {/* Paramètres de rentabilité — LECTURE SEULE : la saisie vit dans Réglages */}
          <Card style={{ padding: 16 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "#0e3947" }}>Paramètres de rentabilité</p>
              <Badge tone="calcule">Marge nette</Badge>
            </div>
            <div className="flex flex-col gap-2">
              <p className="flex items-center justify-between" style={{ fontSize: 12.5, color: "#6b7469" }}>
                Main-d&apos;œuvre / portion
                <span className="font-mono" style={{ fontWeight: 700, color: "#0e3947" }}>
                  {parametres?.mo_par_portion != null ? `${fmtEuro(parametres.mo_par_portion)} €` : "—"}
                </span>
              </p>
              <p className="flex items-center justify-between" style={{ fontSize: 12.5, color: "#6b7469" }}>
                Transport / portion
                <span className="font-mono" style={{ fontWeight: 700, color: "#0e3947" }}>
                  {parametres?.transport_par_portion != null ? `${fmtEuro(parametres.transport_par_portion)} €` : "—"}
                </span>
              </p>
            </div>
            <p style={{ fontSize: 11.5, color: "#9a927f", marginTop: 8 }}>
              Marge <strong>brute matière</strong> = prix − coût matière. Marge <strong>nette</strong> = après
              ces charges par portion. Deux calculs, deux libellés — jamais confondus.
            </p>
            <Link
              href="/settings"
              style={{ display: "inline-block", marginTop: 8, fontSize: 12.5, fontWeight: 600, color: "#1493be" }}
            >
              Modifier dans Réglages de l&apos;atelier →
            </Link>
          </Card>

          {/* CA par canal */}
          <Card style={{ padding: 16 }}>
            <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "#0e3947", marginBottom: 10 }}>CA par canal</p>
            {caTotal === 0 ? (
              <p style={{ fontSize: 12.5, color: "#6b7469" }}>Pas de données sur la période.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {(Object.keys(parCanal) as Canal[]).map((c) => (
                  <div key={c}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 3 }}>
                      <Dot color={CANAL_COLOR[c]} size={7} />
                      <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: "#0e3947" }}>{CANAL_LABEL[c]}</span>
                      <span className="font-mono" style={{ fontSize: 12, fontWeight: 600, color: "#0e3947" }}>{fmtEuro(parCanal[c].ca)} €</span>
                      <span className="font-mono" style={{ fontSize: 10.5, color: "#9a927f" }}>
                        {caTotal > 0 ? `${Math.round((parCanal[c].ca / caTotal) * 100)} %` : ""}
                      </span>
                    </div>
                    <div style={{ height: 7, borderRadius: 100, background: "#e4dac6" }}>
                      <div style={{ width: `${caTotal > 0 ? (parCanal[c].ca / caTotal) * 100 : 0}%`, height: "100%", borderRadius: 100, background: CANAL_COLOR[c] }} />
                    </div>
                    <p className="font-mono" style={{ fontSize: 10, color: "#a79b84", marginTop: 2 }}>
                      {parCanal[c].n} vente{parCanal[c].n > 1 ? "s" : ""}
                      {parCanal[c].n > 0 ? ` · panier ${fmtEuro(parCanal[c].ca / parCanal[c].n)} €` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Export comptable */}
          <div style={{ background: "#0e3947", borderRadius: 16, padding: 18 }}>
            <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "#f6f1e7", marginBottom: 4 }}>Export comptable</p>
            <p className="font-mono" style={{ fontSize: 10.5, color: "#8fcfe2", marginBottom: 12 }}>
              {filtrees.length} vente{filtrees.length > 1 ? "s" : ""} · {periode} · {canal === "all" ? "tous canaux" : CANAL_LABEL[canal]}
            </p>
            <button
              onClick={exporterCsv}
              disabled={filtrees.length === 0}
              className="flex items-center justify-center gap-2 font-display transition-opacity hover:opacity-90"
              style={{ width: "100%", padding: "12px", borderRadius: 11, background: "#d81020", color: "#f6f1e7", fontWeight: 700, fontSize: 14.5, opacity: filtrees.length === 0 ? 0.4 : 1 }}
            >
              <Download size={16} strokeWidth={2.4} />
              Exporter le CSV compta
            </button>
            <p className="font-mono" style={{ fontSize: 9.5, color: "#5c8593", marginTop: 8 }}>
              date · canal · montant · paiement · source (TVA : taux à cadrer)
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Règlement rapide d'une créance (action enregistrerReglement du temps 1) —
 * montant prérempli = restant dû ; partiel possible, dépassement rejeté serveur.
 */
function ReglementRapide({
  venteId,
  restant,
  onDone,
  onError,
}: {
  venteId: string;
  restant: number;
  onDone: () => void;
  onError: (msg: string | undefined) => void;
}) {
  const [montant, setMontant] = useState(fmtEuro(restant));
  const [moyen, setMoyen] = useState<Paiement>("virement");
  const [enCours, setEnCours] = useState(false);

  return (
    <span className="flex items-center gap-1.5 flex-wrap">
      <input
        value={montant}
        onChange={(e) => setMontant(e.target.value)}
        inputMode="decimal"
        aria-label="Montant du règlement"
        className="outline-none font-mono"
        style={{ width: 88, background: "#fff", border: "1px solid #dfd4bf", borderRadius: 9, padding: "7px 9px", fontSize: 12.5, color: "#0e3947" }}
      />
      <select
        value={moyen}
        onChange={(e) => setMoyen(e.target.value as Paiement)}
        aria-label="Moyen de paiement"
        className="outline-none"
        style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 9, padding: "7px 8px", fontSize: 12.5, color: "#0e3947" }}
      >
        <option value="virement">Virement</option>
        <option value="cb">CB</option>
        <option value="especes">Espèces</option>
        <option value="ticket">Ticket resto</option>
      </select>
      <button
        onClick={async () => {
          onError(undefined);
          setEnCours(true);
          try {
            const res = await enregistrerReglement(venteId, Number(montant.replace(",", ".")), moyen);
            if (res?.error) onError(res.error);
            else onDone();
          } finally {
            setEnCours(false);
          }
        }}
        disabled={enCours}
        style={{ padding: "7px 12px", borderRadius: 9, background: "#0e3947", color: "#f6f1e7", fontSize: 12, fontWeight: 600, opacity: enCours ? 0.5 : 1 }}
      >
        {enCours ? "…" : "Enregistrer le règlement"}
      </button>
    </span>
  );
}

function fmtDateCourt(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Europe/Paris" }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));
}
