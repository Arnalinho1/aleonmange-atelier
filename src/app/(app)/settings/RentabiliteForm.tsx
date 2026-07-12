"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { ParametreRentabilite } from "@/lib/supabase/database.types";
import { saveParametres } from "./actions";

/**
 * Paramètres de rentabilité — la SAISIE vit ici (Réglages configure) ;
 * Finances ne fait que LIRE ces valeurs pour sa marge nette (une source,
 * jamais dupliquée). Déplacé depuis Finances le 12/07/2026.
 */
export function RentabiliteForm({ parametres }: { parametres: ParametreRentabilite | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | undefined>();
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  function enregistrer(formData: FormData) {
    setError(undefined);
    setOk(false);
    startTransition(async () => {
      const res = await saveParametres(undefined, formData);
      if (res?.error) setError(res.error);
      else {
        setOk(true);
        router.refresh();
      }
    });
  }

  return (
    <Card style={{ padding: 16, maxWidth: 440 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "#0e3947" }}>Paramètres de rentabilité</p>
        <Badge tone="calcule">Marge nette</Badge>
      </div>
      <p style={{ fontSize: 12, color: "#9a927f", marginBottom: 12 }}>
        Charges PAR PORTION — lues par Finances pour la marge nette (brute matière − MO − transport).
      </p>
      <form action={enregistrer} className="flex flex-col gap-3">
        <label className="flex items-center gap-2 justify-between">
          <span style={{ fontSize: 12.5, color: "#6b7469" }}>Main-d&apos;œuvre / portion</span>
          <span className="flex items-center gap-1">
            <input
              name="mo_par_portion"
              defaultValue={parametres?.mo_par_portion != null ? String(parametres.mo_par_portion).replace(".", ",") : ""}
              placeholder="0,00"
              inputMode="decimal"
              className="outline-none font-mono"
              style={{ width: 80, background: "#fff", border: "1px solid #dfd4bf", borderRadius: 8, padding: "6px 8px", fontSize: 12.5, textAlign: "right", color: "#0e3947" }}
            />
            <span className="font-mono" style={{ fontSize: 11, color: "#9a927f" }}>€</span>
          </span>
        </label>
        <label className="flex items-center gap-2 justify-between">
          <span style={{ fontSize: 12.5, color: "#6b7469" }}>Transport / portion</span>
          <span className="flex items-center gap-1">
            <input
              name="transport_par_portion"
              defaultValue={parametres?.transport_par_portion != null ? String(parametres.transport_par_portion).replace(".", ",") : ""}
              placeholder="0,00"
              inputMode="decimal"
              className="outline-none font-mono"
              style={{ width: 80, background: "#fff", border: "1px solid #dfd4bf", borderRadius: 8, padding: "6px 8px", fontSize: 12.5, textAlign: "right", color: "#0e3947" }}
            />
            <span className="font-mono" style={{ fontSize: 11, color: "#9a927f" }}>€</span>
          </span>
        </label>
        {error && <p style={{ fontSize: 12, color: "#c0442e" }}>{error}</p>}
        {ok && !error && <p style={{ fontSize: 12, color: "#1f7a50" }}>Paramètres enregistrés.</p>}
        <button
          type="submit"
          disabled={pending}
          style={{ alignSelf: "flex-end", padding: "8px 14px", borderRadius: 9, background: "#0e3947", color: "#f6f1e7", fontSize: 12.5, fontWeight: 600, opacity: pending ? 0.5 : 1 }}
        >
          {pending ? "…" : "Enregistrer"}
        </button>
      </form>
    </Card>
  );
}
