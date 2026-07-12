"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { CATEGORIE_COLOR, CATEGORIE_LABEL } from "@/lib/nav";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card, SectionHeader } from "@/components/ui/Card";
import { ChanFilter, type ChanFilterValue } from "@/components/ui/ChanFilter";
import {
  agregerPlanProduits,
  besoinsMatieres,
  fmtGrammes,
  fmtPortions,
  portionGParRecette,
} from "@/lib/plan";
import type { Canal, Composant, Emplacement, Lot, Produit, Recette, RecetteComposant } from "@/lib/supabase/database.types";
import { enregistrerReception } from "../stock/actions";

/** Ligne vendue (7 j, remises) enrichie du canal/emplacement pour le prisme. */
export type LigneVendue = {
  ligne_id: string;
  produit_id: string | null;
  type: string;
  recette_id: string | null;
  qte: number | null;
  poids_g: number | null;
  canal: Canal;
  emplacement_id: string | null;
};

/**
 * Production — le plan est PAR PRODUIT FABRIQUÉ (correctif métier 12/07/2026,
 * source unique lib/plan.ts). Les besoins matières premières sont DÉRIVÉS du
 * plan (plan × fiches) — jamais « à produire ». L'enregistrement de lot reste
 * au niveau matière (modèle lots/produits finis : arbitrage en attente).
 */
