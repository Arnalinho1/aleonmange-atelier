"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3 } from "lucide-react";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { URGENCE_COLOR, URGENCE_LABEL, URGENCES } from "@/lib/insights";
import type { Insight } from "@/lib/supabase/database.types";
import { changerStatutInsight } from "./actions";

/**
 * Cartes CONSTAT + CHIFFRE + ACTION par bloc d'urgence (MOCKUP §3.13).
 * Le jeu arrive DÉJÀ trié par la source unique lib/insights.ts.
 */
export function InsightBoard({ insights }: { insights: Insight[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function changer(id: string, statut: "traite" | "reporte") {
    setError(undefined);
    startTransition(async () => {
      const res = await changerStatutInsight(id, statut);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <>
      {error && (
        <p style={{ fontSize: 12.5, color: "#c0442e", background: "rgba(192,68,46,.1)", borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>
          {error}
        </p>
      )}
      <div className="flex flex-col gap-5">
        {URGENCES.map((urgence) => {
          const bloc = insights.filter((i) => i.urgence === urgence);
          if (bloc.length === 0) return null;
          return (
            <div key={urgence}>
              <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
                <Dot color={URGENCE_COLOR[urgence]} />
                <h2 className="font-display" style={{ fontSize: 18, fontWeight: 800, color: "#0e3947" }}>
                  {URGENCE_LABEL[urgence]}
                </h2>
                <span className="font-mono" style={{ fontSize: 11, color: "#a79b84" }}>
                  {bloc.length} insight{bloc.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {bloc.map((i, rang) => (
                  <Card key={i.id} style={{ padding: 16, opacity: i.statut === "reporte" ? 0.65 : 1 }}>
                    <div className="flex items-start gap-4">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 6 }}>
                          {i.objectif && <Badge tone="info">{i.objectif}</Badge>}
                          <Badge tone={i.origine_calcul === "calcule" ? "calcule" : "demo"}>
                            {i.origine_calcul === "calcule" ? "Calculé" : "Démo"}
                          </Badge>
                          {i.statut === "reporte" && <Badge tone="neutre">Reporté</Badge>}
                        </div>
                        <p style={{ fontSize: 15.5, fontWeight: 700, color: "#0e3947", lineHeight: 1.35 }}>{i.constat}</p>
                        {i.chiffre && (
                          <span
                            className="font-mono"
                            style={{ display: "inline-block", marginTop: 7, fontSize: 12.5, fontWeight: 600, color: "#b00d1a", background: "rgba(216,16,32,.09)", borderRadius: 8, padding: "3px 9px" }}
                          >
                            {i.chiffre}
                          </span>
                        )}
                        {i.action && (
                          <p className="flex items-center gap-2" style={{ marginTop: 9, fontSize: 13.5, fontWeight: 600, color: "#1f7a50" }}>
                            <ArrowRight size={15} strokeWidth={2.4} />
                            {i.action}
                            {i.action_ecran && (
                              <Link href={`/${i.action_ecran}`} className="font-mono" style={{ fontSize: 11, color: "#1493be" }}>
                                ouvrir →
                              </Link>
                            )}
                          </p>
                        )}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p className="font-mono" style={{ fontSize: 10, color: "#a79b84" }}>#{rang + 1}</p>
                        {i.impact != null && (
                          <>
                            <p className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "#0e3947" }}>
                              {i.impact} €
                            </p>
                            <p className="font-mono" style={{ fontSize: 9.5, color: "#a79b84" }}>impact estimé</p>
                          </>
                        )}
                        <div className="flex gap-2 justify-end" style={{ marginTop: 10 }}>
                          {i.statut !== "reporte" && (
                            <button
                              onClick={() => changer(i.id, "reporte")}
                              disabled={pending}
                              className="flex items-center gap-1"
                              style={{ fontSize: 12, fontWeight: 600, color: "#a9761e", opacity: pending ? 0.5 : 1 }}
                            >
                              <Clock3 size={13} /> Reporter
                            </button>
                          )}
                          <button
                            onClick={() => changer(i.id, "traite")}
                            disabled={pending}
                            className="flex items-center gap-1"
                            style={{ fontSize: 12, fontWeight: 600, color: "#1f7a50", opacity: pending ? 0.5 : 1 }}
                          >
                            <CheckCircle2 size={13} /> Marquer traité
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
