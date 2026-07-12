"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CANAL_COLOR, CANAL_LABEL, CATEGORIE_COLOR, CATEGORIE_LABEL } from "@/lib/nav";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card, SectionHeader } from "@/components/ui/Card";
import { fmtEuro } from "@/lib/calculs";
import { besoinsMatieres, fmtGrammes, fmtPortions } from "@/lib/plan";
import type { Canal, Composant, Fulfillment, Recette, RecetteComposant } from "@/lib/supabase/database.types";
import { avancerFulfillment } from "./actions";

/** Commande ouverte aplatie côté serveur (sérialisable). */
export type CommandeOuverte = {
  id: string;
  canal: Canal;
  fulfillment: Fulfillment;
  montant_total: number;
  couverts: number | null;
  due_at: string | null;
  client_nom: string | null;
  /** "YYYY-MM-DD" et "HH:MM" en Europe/Paris, précalculés serveur. */
  due_jour: string;
  due_creneau: string;
  lignes: {
    libelle: string;
    qte: number | null;
    poids_g: number | null;
    composants: { nom: string; categorie: string }[];
    /** Fiche du produit (null = revendu tel quel — jamais dans le plan). */
    produit_recette_id: string | null;
    /** Bowl en composition libre (sans parent). */
    libre: boolean;
  }[];
};

const ETAPE_LABEL: Record<Fulfillment, string> = {
  a_produire: "À produire",
  en_prod: "En production",
  pret: "Prêt",
  remis: "Remis",
};
const ETAPE_TONE: Record<Fulfillment, "alerte" | "info" | "succes" | "neutre"> = {
  a_produire: "alerte",
  en_prod: "info",
  pret: "succes",
  remis: "neutre",
};
const ACTION_LABEL: Partial<Record<Fulfillment, string>> = {
  a_produire: "Lancer en prod",
  en_prod: "Marquer prêt",
  pret: "Remettre",
};