export function ProdBoard({
  composants,
  produits,
  recettes,
  lignesRecettes,
  lignesVendues,
  composantsLibres,
  lotsDuJour,
  emplacements,
}: {
  composants: Composant[];
  produits: Produit[];
  recettes: Recette[];
  lignesRecettes: RecetteComposant[];
  lignesVendues: LigneVendue[];
  composantsLibres: { ligne_id: string; composant_id: string }[];
  lotsDuJour: Lot[];
  emplacements: Emplacement[];
}) {
  const router = useRouter();
  const [filtre, setFiltre] = useState<ChanFilterValue>({ canal: "all", emplacementId: "all" });
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const prodParId = useMemo(() => new Map(produits.map((p) => [p.id, p])), [produits]);
  const compParId = useMemo(() => new Map(composants.map((c) => [c.id, c])), [composants]);
  const recetteParId = useMemo(() => new Map(recettes.map((r) => [r.id, r])), [recettes]);
  const lignesParRecette = useMemo(() => {
    const map = new Map<string, RecetteComposant[]>();
    for (const l of lignesRecettes) {
      const arr = map.get(l.recette_id) ?? [];
      arr.push(l);
      map.set(l.recette_id, arr);
    }
    return map;
  }, [lignesRecettes]);
  const portionG = useMemo(() => portionGParRecette(recettes, lignesRecettes), [recettes, lignesRecettes]);

  // ── Prisme : le ChanFilter recadre les lignes sources, puis UN SEUL calcul.
  const lignesFiltrees = useMemo(
    () =>
      lignesVendues.filter(
        (l) =>
          (filtre.canal === "all" || l.canal === filtre.canal) &&
          (filtre.canal !== "truck" || filtre.emplacementId === "all" || l.emplacement_id === filtre.emplacementId)
      ),
    [lignesVendues, filtre]
  );
  const plan = useMemo(
    () => agregerPlanProduits(lignesFiltrees, prodParId, portionG),
    [lignesFiltrees, prodParId, portionG]
  );

  // Prévision demain : moyenne 7 j × buffer +10 % (règle INDICATIVE inchangée).
  const prevision = useMemo(
    () =>
      plan.produits.map((p) => ({
        ...p,
        moyenne: p.portions / 7,
        suggere: Math.ceil(((p.portions / 7) * 1.1) * 10) / 10,
      })),
    [plan.produits]
  );

  // Besoins matières = plan (suggéré) × fiches — dérivation, pas de production.
  const besoins = useMemo(
    () =>
      besoinsMatieres(
        prevision.map((p) => ({ recette_id: p.recette_id, portions: p.suggere })),
        recetteParId,
        lignesParRecette,
        compParId
      ),
    [prevision, recetteParId, lignesParRecette, compParId]
  );

  // Composants réels des bowls LIBRES (portions, sans grammages — dépliage réel).
  const libresDetail = useMemo(() => {
    const lignesLibres = new Map(
      lignesFiltrees.filter((l) => l.type === "bowl" && l.recette_id == null).map((l) => [l.ligne_id, l.qte ?? 1])
    );
    const map = new Map<string, { composant: Composant; portions: number }>();
    for (const row of composantsLibres) {
      const portions = lignesLibres.get(row.ligne_id);
      if (!portions) continue;
      const composant = compParId.get(row.composant_id);
      if (!composant) continue;
      const cur = map.get(composant.id) ?? { composant, portions: 0 };
      cur.portions += portions;
      map.set(composant.id, cur);
    }
    return [...map.values()].sort((a, b) => b.portions - a.portions);
  }, [lignesFiltrees, composantsLibres, compParId]);

  function onSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const res = await enregistrerReception(undefined, formData);
      if (res?.error) setError(res.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  const maxBesoin = Math.max(1, ...besoins.map((b) => b.grammes));

  return (
    <>
      <div className="flex justify-end" style={{ marginBottom: 16 }}>
        <button
          onClick={() => { setError(undefined); setOpen(true); }}
          className="flex items-center gap-2 font-display transition-opacity hover:opacity-90"
          style={{ background: "#1493be", color: "#f6f1e7", fontWeight: 700, fontSize: 14, padding: "9px 15px", borderRadius: 11 }}
        >
          <Plus size={16} strokeWidth={2.4} />
          Enregistrer un lot
        </button>
      </div>

      <ChanFilter emplacements={emplacements} value={filtre} onChange={setFiltre} note="Prisme : recadre la prévision sur le canal/emplacement." />

      {/* Prévision — demain : PAR PRODUIT FABRIQUÉ */}
      <div style={{ background: "#0e3947", borderRadius: 16, padding: 18, marginBottom: 16 }}>
        <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 4 }}>
          <p className="font-display" style={{ fontSize: 16, fontWeight: 700, color: "#f6f1e7" }}>Prévision — demain</p>
          <Badge tone="demo">Aide à la décision</Badge>
        </div>
        <p className="font-mono" style={{ fontSize: 10.5, color: "#8fcfe2", marginBottom: 14 }}>
          par PRODUIT FABRIQUÉ · moyenne 7 j des ventes remises + buffer 10 % — règle INDICATIVE, à valider · les revendus tels quels n&apos;apparaissent jamais
        </p>
        {prevision.length === 0 && plan.libresPortions === 0 ? (
          <p style={{ fontSize: 13, color: "#bfdce7" }}>
            Pas encore d&apos;historique pour prévoir sur ce filtre — saisissez vos préparations via « Enregistrer un lot ».
          </p>
        ) : (
          <>
            <div
              className="font-mono uppercase"
              style={{ display: "grid", gridTemplateColumns: "1.6fr .8fr .7fr .7fr", gap: 8, fontSize: 9.5, letterSpacing: ".08em", color: "#5c8593", paddingBottom: 7, borderBottom: "1px solid rgba(255,255,255,.1)" }}
            >
              <span>Produit fabriqué</span>
              <span style={{ textAlign: "right" }}>Vendu (7 j)</span>
              <span style={{ textAlign: "right" }}>Moyenne / j</span>
              <span style={{ textAlign: "right" }}>Suggéré</span>
            </div>
            {prevision.map((p) => (
              <div
                key={p.produit_id}
                style={{ display: "grid", gridTemplateColumns: "1.6fr .8fr .7fr .7fr", gap: 8, padding: "8px 0", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,.08)" }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "#f6f1e7" }}>
                  {p.nom}
                  {p.kg != null && (
                    <span className="font-mono" style={{ marginLeft: 8, fontSize: 9.5, color: "#5c8593" }}>
                      ≈ {p.kg.toFixed(1).replace(".", ",")} kg vendus
                    </span>
                  )}
                </span>
                <span className="font-mono" style={{ fontSize: 12, color: "#bfdce7", textAlign: "right" }}>
                  {fmtPortions(p.portions)} portion{p.portions > 1 ? "s" : ""}
                </span>
                <span className="font-mono" style={{ fontSize: 12, color: "#bfdce7", textAlign: "right" }}>{p.moyenne.toFixed(1).replace(".", ",")}</span>
                <span className="font-display" style={{ fontSize: 19, fontWeight: 800, color: "#8fcfe2", textAlign: "right" }}>×{fmtPortions(p.suggere)}</span>
              </div>
            ))}
            {plan.libresPortions > 0 && (
              <p className="font-mono" style={{ fontSize: 10.5, color: "#8fcfe2", marginTop: 10 }}>
                + {plan.libresPortions} bowl{plan.libresPortions > 1 ? "s" : ""} libre{plan.libresPortions > 1 ? "s" : ""} (7 j) — composition variable, voir besoins matières.
              </p>
            )}
            {plan.kgNonConvertis.length > 0 && (
              <p className="font-mono" style={{ fontSize: 10, color: "#5c8593", marginTop: 4 }}>
                Non convertis en portions (fiche sans grammages) : {plan.kgNonConvertis.map((k) => `${k.nom} ${k.kg.toFixed(1).replace(".", ",")} kg`).join(" · ")}
              </p>
            )}
          </>
        )}
      </div>

      {/* Plan du jour + besoins dérivés + lots */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16, alignItems: "start" }}>
        <Card style={{ overflow: "hidden" }}>
          <SectionHeader
            titre="Plan de production du jour"
            sous="Photo du suggéré par produit. Le suivi « fait / à faire » reviendra avec l'arbitrage lots ↔ produits finis."
          />
          <div style={{ padding: 16 }}>
            {prevision.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "#6b7469" }}>Rien à planifier sur ce filtre.</p>
            ) : (
              prevision.map((p) => (
                <div key={p.produit_id} className="flex items-center gap-2" style={{ padding: "6px 0", borderBottom: "1px solid #efe7d6" }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#0e3947" }}>{p.nom}</span>
                  <span className="font-display" style={{ fontSize: 16, fontWeight: 800, color: "#1493be" }}>×{fmtPortions(p.suggere)}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card style={{ overflow: "hidden" }}>
          <SectionHeader
            titre="Besoins matières premières"
            sous="Dérivés du plan (plan × fiches techniques) — ce n'est pas la production."
            action={<Badge tone="calcule">Dérivé</Badge>}
          />
          <div style={{ padding: 16 }}>
            {besoins.length === 0 && libresDetail.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "#6b7469" }}>Aucun besoin dérivable sur ce filtre.</p>
            ) : (
              <>
                {besoins.map((b) => (
                  <div key={b.composant.id} style={{ padding: "5px 0" }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 3 }}>
                      <Dot color={CATEGORIE_COLOR[b.composant.categorie]} size={7} />
                      <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: "#0e3947" }}>{b.composant.nom}</span>
                      <span className="font-mono" style={{ fontSize: 10, color: "#a79b84" }}>{CATEGORIE_LABEL[b.composant.categorie]}</span>
                      <span className="font-mono" style={{ fontSize: 12, fontWeight: 600, color: "#0e3947" }}>{fmtGrammes(b.grammes)}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 100, background: "#e4dac6" }}>
                      <div style={{ width: `${(b.grammes / maxBesoin) * 100}%`, height: "100%", borderRadius: 100, background: CATEGORIE_COLOR[b.composant.categorie] }} />
                    </div>
                  </div>
                ))}
                {plan.libresPortions > 0 && (
                  <div style={{ marginTop: 12, background: "#f1ead9", borderRadius: 10, padding: "9px 12px" }}>
                    <p className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: ".08em", color: "#8a7f6a", marginBottom: 5 }}>
                      + {plan.libresPortions} bowl{plan.libresPortions > 1 ? "s" : ""} libre{plan.libresPortions > 1 ? "s" : ""} — composition variable
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {libresDetail.map((x) => (
                        <span key={x.composant.id} className="flex items-center gap-1 font-mono" style={{ fontSize: 10.5, color: "#6b7469", background: "#fbf8f1", border: "1px solid #e4dac6", borderRadius: 100, padding: "2px 8px" }}>
                          <Dot color={CATEGORIE_COLOR[x.composant.categorie]} size={6} />
                          {x.composant.nom} · {x.portions} portion{x.portions > 1 ? "s" : ""}
                        </span>
                      ))}
                    </div>
                    <p className="font-mono" style={{ fontSize: 9, color: "#a79b84", marginTop: 5 }}>
                      comptés en portions — le dépliage réel ne porte pas de grammages
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        <Card style={{ overflow: "hidden" }}>
          <SectionHeader titre="Préparations de matières (lots du jour)" compteur={`${lotsDuJour.length} lot${lotsDuJour.length > 1 ? "s" : ""}`} />
          <div style={{ padding: 16 }}>
            {lotsDuJour.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "#6b7469" }}>
                Aucun lot aujourd&apos;hui — « Enregistrer un lot » crée le lot et son entrée en stock (niveau matière ; le rattachement aux produits finis est en attente d&apos;arbitrage).
              </p>
            ) : (
              lotsDuJour.map((lot) => {
                const comp = compParId.get(lot.composant_id);
                return (
                  <div key={lot.id} style={{ background: "#fbf8f1", border: "1px solid #e4dac6", borderRadius: 11, padding: "9px 12px", marginBottom: 8 }}>
                    <div className="flex items-center gap-2">
                      <Dot color={comp ? CATEGORIE_COLOR[comp.categorie] : "#9a927f"} size={7} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#0e3947" }}>{comp?.nom ?? "Composant"}</span>
                      <span className="font-mono" style={{ fontSize: 11, color: "#1493be", fontWeight: 600 }}>{lot.numero ?? "sans n°"}</span>
                    </div>
                    <p className="font-mono" style={{ fontSize: 10.5, color: "#8a7f6a", marginTop: 3 }}>
                      Qté {lot.quantite != null ? `${String(lot.quantite).replace(".", ",")}` : "—"}
                      {lot.dlc ? ` · DLC ${fmtDate(lot.dlc)}` : ""}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {open && (
        <div className="fixed inset-0 flex justify-end" style={{ background: "rgba(15,24,19,.5)", zIndex: 70 }} onClick={() => setOpen(false)}>
          <div className="fz-scroll h-full overflow-y-auto" style={{ width: "min(420px,92vw)", background: "#fbf8f1", boxShadow: "-20px 0 60px rgba(0,0,0,.25)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between" style={{ background: "#0e3947", padding: "18px 20px" }}>
              <div>
                <p className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: ".14em", color: "#8fcfe2" }}>Production</p>
                <p className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "#f6f1e7" }}>Enregistrer un lot</p>
              </div>
              <button onClick={() => setOpen(false)} style={{ color: "#8fcfe2" }}><X size={20} /></button>
            </div>
            <form action={onSubmit} className="flex flex-col gap-4" style={{ padding: 20 }}>
              <label className="flex flex-col gap-1.5">
                <Libelle>Composant préparé</Libelle>
                <select name="composant_id" required className="outline-none" style={champ}>
                  <option value="">— choisir —</option>
                  {composants.map((c) => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <Libelle>Quantité produite (kg / pièces / L selon le composant)</Libelle>
                <input name="quantite" required inputMode="decimal" placeholder="ex : 4,5" className="outline-none font-display" style={{ ...champ, fontSize: 22, fontWeight: 700 }} />
              </label>
              <label className="flex flex-col gap-1.5">
                <Libelle>N° de lot (optionnel)</Libelle>
                <input name="numero" placeholder="ex : PROD-2026-07-12-A" className="outline-none" style={champ} />
              </label>
              <label className="flex flex-col gap-1.5">
                <Libelle>DLC (optionnel)</Libelle>
                <input name="dlc" type="date" className="outline-none" style={champ} />
              </label>
              <p style={{ fontSize: 12, color: "#9a927f", background: "#f1ead9", borderRadius: 8, padding: "8px 10px" }}>
                Crée le lot ET son entrée en stock, au niveau MATIÈRE. Les lots de produits finis attendent l&apos;arbitrage du modèle de stock.
              </p>
              {error && (
                <p style={{ fontSize: 12.5, color: "#c0442e", background: "rgba(192,68,46,.1)", borderRadius: 8, padding: "8px 10px" }}>{error}</p>
              )}
              <div className="flex gap-2" style={{ marginTop: 4 }}>
                <button type="button" onClick={() => setOpen(false)} style={{ flex: 1, padding: "11px", borderRadius: 11, border: "1px solid #dfd4bf", background: "#fbf8f1", fontSize: 14, fontWeight: 600, color: "#6b7469" }}>
                  Annuler
                </button>
                <button type="submit" disabled={pending} className="font-display" style={{ flex: 1, padding: "11px", borderRadius: 11, background: "#1493be", color: "#f6f1e7", fontWeight: 700, fontSize: 14, opacity: pending ? 0.6 : 1 }}>
                  {pending ? "…" : "Enregistrer le lot"}
                </button>
              </div>
            </form>
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

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));
}
