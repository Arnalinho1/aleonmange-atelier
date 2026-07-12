"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Upload } from "lucide-react";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card, SectionHeader } from "@/components/ui/Card";
import type { Produit } from "@/lib/supabase/database.types";
import { importerVentes } from "./actions";

/** Champs du modèle vers lesquels mapper les colonnes CSV (Contrat §05). */
const CHAMPS_MODELE = [
  { id: "designation", label: "Désignation", requis: true },
  { id: "quantite", label: "Quantité (pièces)", requis: false },
  { id: "poids_kg", label: "Poids (kg)", requis: false },
  { id: "montant", label: "Montant (€)", requis: false },
  { id: "reglement", label: "Règlement", requis: false },
] as const;

const EXEMPLE_CSV = `designation;quantite;poids_kg;montant;reglement
Part de gratin;2;;12,00;CB
Plat du jour;;0,450;8,10;Especes
Ligne inconnue;1;;5,00;CB`;

function normaliser(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function nombre(raw: string | undefined): number | null {
  if (!raw || !raw.trim()) return null;
  const n = Number(raw.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Import caisse — wizard dépôt → mapping → prévisualisation → validation.
 * MAPPING PROVISOIRE ET CONFIGURABLE (POINT OUVERT #1) : à caler sur un
 * vrai export de la caisse boutique avant prod. Le mode est DÉDUIT du
 * produit rapproché — chaque déduction est marquée « à confirmer ».
 * Lignes non rapprochées : signalées et EXCLUES du batch.
 */
export function ImportWizard({
  produits,
  mappingInitial,
}: {
  produits: Produit[];
  mappingInitial: { separateur: string; colonnes: Record<string, string> } | null;
}) {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [fichierNom, setFichierNom] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>(mappingInitial?.colonnes ?? {});
  const [jour, setJour] = useState(() => new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date()));
  const [error, setError] = useState<string | undefined>();
  const [resultat, setResultat] = useState<{ importees: number; exclues: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const prodParNom = useMemo(() => new Map(produits.map((x) => [normaliser(x.nom), x])), [produits]);

  // ── Parsing : séparateur détecté sur l'en-tête (; , ou tabulation).
  const analyse = useMemo(() => {
    const lignesBrutes = csv.split(/\r?\n/).filter((l) => l.trim());
    if (lignesBrutes.length < 2) return null;
    const entete = lignesBrutes[0];
    const separateur = [";", ",", "\t"].reduce((best, sep) =>
      entete.split(sep).length > entete.split(best).length ? sep : best
    );
    const colonnes = entete.split(separateur).map((c) => c.trim());
    const lignes = lignesBrutes.slice(1).map((l) => {
      const cellules = l.split(separateur);
      const obj: Record<string, string> = {};
      colonnes.forEach((c, i) => (obj[c] = (cellules[i] ?? "").trim()));
      return obj;
    });
    return { separateur, colonnes, lignes };
  }, [csv]);

  // ── Auto-mapping par nom de colonne (préférences sauvegardées d'abord).
  const mappingEffectif = useMemo(() => {
    if (!analyse) return {};
    const eff: Record<string, string> = {};
    for (const champ of CHAMPS_MODELE) {
      const choisi = mapping[champ.id];
      if (choisi && analyse.colonnes.includes(choisi)) {
        eff[champ.id] = choisi;
        continue;
      }
      const auto = analyse.colonnes.find((c) => normaliser(c).includes(normaliser(champ.id === "poids_kg" ? "poids" : champ.id)));
      if (auto) eff[champ.id] = auto;
    }
    return eff;
  }, [analyse, mapping]);

  // ── Prévisualisation : rapprochement produit + déduction de mode.
  const preview = useMemo(() => {
    if (!analyse) return [];
    return analyse.lignes.map((row) => {
      const designation = row[mappingEffectif.designation] ?? "";
      const produit = prodParNom.get(normaliser(designation));
      const qte = nombre(row[mappingEffectif.quantite]);
      const poidsKg = nombre(row[mappingEffectif.poids_kg]);
      const montant = nombre(row[mappingEffectif.montant]);
      const reglement = row[mappingEffectif.reglement] ?? null;

      let statut: "importable" | "a_corriger" = "importable";
      let motif = "";
      let deduit = false;
      if (!produit) {
        statut = "a_corriger";
        motif = "désignation inconnue au catalogue boutique";
      } else if (produit.mode === "poids" && (poidsKg == null || poidsKg <= 0)) {
        statut = "a_corriger";
        motif = "poids manquant (produit au kg)";
      } else if (montant == null) {
        deduit = true; // montant recalculé depuis le prix catalogue
        motif = "montant déduit du prix catalogue";
      }
      if (produit && produit.mode === "unite" && qte == null && statut === "importable") {
        deduit = true;
        motif = motif ? `${motif} · qté 1 déduite` : "qté 1 déduite";
      }
      return { designation, produit, qte, poidsKg, montant, reglement, statut, motif, deduit };
    });
  }, [analyse, mappingEffectif, prodParNom]);

  const importables = preview.filter((l) => l.statut === "importable");
  const aCorriger = preview.filter((l) => l.statut === "a_corriger");

  function valider() {
    if (!analyse) return;
    const fd = new FormData();
    fd.set(
      "payload",
      JSON.stringify({
        jour,
        fichier_nom: fichierNom,
        separateur: analyse.separateur,
        colonnes: mappingEffectif,
        lignes: importables.map((l) => ({
          designation: l.designation,
          qte: l.qte,
          poids_kg: l.poidsKg,
          montant: l.montant,
          reglement: l.reglement,
        })),
      })
    );
    setError(undefined);
    startTransition(async () => {
      const res = await importerVentes(undefined, fd);
      if (res?.error) setError(res.error);
      else {
        setResultat({ importees: res?.importees ?? 0, exclues: (res?.exclues ?? 0) + aCorriger.length });
        setCsv("");
        setFichierNom(null);
        router.refresh();
      }
    });
  }

  return (
    <>
      <p style={{ fontSize: 12.5, color: "#8a6f34", background: "rgba(233,162,59,.18)", borderRadius: 10, padding: "9px 12px", marginBottom: 16 }}>
        <strong>Format à caler sur un vrai export.</strong> Le mapping ci-dessous est provisoire et
        configurable (point ouvert #1) — rien n&apos;est figé tant que l&apos;export réel de la caisse
        n&apos;a pas été fourni.
      </p>

      {resultat && (
        <p className="flex items-center gap-2" style={{ fontSize: 13.5, color: "#1f7a50", background: "#e9f3ec", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
          <CheckCircle2 size={16} />
          {resultat.importees} vente{resultat.importees > 1 ? "s" : ""} créée{resultat.importees > 1 ? "s" : ""} dans l&apos;
          <Link href="/history" style={{ fontWeight: 700, textDecoration: "underline" }}>Historique</Link>
          {resultat.exclues > 0 ? ` · ${resultat.exclues} ligne${resultat.exclues > 1 ? "s" : ""} exclue${resultat.exclues > 1 ? "s" : ""}` : ""} — badge « Import ».
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start", marginBottom: 16 }} className="fz-users-grid">
        {/* Étape 1 — Déposer */}
        <Card style={{ padding: 16 }}>
          <EtapeTitre n={1} titre="Déposer le fichier" />
          <label
            className="flex flex-col items-center justify-center gap-2"
            style={{ border: "2px dashed #d8cdb6", borderRadius: 12, padding: "22px 14px", cursor: "pointer", marginBottom: 10 }}
          >
            <Upload size={22} style={{ color: "#9a927f" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0e3947" }}>
              {fichierNom ?? "Choisir un CSV de caisse"}
            </span>
            <span className="font-mono" style={{ fontSize: 10, color: "#a79b84" }}>séparateur ; , ou tabulation — détecté automatiquement</span>
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              style={{ display: "none" }}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setFichierNom(f.name);
                setCsv(await f.text());
                setResultat(null);
              }}
            />
          </label>
          <div className="flex gap-2" style={{ marginBottom: 10 }}>
            <button onClick={() => { setCsv(EXEMPLE_CSV); setFichierNom("exemple.csv"); setResultat(null); }} style={{ fontSize: 12, fontWeight: 600, color: "#1493be" }}>
              Charger l&apos;exemple
            </button>
            {csv && (
              <button onClick={() => { setCsv(""); setFichierNom(null); }} style={{ fontSize: 12, fontWeight: 600, color: "#c0442e" }}>
                Vider
              </button>
            )}
          </div>
          <textarea
            value={csv}
            onChange={(e) => { setCsv(e.target.value); setResultat(null); }}
            rows={5}
            placeholder="…ou collez le contenu CSV ici (1re ligne = en-têtes)"
            className="outline-none fz-scroll font-mono"
            style={{ width: "100%", background: "#fff", border: "1px solid #dfd4bf", borderRadius: 10, padding: "10px 12px", fontSize: 11.5, color: "#0e3947", resize: "vertical" }}
          />
          {analyse && (
            <p className="font-mono" style={{ fontSize: 10.5, color: "#8a7f6a", marginTop: 8 }}>
              Détecté · séparateur « {analyse.separateur === "\t" ? "tab" : analyse.separateur} » · {analyse.colonnes.length} colonnes · {analyse.lignes.length} lignes
            </p>
          )}
        </Card>

        {/* Étape 2 — Mapping */}
        <Card style={{ padding: 16 }}>
          <EtapeTitre n={2} titre="Mapper les colonnes" />
          {!analyse ? (
            <p style={{ fontSize: 12.5, color: "#9a927f" }}>Chargez un fichier pour mapper ses colonnes vers le modèle.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {CHAMPS_MODELE.map((champ) => (
                <label key={champ.id} className="flex items-center gap-2 justify-between">
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0e3947" }}>
                    {champ.label}
                    {champ.requis && <span style={{ color: "#b00d1a" }}> *</span>}
                  </span>
                  <select
                    value={mappingEffectif[champ.id] ?? ""}
                    onChange={(e) => setMapping((s) => ({ ...s, [champ.id]: e.target.value }))}
                    className="outline-none"
                    style={{ width: 150, background: "#fff", border: "1px solid #dfd4bf", borderRadius: 9, padding: "7px 9px", fontSize: 12, color: "#0e3947" }}
                  >
                    <option value="">— ignorer —</option>
                    {analyse.colonnes.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
              ))}
              <label className="flex items-center gap-2 justify-between" style={{ marginTop: 6, paddingTop: 10, borderTop: "1px solid #efe7d6" }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0e3947" }}>Jour d&apos;exploitation</span>
                <input type="date" value={jour} onChange={(e) => setJour(e.target.value)} className="outline-none" style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 9, padding: "7px 9px", fontSize: 12, color: "#0e3947" }} />
              </label>
              <p className="font-mono" style={{ fontSize: 10, color: "#a79b84" }}>
                occurred_at = ce jour (12:00 Europe/Paris) — jamais l&apos;heure d&apos;insertion technique.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Étape 3 — Prévisualisation */}
      {analyse && (
        <Card style={{ overflow: "hidden" }}>
          <SectionHeader
            titre="Prévisualisation"
            compteur={`${importables.length} importable${importables.length > 1 ? "s" : ""} · ${aCorriger.length} à corriger`}
            action={<Badge tone="demo">Mode déduit · à confirmer</Badge>}
          />
          <div>
            <div
              className="font-mono uppercase"
              style={{ display: "grid", gridTemplateColumns: "1.4fr 1.3fr .7fr .7fr .7fr 1.5fr", gap: 8, padding: "8px 16px", fontSize: 10, letterSpacing: ".08em", color: "#a79b84", borderBottom: "1px solid #efe7d6" }}
            >
              <span>Désignation CSV</span>
              <span>Produit rapproché</span>
              <span>Mode</span>
              <span style={{ textAlign: "right" }}>Qté / poids</span>
              <span style={{ textAlign: "right" }}>Montant</span>
              <span>Statut</span>
            </div>
            {preview.map((l, i) => (
              <div
                key={i}
                style={{ display: "grid", gridTemplateColumns: "1.4fr 1.3fr .7fr .7fr .7fr 1.5fr", gap: 8, padding: "9px 16px", alignItems: "center", borderBottom: "1px solid #efe7d6", opacity: l.statut === "a_corriger" ? 0.65 : 1 }}
              >
                <span className="font-mono" style={{ fontSize: 12, color: "#0e3947", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.designation || "—"}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: l.produit ? "#0e3947" : "#c0442e" }}>
                  {l.produit?.nom ?? "non rapproché"}
                </span>
                <span className="font-mono" style={{ fontSize: 11.5, color: "#6b7469" }}>
                  {l.produit ? (l.produit.mode === "unite" ? "unité" : "poids") : "—"}
                  {l.deduit && l.produit && <Badge tone="demo">déduit</Badge>}
                </span>
                <span className="font-mono" style={{ fontSize: 11.5, color: "#6b7469", textAlign: "right" }}>
                  {l.produit?.mode === "poids" ? (l.poidsKg != null ? `${String(l.poidsKg).replace(".", ",")} kg` : "—") : (l.qte ?? 1)}
                </span>
                <span className="font-mono" style={{ fontSize: 12, fontWeight: 600, color: "#0e3947", textAlign: "right" }}>
                  {l.montant != null ? `${l.montant.toFixed(2).replace(".", ",")} €` : l.produit ? "prix catalogue" : "—"}
                </span>
                <span className="flex items-center gap-1.5" style={{ fontSize: 11.5, color: l.statut === "importable" ? "#1f7a50" : "#c0442e" }}>
                  <Dot color={l.statut === "importable" ? "#1f8a5b" : "#c0442e"} size={7} />
                  {l.statut === "importable" ? (l.motif || "prêt") : `exclue — ${l.motif}`}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 flex-wrap" style={{ padding: 16 }}>
            <p className="font-mono" style={{ flex: 1, fontSize: 10.5, color: "#8a7f6a" }}>
              Les lignes exclues ne sont JAMAIS créées à l&apos;aveugle — corrigez le mapping ou le catalogue puis rechargez.
            </p>
            {error && <p style={{ fontSize: 12.5, color: "#c0442e" }}>{error}</p>}
            <button
              onClick={valider}
              disabled={pending || importables.length === 0}
              className="font-display transition-opacity hover:opacity-90"
              style={{ padding: "11px 18px", borderRadius: 11, background: "#d81020", color: "#f6f1e7", fontWeight: 700, fontSize: 14, opacity: pending || importables.length === 0 ? 0.45 : 1 }}
            >
              {pending ? "…" : `Valider & créer ${importables.length} vente${importables.length > 1 ? "s" : ""}`}
            </button>
          </div>
        </Card>
      )}
    </>
  );
}

function EtapeTitre({ n, titre }: { n: number; titre: string }) {
  return (
    <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
      <span className="grid place-items-center font-display" style={{ width: 24, height: 24, borderRadius: 8, background: "#0e3947", color: "#f6f1e7", fontSize: 13, fontWeight: 800 }}>
        {n}
      </span>
      <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "#0e3947" }}>{titre}</p>
    </div>
  );
}