export function OrdersQueue({
  commandes,
  recettes,
  lignesRecettes,
  composants,
}: {
  commandes: CommandeOuverte[];
  recettes: Recette[];
  lignesRecettes: RecetteComposant[];
  composants: Composant[];
}) {
  const router = useRouter();
  const jours = useMemo(() => [...new Set(commandes.map((c) => c.due_jour))].sort(), [commandes]);
  const [jourActif, setJourActif] = useState<string>(jours[0] ?? "");
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const jourCourant = jours.includes(jourActif) ? jourActif : jours[0] ?? "";
  const duJour = commandes.filter((c) => c.due_jour === jourCourant);

  // Groupes par créneau (heure de due_at), triés.
  const creneaux = useMemo(() => {
    const map = new Map<string, CommandeOuverte[]>();
    for (const c of duJour) {
      const arr = map.get(c.due_creneau) ?? [];
      arr.push(c);
      map.set(c.due_creneau, arr);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [duJour]);

  // CHARGE PAR PRODUIT FABRIQUÉ (correctif métier 12/07/2026) : les revendus
  // sont exclus, les bowls libres agrégés à part. Les matières premières sont
  // un bloc DÉRIVÉ (plan × fiches, lib/plan.ts — même donnée que le dépliage).
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

  const charge = useMemo(() => {
    const parProduit = new Map<string, { nom: string; recette_id: string; portions: number }>();
    let libresPortions = 0;
    const libresComposants = new Map<string, { nom: string; categorie: string; portions: number }>();
    for (const c of duJour) {
      for (const l of c.lignes) {
        if (l.produit_recette_id == null) continue; // revendu tel quel
        if (l.libre) {
          libresPortions += l.qte ?? 1;
          for (const comp of l.composants) {
            const cur = libresComposants.get(comp.nom) ?? { ...comp, portions: 0 };
            cur.portions += l.qte ?? 1;
            libresComposants.set(comp.nom, cur);
          }
          continue;
        }
        const cur = parProduit.get(l.libelle) ?? { nom: l.libelle, recette_id: l.produit_recette_id, portions: 0 };
        cur.portions += l.qte ?? 1;
        parProduit.set(l.libelle, cur);
      }
    }
    return {
      produits: [...parProduit.values()].sort((a, b) => b.portions - a.portions),
      libresPortions,
      libresComposants: [...libresComposants.values()].sort((a, b) => b.portions - a.portions),
    };
  }, [duJour]);
  const maxPortions = Math.max(1, ...charge.produits.map((p) => p.portions));

  const besoins = useMemo(
    () => besoinsMatieres(charge.produits, recetteParId, lignesParRecette, compParId),
    [charge.produits, recetteParId, lignesParRecette, compParId]
  );
  const maxBesoin = Math.max(1, ...besoins.map((b) => b.grammes));

  function avancer(id: string) {
    setError(undefined);
    startTransition(async () => {
      const res = await avancerFulfillment(id);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <>
      {/* Onglets jour */}
      <div className="flex gap-2 flex-wrap" style={{ marginBottom: 16 }}>
        {jours.map((j) => (
          <button
            key={j}
            onClick={() => setJourActif(j)}
            className="font-mono"
            style={{
              padding: "7px 13px",
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 600,
              border: jourCourant === j ? "1px solid transparent" : "1px solid #dfd4bf",
              background: jourCourant === j ? "#0e3947" : "#fbf8f1",
              color: jourCourant === j ? "#f6f1e7" : "#6b7469",
            }}
          >
            {libelleJour(j)}
            <span style={{ marginLeft: 6, opacity: 0.7 }}>{commandes.filter((c) => c.due_jour === j).length}</span>
          </button>
        ))}
      </div>

      {error && (
        <p style={{ fontSize: 12.5, color: "#c0442e", background: "rgba(192,68,46,.1)", borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>
          {error}
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16, alignItems: "start" }} className="fz-users-grid">
        {/* File par créneau */}
        <div className="flex flex-col gap-4">
          {creneaux.map(([creneau, cmds]) => (
            <Card key={creneau} style={{ overflow: "hidden" }}>
              <SectionHeader
                titre={`Créneau ${creneau}`}
                sous={libelleJour(jourCourant)}
                compteur={`${cmds.length} commande${cmds.length > 1 ? "s" : ""}`}
              />
              <div>
                {cmds.map((c) => {
                  const depliee = ouverte === c.id;
                  const portions = c.lignes.reduce((acc, l) => acc + (l.qte ?? 1), 0);
                  return (
                    <div key={c.id} style={{ borderBottom: "1px solid #efe7d6" }}>
                      <button
                        onClick={() => setOuverte(depliee ? null : c.id)}
                        className="flex items-center gap-3"
                        style={{ width: "100%", padding: "12px 16px", textAlign: "left" }}
                      >
                        <span
                          className="grid place-items-center font-mono"
                          style={{ width: 52, height: 40, borderRadius: 9, background: "#0e3947", color: "#8fcfe2", fontSize: 12, fontWeight: 600, flexShrink: 0 }}
                        >
                          {c.due_creneau}
                        </span>
                        {depliee ? <ChevronDown size={15} style={{ color: "#9a927f" }} /> : <ChevronRight size={15} style={{ color: "#9a927f" }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#0e3947" }}>
                              {c.client_nom ?? "Sans client"}
                            </span>
                            <span
                              className="flex items-center gap-1 font-mono"
                              style={{ fontSize: 10, color: CANAL_COLOR[c.canal], background: `${CANAL_COLOR[c.canal]}18`, borderRadius: 100, padding: "2px 8px" }}
                            >
                              <Dot color={CANAL_COLOR[c.canal]} size={6} />
                              {CANAL_LABEL[c.canal]}
                            </span>
                          </div>
                          <p className="font-mono" style={{ fontSize: 10.5, color: "#a79b84", marginTop: 2 }}>
                            {c.lignes.length} ligne{c.lignes.length > 1 ? "s" : ""} · {portions} portion{portions > 1 ? "s" : ""}
                            {c.couverts ? ` · ${c.couverts} couverts` : ""} · {fmtEuro(c.montant_total)} €
                          </p>
                        </div>
                        <Badge tone={ETAPE_TONE[c.fulfillment]}>{ETAPE_LABEL[c.fulfillment]}</Badge>
                      </button>
                      {depliee && (
                        <div style={{ padding: "0 16px 14px 16px" }}>
                          <div style={{ background: "#f1ead9", borderRadius: 10, padding: "10px 12px" }}>
                            <p className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: ".08em", color: "#8a7f6a", marginBottom: 6 }}>
                              À produire (produits) — chips = composition
                            </p>
                            {c.lignes.map((l, i) => (
                              <div key={i} className="flex items-center gap-2 flex-wrap" style={{ padding: "4px 0" }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#0e3947" }}>
                                  {l.qte != null ? `${l.qte} × ` : ""}{l.libelle}
                                  {l.poids_g != null ? ` (${l.poids_g} g)` : ""}
                                </span>
                                {l.composants.map((comp, k) => (
                                  <span key={k} className="flex items-center gap-1 font-mono" style={{ fontSize: 10.5, color: "#6b7469", background: "#fbf8f1", border: "1px solid #e4dac6", borderRadius: 100, padding: "2px 8px" }}>
                                    <Dot color={CATEGORIE_COLOR[comp.categorie] ?? "#9a927f"} size={6} />
                                    {comp.nom}
                                  </span>
                                ))}
                              </div>
                            ))}
                          </div>
                          {ACTION_LABEL[c.fulfillment] && (
                            <button
                              onClick={() => avancer(c.id)}
                              disabled={pending}
                              className="font-display transition-opacity hover:opacity-90"
                              style={{ marginTop: 10, padding: "9px 16px", borderRadius: 10, background: "#1493be", color: "#f6f1e7", fontWeight: 700, fontSize: 13.5, opacity: pending ? 0.5 : 1 }}
                            >
                              {pending ? "…" : `${ACTION_LABEL[c.fulfillment]} →`}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>

        {/* Charge à produire (jour affiché) — PAR PRODUIT FABRIQUÉ */}
        <div className="flex flex-col gap-4">
          <Card style={{ padding: 16 }}>
            <p className="font-display" style={{ fontSize: 16, fontWeight: 700, color: "#0e3947", marginBottom: 2 }}>
              Charge à produire
            </p>
            <p className="font-mono" style={{ fontSize: 10.5, color: "#a79b84", marginBottom: 12 }}>
              par produit fabriqué · {libelleJour(jourCourant)} · revendus exclus
            </p>
            {charge.produits.length === 0 && charge.libresPortions === 0 ? (
              <p style={{ fontSize: 12.5, color: "#6b7469" }}>
                Rien à produire ce jour — les lignes de ces commandes sont des produits revendus tels quels.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {charge.produits.map((p) => (
                  <div key={p.nom}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 3 }}>
                      <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: "#0e3947" }}>{p.nom}</span>
                      <span className="font-display" style={{ fontSize: 14, fontWeight: 800, color: "#1493be" }}>
                        ×{fmtPortions(p.portions)}
                      </span>
                    </div>
                    <div style={{ height: 7, borderRadius: 100, background: "#e4dac6" }}>
                      <div style={{ width: `${(p.portions / maxPortions) * 100}%`, height: "100%", borderRadius: 100, background: "#1493be" }} />
                    </div>
                  </div>
                ))}
                {charge.libresPortions > 0 && (
                  <p className="font-mono" style={{ fontSize: 10.5, color: "#8a7f6a", marginTop: 4 }}>
                    + {charge.libresPortions} bowl{charge.libresPortions > 1 ? "s" : ""} libre{charge.libresPortions > 1 ? "s" : ""} — composition variable (voir besoins).
                  </p>
                )}
              </div>
            )}
          </Card>

          <Card style={{ padding: 16 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 2 }}>
              <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "#0e3947" }}>
                Besoins matières premières
              </p>
              <Badge tone="calcule">Dérivé</Badge>
            </div>
            <p className="font-mono" style={{ fontSize: 10, color: "#a79b84", marginBottom: 10 }}>
              dérivés des commandes (plan × fiches) — ce n&apos;est pas la production
            </p>
            {besoins.length === 0 && charge.libresComposants.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "#6b7469" }}>Aucun besoin dérivable ce jour.</p>
            ) : (
              <>
                {besoins.map((b) => (
                  <div key={b.composant.id} style={{ padding: "4px 0" }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 2 }}>
                      <Dot color={CATEGORIE_COLOR[b.composant.categorie]} size={7} />
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#0e3947" }}>{b.composant.nom}</span>
                      <span className="font-mono" style={{ fontSize: 10, color: "#a79b84" }}>{CATEGORIE_LABEL[b.composant.categorie]}</span>
                      <span className="font-mono" style={{ fontSize: 11.5, fontWeight: 600, color: "#0e3947" }}>{fmtGrammes(b.grammes)}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 100, background: "#e4dac6" }}>
                      <div style={{ width: `${(b.grammes / maxBesoin) * 100}%`, height: "100%", borderRadius: 100, background: CATEGORIE_COLOR[b.composant.categorie] }} />
                    </div>
                  </div>
                ))}
                {charge.libresComposants.length > 0 && (
                  <div style={{ marginTop: 10, background: "#f1ead9", borderRadius: 10, padding: "8px 10px" }}>
                    <p className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: ".08em", color: "#8a7f6a", marginBottom: 4 }}>
                      Bowls libres — composants réels (portions)
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      {charge.libresComposants.map((comp) => (
                        <span key={comp.nom} className="flex items-center gap-1 font-mono" style={{ fontSize: 10, color: "#6b7469", background: "#fbf8f1", border: "1px solid #e4dac6", borderRadius: 100, padding: "2px 7px" }}>
                          <Dot color={CATEGORIE_COLOR[comp.categorie] ?? "#9a927f"} size={5} />
                          {comp.nom} · {comp.portions}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function libelleJour(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const auj = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date());
  const demain = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date(Date.now() + 86400000));
  if (iso === auj) return "Aujourd'hui";
  if (iso === demain) return "Demain";
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Paris" }).format(date);
}
