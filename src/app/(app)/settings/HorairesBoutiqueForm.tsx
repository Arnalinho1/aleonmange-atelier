"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { JOUR_SEMAINE_LABEL } from "@/lib/nav";
import type { HoraireBoutique } from "@/lib/supabase/database.types";
import { saveHorairesBoutique } from "./actions";

/**
 * Horaires boutique (0023) — LUS par le site public (pages Boutique, Contact,
 * pied de page). 7 jours, 2 plages nullables : plages vides = fermé. La base
 * garantit la cohérence (paires, fin > début, après-midi après le matin) ;
 * la validation serveur redit la même chose en français.
 */
export function HorairesBoutiqueForm({ horaires }: { horaires: HoraireBoutique[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | undefined>();
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  const parJour = new Map(horaires.map((h) => [h.jour, h]));
  // La semaine s'affiche du mardi au lundi (ordre d'ouverture de la boutique).
  const ORDRE_AFFICHAGE = [2, 3, 4, 5, 6, 7, 1];

  function enregistrer(formData: FormData) {
    setError(undefined);
    setOk(false);
    startTransition(async () => {
      const res = await saveHorairesBoutique(undefined, formData);
      if (res?.error) setError(res.error);
      else {
        setOk(true);
        router.refresh();
      }
    });
  }

  // input type="time" attend HH:MM — la base renvoie HH:MM:SS.
  const hm = (t: string | null): string => (t ? t.slice(0, 5) : "");

  return (
    <Card style={{ padding: 16, maxWidth: 560 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "#0e3947" }}>Horaires boutique</p>
        <Badge tone="info">Affichés sur le site</Badge>
      </div>
      <p style={{ fontSize: 12, color: "#9a927f", marginBottom: 12 }}>
        Lus par le site public (Boutique, Contact, pied de page). Deux plages par jour —
        laissez les deux champs d&apos;une plage vides pour la retirer, les quatre vides = fermé.
      </p>
      <form action={enregistrer} className="flex flex-col gap-2.5">
        {ORDRE_AFFICHAGE.map((jour) => {
          const h = parJour.get(jour);
          const ferme = !h?.plage1_debut && !h?.plage2_debut;
          return (
            <div key={jour} className="flex flex-wrap items-center gap-x-3 gap-y-1.5" style={{ borderBottom: "1px solid #f1ead9", paddingBottom: 8 }}>
              <span style={{ width: 76, fontSize: 12.5, fontWeight: 600, color: "#0e3947" }}>
                {JOUR_SEMAINE_LABEL[jour]}
              </span>
              <PlageInputs jour={jour} plage={1} debut={hm(h?.plage1_debut ?? null)} fin={hm(h?.plage1_fin ?? null)} />
              <PlageInputs jour={jour} plage={2} debut={hm(h?.plage2_debut ?? null)} fin={hm(h?.plage2_fin ?? null)} />
              {ferme && <Badge tone="neutre">Fermé</Badge>}
            </div>
          );
        })}
        {error && <p style={{ fontSize: 12, color: "#c0442e" }}>{error}</p>}
        {ok && !error && <p style={{ fontSize: 12, color: "#1f7a50" }}>Horaires enregistrés — le site les affiche sous 5 minutes.</p>}
        <button
          type="submit"
          disabled={pending}
          style={{ alignSelf: "flex-end", padding: "8px 14px", borderRadius: 9, background: "#0e3947", color: "#f6f1e7", fontSize: 12.5, fontWeight: 600, opacity: pending ? 0.5 : 1 }}
        >
          {pending ? "…" : "Enregistrer les horaires"}
        </button>
      </form>
    </Card>
  );
}

function PlageInputs({ jour, plage, debut, fin }: { jour: number; plage: 1 | 2; debut: string; fin: string }) {
  const champ = { width: 86, background: "#fff", border: "1px solid #dfd4bf", borderRadius: 8, padding: "5px 6px", fontSize: 12.5, color: "#0e3947" } as const;
  return (
    <span className="flex items-center gap-1">
      <input type="time" name={`plage${plage}_debut_${jour}`} defaultValue={debut} className="outline-none font-mono" style={champ} />
      <span style={{ fontSize: 11, color: "#9a927f" }}>à</span>
      <input type="time" name={`plage${plage}_fin_${jour}`} defaultValue={fin} className="outline-none font-mono" style={champ} />
    </span>
  );
}
