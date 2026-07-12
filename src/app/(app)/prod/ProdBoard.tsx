"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { CATEGORIE_COLOR, CATEGORIE_LABEL } from "@/lib/nav";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card, SectionHeader } from "@/components/ui/Card";
import { ChanFilter, type ChanFilterValue } from "@/components/ui/ChanFilter";
import type { Canal, Composant, Emplacement, Lot } from "@/lib/supabase/database.types";
import { enregistrerReception } from "../stock/actions";

/** Portion vendue dépliée par composant (7 derniers jours, côté serveur). */
export type PortionComposant = {
  composant_id: string;
  canal: Canal;
  emplacement_id: string | null;
  portions: number;
};

/**
 * Production — prévision INDICATIVE (moyenne 7 j × buffer +10 %, badge
 * « aide à la décision ») mise à l'échelle par le ChanFilter-prisme, plan du
 * jour (lots enregistrés vs suggéré) et enregistrement de lots réel
 * (lot + mouvement d'entrée en stock).
 */
export function ProdBoard({
  composants,
  portions,
  lotsDuJour,
  emplacements,
}: {
  composants: Composant[];
  portions: PortionComposant[];
  lotsDuJour: Lot[];
  emplacements: Emplacement[];
}) {
  const router = useRouter();
  const [filtre, setFiltre] = useState<ChanFilterValue>({ canal: "all", emplacementId: "all" });
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const compParId = useMemo(() => new Map(composants.map((c) => [c.id, c])), [composants]);

  // Prévision : portions vendues (7 j, prisme canal/emplacement) → moyenne/j → +10 %.
  const prevision = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of portions) {
      if (filtre.canal !== "all" && p.canal !== filtre.canal) continue;
      if (filtre.canal === "truck" && filtre.emplacementId !== "all" && p.emplacement_id !== filtre.emplacementId) continue;
      map.set(p.composant_id, (map.get(p.composant_id) ?? 0) + p.portions);
    }
    return [...map.entries()]
      .map(([id, total]) => {
        const moyenne = total / 7;
        return { composant: compParId.get(id), total, moyenne, suggere: Math.ceil((moyenne * 1.1) * 10) / 10 };
      })
      .filter((x) => x.composant)
      .sort((a, b) => b.total - a.total);
  }, [portions, filtre, compParId]);

  const lotsParComposant = useMemo(() => {
    const map = new Map<string, number>();
    for (const lot of lotsDuJour) map.set(lot.composant_id, (map.get(lot.composant_id) ?? 0) + Number(lot.quantite ?? 0));
    return map;
  }, [lotsDuJour]);

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

      {/* Prévision — demain (carte foncée) */}
      <div style={{ background: "#0e3947", borderRadius: 16, padding: 18, marginBottom: 16 }}>
        <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 4 }}>
          <p className="font-display" style={{ fontSize: 16, fontWeight: 700, color: "#f6f1e7" }}>Prévision — demain</p>
          <Badge tone="demo">Aide à la décision</Badge>
        </div>
        <p className="font-mono" style={{ fontSize: 10.5, color: "#8fcfe2", marginBottom: 14 }}>
          moyenne des 7 derniers jours (ventes remises dépliées par composant) + buffer 10 % — règle INDICATIVE, à valider
        </p>
        {prevision.length === 0 ? (
          <p style={{ fontSize: 13, color: "#bfdce7" }}>
            Pas encore d&apos;historique pour prévoir — saisissez le plan à la main via « Enregistrer un lot ».
          </p>
        ) : (
          <>
            <div
              className="font-mono uppercase"
              style={{ display: "grid", gridTemplateColumns: "1.5fr .8fr .8fr .7fr", gap: 8, fontSize: 9.5, letterSpacing: ".08em", color: "#5c8593", paddingBottom: 7, borderBottom: "1px solid rgba(255,255,255,.1)" }}
            >
              <span>Composant</span>
              <span style={{ textAlign: "right" }}>Vendu (7 j)</span>
              <span style={{ textAlign: "right" }}>Moyenne / j</span>
              <span style={{ textAlign: "right" }}>Suggéré</span>
            </div>
            {prevision.map((p) => (
              <div
                key={p.composant!.id}
                style={{ display: "grid", gridTemplateColumns: "1.5fr .8fr .8fr .7fr", gap: 8, padding: "8px 0", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,.08)" }}
              >
                <span className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 600, color: "#f6f1e7" }}>
                  <Dot color={CATEGORIE_COLOR[p.composant!.categorie]} size={7} />
                  {p.composant!.nom}
                  <span className="font-mono" style={{ fontSize: 9.5, color: "#5c8593" }}>{CATEGORIE_LABEL[p.composant!.categorie]}</span>
                </span>
                <span className="font-mono" style={{ fontSize: 12, color: "#bfdce7", textAlign: "right" }}>{p.total} portion{p.total > 1 ? "s" : ""}</span>
                <span className="font-mono" style={{ fontSize: 12, color: "#bfdce7", textAlign: "right" }}>{p.moyenne.toFixed(1).replace(".", ",")}</span>
                <span className="font-display" style={{ fontSize: 19, fontWeight: 800, color: "#8fcfe2", textAlign: "right" }}>{String(p.suggere).replace(".", ",")}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Plan du jour + lots */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16, alignItems: "start" }}>
        <Card style={{ overflow: "hidden" }}>
          <SectionHeader titre="Plan de production du jour" sous="Lots enregistrés vs prévision suggérée." />
          <div style={{ padding: 16 }}>
            {prevision.length === 0 && lotsDuJour.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "#6b7469" }}>Rien à suivre aujourd&apos;hui.</p>
            ) : (
              (prevision.length > 0 ? prevision : [...lotsParComposant.keys()].map((id) => ({ composant: compParId.get(id), suggere: 0, total: 0, moyenne: 0 })))
                .filter((p) => p.composant)
                .map((p) => {
                  const fait = lotsParComposant.get(p.composant!.id) ?? 0;
                  const cible = Math.max(p.suggere, fait);
                  return (
                    <div key={p.composant!.id} style={{ padding: "6px 0" }}>
                      <div className="flex items-center gap-2" style={{ marginBottom: 3 }}>
                        <Dot color={CATEGORIE_COLOR[p.composant!.categorie]} size={7} />
                        <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: "#0e3947" }}>{p.composant!.nom}</span>
                        <span className="font-mono" style={{ fontSize: 11.5, color: "#6b7469" }}>
                          {String(fait).replace(".", ",")} / {p.suggere > 0 ? String(p.suggere).replace(".", ",") : "—"}
                        </span>
                      </div>
                      <div style={{ height: 7, borderRadius: 100, background: "#e4dac6" }}>
                        <div style={{ width: `${cible > 0 ? Math.min(100, (fait / cible) * 100) : 0}%`, height: "100%", borderRadius: 100, background: CATEGORIE_COLOR[p.composant!.categorie] }} />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </Card>

        <Card style={{ overflow: "hidden" }}>
          <SectionHeader titre="Lots enregistrés aujourd'hui" compteur={`${lotsDuJour.length} lot${lotsDuJour.length > 1 ? "s" : ""}`} />
          <div style={{ padding: 16 }}>
            {lotsDuJour.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "#6b7469" }}>Aucun lot aujourd&apos;hui — « Enregistrer un lot » crée le lot et son entrée en stock.</p>
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
                      Qté {lot.quantite != null ? `${String(lot.quantite).replace(".", ",")} kg` : "—"}
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
                <Libelle>Composant produit</Libelle>
                <select name="composant_id" required className="outline-none" style={champ}>
                  <option value="">— choisir —</option>
                  {composants.map((c) => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <Libelle>Quantité produite (kg)</Libelle>
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
                Crée le lot ET son entrée en stock (mouvement « réception » de production).
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
