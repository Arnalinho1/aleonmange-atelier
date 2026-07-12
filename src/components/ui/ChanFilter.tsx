"use client";

import { useState } from "react";
import { CANAL_COLOR, CANAL_LABEL } from "@/lib/nav";
import type { Canal, Emplacement } from "@/lib/supabase/database.types";

export interface ChanFilterValue {
  canal: Canal | "all";
  emplacementId: string | "all";
}

/**
 * Barre de filtre canal (+ emplacement truck) partagée sur 6 écrans
 * (Production, Historique, Productivité, Insight, Ventes & tendances, Réseaux).
 * Sélectionner un canal ≠ truck réinitialise l'emplacement. Le parent recalcule
 * ses KPI/tableaux via `onChange`.
 */
export function ChanFilter({
  emplacements,
  value,
  onChange,
  note,
}: {
  emplacements: Emplacement[];
  value?: ChanFilterValue;
  onChange?: (v: ChanFilterValue) => void;
  note?: string;
}) {
  const [internal, setInternal] = useState<ChanFilterValue>({ canal: "all", emplacementId: "all" });
  const v = value ?? internal;

  function update(next: ChanFilterValue) {
    if (next.canal !== "truck") next.emplacementId = "all";
    setInternal(next);
    onChange?.(next);
  }

  const canaux: (Canal | "all")[] = ["all", "truck", "boutique", "traiteur"];

  const pill = (active: boolean, accent?: string) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 13px",
    borderRadius: 100,
    fontFamily: "var(--font-hanken)",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    border: active ? "1px solid transparent" : "1px solid #dfd4bf",
    background: active ? accent ?? "#0e3947" : "#fbf8f1",
    color: active ? "#f6f1e7" : "#6b7469",
    transition: "all .15s",
  } as const);

  return (
    <div
      className="flex flex-wrap items-center"
      style={{ gap: 9, marginBottom: 16, padding: "11px 14px", background: "#f6f1e7", border: "1px solid #e1d7c3", borderRadius: 14 }}
    >
      <span className="font-mono uppercase" style={{ fontSize: 10.5, letterSpacing: ".12em", color: "#b07a2e", marginRight: 2 }}>
        Canal
      </span>
      {canaux.map((c) => (
        <button key={c} onClick={() => update({ ...v, canal: c })} style={pill(v.canal === c)}>
          {c !== "all" && (
            <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: CANAL_COLOR[c] }} />
          )}
          {c === "all" ? "Tous" : CANAL_LABEL[c]}
        </button>
      ))}

      {v.canal === "truck" && (
        <>
          <span style={{ width: 1, height: 22, background: "#e1d7c3", margin: "0 3px" }} />
          <span className="font-mono uppercase" style={{ fontSize: 10.5, letterSpacing: ".12em", color: "#b07a2e", marginRight: 2 }}>
            Emplacement
          </span>
          <button onClick={() => update({ ...v, emplacementId: "all" })} style={pill(v.emplacementId === "all", "#b07a2e")}>
            Tous emplacements
          </button>
          {emplacements.map((e) => (
            <button key={e.id} onClick={() => update({ ...v, emplacementId: e.id })} style={pill(v.emplacementId === e.id, "#b07a2e")}>
              {e.libelle}
            </button>
          ))}
        </>
      )}

      {note && (
        <span className="font-mono" style={{ marginLeft: "auto", fontSize: 11.5, color: "#9a927f" }}>
          {note}
        </span>
      )}
    </div>
  );
}
