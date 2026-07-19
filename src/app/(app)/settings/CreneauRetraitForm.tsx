"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { CreneauRetrait } from "@/lib/supabase/database.types";
import { saveCreneauRetrait } from "./actions";

/**
 * Config des créneaux click & collect (0024) — LUE par le site pour générer les
 * créneaux de retrait (horaires d'ouverture INTERSECTES [maintenant+délai, horizon],
 * par pas). Plage vide = horaires d'ouverture complets.
 */
export function CreneauRetraitForm({ creneau }: { creneau: CreneauRetrait | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | undefined>();
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  const hm = (t: string | null) => (t ? t.slice(0, 5) : "");

  function enregistrer(formData: FormData) {
    setError(undefined);
    setOk(false);
    startTransition(async () => {
      const res = await saveCreneauRetrait(undefined, formData);
      if (res?.error) setError(res.error);
      else {
        setOk(true);
        router.refresh();
      }
    });
  }

  const champ = { background: "#fff", border: "1px solid #dfd4bf", borderRadius: 8, padding: "6px 8px", fontSize: 12.5, color: "#0e3947", width: 90 } as const;

  return (
    <Card style={{ padding: 16, maxWidth: 540 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "#0e3947" }}>Créneaux click &amp; collect</p>
        <Badge tone="info">Affichés sur le site</Badge>
      </div>
      <p style={{ fontSize: 12, color: "#9a927f", marginBottom: 12 }}>
        Le site propose les créneaux de retrait boutique : horaires d&apos;ouverture, à partir de maintenant + le délai, jusqu&apos;à l&apos;horizon, par pas.
      </p>
      {creneau == null ? (
        <p style={{ fontSize: 12.5, color: "#c0442e" }}>Aucune configuration active en base.</p>
      ) : (
        <form action={enregistrer} className="flex flex-col gap-3">
          <label className="flex items-center justify-between gap-2">
            <span style={{ fontSize: 12.5, color: "#6b7469" }}>Délai minimum (minutes)</span>
            <input name="delai_min_minutes" type="number" min={1} defaultValue={creneau.delai_min_minutes} className="outline-none font-mono" style={champ} />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span style={{ fontSize: 12.5, color: "#6b7469" }}>Pas entre créneaux (minutes)</span>
            <input name="pas_minutes" type="number" min={1} defaultValue={creneau.pas_minutes} className="outline-none font-mono" style={champ} />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span style={{ fontSize: 12.5, color: "#6b7469" }}>Horizon de réservation (jours)</span>
            <input name="horizon_jours" type="number" min={1} defaultValue={creneau.horizon_jours} className="outline-none font-mono" style={champ} />
          </label>
          <div className="flex items-center justify-between gap-2" style={{ borderTop: "1px solid #efe7d6", paddingTop: 10 }}>
            <span style={{ fontSize: 12.5, color: "#6b7469" }}>Plage de retrait (optionnelle)</span>
            <span className="flex items-center gap-1.5">
              <input name="plage_debut" type="time" defaultValue={hm(creneau.plage_debut)} className="outline-none font-mono" style={{ ...champ, width: 100 }} />
              <span style={{ fontSize: 11, color: "#9a927f" }}>à</span>
              <input name="plage_fin" type="time" defaultValue={hm(creneau.plage_fin)} className="outline-none font-mono" style={{ ...champ, width: 100 }} />
            </span>
          </div>
          <p style={{ fontSize: 11.5, color: "#9a927f" }}>Vide = créneaux sur toute l&apos;amplitude d&apos;ouverture de la boutique.</p>
          {error && <p style={{ fontSize: 12, color: "#c0442e" }}>{error}</p>}
          {ok && !error && <p style={{ fontSize: 12, color: "#1f7a50" }}>Enregistré — le site applique sous 5 minutes.</p>}
          <button
            type="submit"
            disabled={pending}
            style={{ alignSelf: "flex-end", padding: "8px 14px", borderRadius: 9, background: "#0e3947", color: "#f6f1e7", fontSize: 12.5, fontWeight: 600, opacity: pending ? 0.5 : 1 }}
          >
            {pending ? "…" : "Enregistrer"}
          </button>
        </form>
      )}
    </Card>
  );
}
