"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { CANAL_LABEL } from "@/lib/nav";
import { Badge } from "@/components/ui/Badge";
import { fmtEuro } from "@/lib/calculs";
import type { Canal } from "@/lib/supabase/database.types";
import {
  detacherVenteClient,
  listerVentesAnonymes,
  listerVentesClient,
  rattacherVenteClient,
  type VenteRattachable,
} from "./actions";

const PERIODES = [
  { id: 7, label: "7 jours" },
  { id: 30, label: "30 jours" },
  { id: null, label: "Tout" },
] as const;

const CANAUX_PICKER = ["all", "truck", "boutique", "traiteur"] as const;

/**
 * Section « Ventes » de la fiche client : historique des ventes remises du client
 * + rattachement de ventes ANONYMES (documentaire, 0044 : jamais de crédit fidélité).
 * Lectures lazy par server actions (le pool anonyme de l'import caisse peut être gros,
 * la page /clients reste légère). Le détachement n'existe que sur les ventes marquées.
 */
export function VentesClient({ clientId, totalRemises }: { clientId: string; totalRemises: number }) {
  const router = useRouter();
  const [ventes, setVentes] = useState<VenteRattachable[] | null>(null);
  const [pickerOuvert, setPickerOuvert] = useState(false);
  const [anonymes, setAnonymes] = useState<VenteRattachable[] | null>(null);
  const [jours, setJours] = useState<7 | 30 | null>(30);
  const [canal, setCanal] = useState<Canal | "all">("all");
  const [montant, setMontant] = useState("");
  const [montantDebounce, setMontantDebounce] = useState("");
  const [tick, setTick] = useState(0);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  // Les états « Chargement… » (listes à null) sont posés dans les HANDLERS, jamais
  // en setState synchrone d'effet (règle react-hooks/set-state-in-effect) ; les
  // effets ne font que la lecture asynchrone.
  useEffect(() => {
    const t = setTimeout(() => {
      if (montant !== montantDebounce) {
        setAnonymes(null);
        setMontantDebounce(montant);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [montant, montantDebounce]);

  useEffect(() => {
    let annule = false;
    listerVentesClient(clientId).then((res) => {
      if (annule) return;
      if (res.error) setError(res.error);
      else setVentes(res.ventes ?? []);
    });
    return () => {
      annule = true;
    };
  }, [clientId, tick]);

  useEffect(() => {
    if (!pickerOuvert) return;
    let annule = false;
    const n = montantDebounce.trim() ? Number(montantDebounce.replace(",", ".")) : null;
    listerVentesAnonymes({
      jours,
      canal,
      montant: n != null && Number.isFinite(n) && n > 0 ? n : null,
    }).then((res) => {
      if (annule) return;
      if (res.error) setError(res.error);
      else setAnonymes(res.ventes ?? []);
    });
    return () => {
      annule = true;
    };
  }, [pickerOuvert, jours, canal, montantDebounce, tick]);

  const apresMutation = useCallback(() => {
    setError(undefined);
    setVentes(null);
    setAnonymes(null);
    setTick((t) => t + 1);
    router.refresh(); // Les colonnes Cmd / CA remis de la liste se resynchronisent.
  }, [router]);

  function onRattacher(venteId: string) {
    startTransition(async () => {
      const res = await rattacherVenteClient(venteId, clientId);
      if (res?.error) setError(res.error);
      else apresMutation();
    });
  }

  function onDetacher(venteId: string) {
    startTransition(async () => {
      const res = await detacherVenteClient(venteId);
      if (res?.error) setError(res.error);
      else apresMutation();
    });
  }

  return (
    <div style={{ margin: "12px 20px 0", background: "#fbf8f1", border: "1px solid #e4dac6", borderRadius: 12, padding: 14 }}>
      <p className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: ".1em", color: "#b0704c", marginBottom: 8 }}>
        Ventes
      </p>

      {ventes === null ? (
        <p style={{ fontSize: 12.5, color: "#6b7469" }}>Chargement…</p>
      ) : ventes.length === 0 ? (
        <p style={{ fontSize: 12.5, color: "#6b7469" }}>Aucune vente remise pour ce client.</p>
      ) : (
        <>
          {ventes.map((v) => (
            <div key={v.id} className="flex items-center gap-2 flex-wrap" style={{ padding: "5px 0", borderBottom: "1px solid #efe7d6" }}>
              <span className="font-mono" style={{ fontSize: 11.5, color: "#6b7469" }}>{fmtDateHeure(v.occurred_at)}</span>
              <span style={{ fontSize: 12, color: "#6b7469" }}>{CANAL_LABEL[v.canal]}</span>
              {v.source_vente === "import" && <Badge tone="demo">Import</Badge>}
              <span className="font-mono" style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 600, color: "#0e3947" }}>
                {fmtEuro(v.montant_total)} €
              </span>
              {v.client_rattache_le && (
                <>
                  <span
                    title={`Rattachée le ${fmtDateHeure(v.client_rattache_le)} · documentaire, hors fidélité`}
                    className="font-mono"
                    style={{ fontSize: 9.5, fontWeight: 700, color: "#1493be", background: "rgba(20,147,190,.1)", border: "1px solid rgba(20,147,190,.3)", borderRadius: 100, padding: "1px 7px" }}
                  >
                    Rattachée
                  </span>
                  <button
                    type="button"
                    onClick={() => onDetacher(v.id)}
                    disabled={pending}
                    style={{ fontSize: 12, fontWeight: 600, color: "#c0442e", opacity: pending ? 0.5 : 1 }}
                  >
                    Détacher
                  </button>
                </>
              )}
            </div>
          ))}
          {totalRemises > 30 && (
            <p className="font-mono" style={{ fontSize: 10.5, color: "#9a927f", marginTop: 5 }}>
              30 dernières ventes sur {totalRemises}.
            </p>
          )}
        </>
      )}

      {!pickerOuvert ? (
        <button
          type="button"
          onClick={() => {
            setAnonymes(null);
            setPickerOuvert(true);
          }}
          className="flex items-center gap-1.5"
          style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: "#1493be" }}
        >
          <Plus size={14} strokeWidth={2.4} />
          Rattacher une vente
        </button>
      ) : (
        <div className="flex flex-col gap-2" style={{ background: "#f1ead9", borderRadius: 10, padding: 12, marginTop: 10 }}>
          <div className="flex gap-1.5 flex-wrap">
            {PERIODES.map((p) => (
              <button
                type="button"
                key={p.label}
                onClick={() => {
                  setAnonymes(null);
                  setJours(p.id);
                }}
                style={{
                  padding: "5px 10px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                  border: jours === p.id ? "1px solid transparent" : "1px solid #dfd4bf",
                  background: jours === p.id ? "#0e3947" : "#fbf8f1",
                  color: jours === p.id ? "#f6f1e7" : "#6b7469",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {CANAUX_PICKER.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => {
                  setAnonymes(null);
                  setCanal(c);
                }}
                style={{
                  padding: "5px 10px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                  border: canal === c ? "1px solid transparent" : "1px solid #dfd4bf",
                  background: canal === c ? "#0e3947" : "#fbf8f1",
                  color: canal === c ? "#f6f1e7" : "#6b7469",
                }}
              >
                {c === "all" ? "Tous" : CANAL_LABEL[c]}
              </button>
            ))}
          </div>
          <input
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            placeholder="Montant exact (€), ex : 8,50"
            inputMode="decimal"
            className="outline-none"
            style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: "#0e3947" }}
          />

          {anonymes === null ? (
            <p style={{ fontSize: 12.5, color: "#6b7469" }}>Chargement…</p>
          ) : anonymes.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "#6b7469" }}>Aucune vente anonyme sur ces critères.</p>
          ) : (
            <div className="fz-scroll flex flex-col" style={{ maxHeight: 260, overflowY: "auto" }}>
              {anonymes.map((v) => (
                <div key={v.id} className="flex items-center gap-2 flex-wrap" style={{ padding: "5px 0", borderBottom: "1px solid #e4dac6" }}>
                  <span className="font-mono" style={{ fontSize: 11.5, color: "#6b7469" }}>{fmtDateHeure(v.occurred_at)}</span>
                  <span style={{ fontSize: 12, color: "#6b7469" }}>{CANAL_LABEL[v.canal]}</span>
                  {v.source_vente === "import" && <Badge tone="demo">Import</Badge>}
                  <span className="font-mono" style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 600, color: "#0e3947" }}>
                    {fmtEuro(v.montant_total)} €
                  </span>
                  <button
                    type="button"
                    onClick={() => onRattacher(v.id)}
                    disabled={pending}
                    style={{ padding: "4px 11px", borderRadius: 100, background: "#1493be", color: "#f6f1e7", fontSize: 12, fontWeight: 600, opacity: pending ? 0.5 : 1 }}
                  >
                    Rattacher
                  </button>
                </div>
              ))}
              {anonymes.length === 50 && (
                <p className="font-mono" style={{ fontSize: 10.5, color: "#9a927f", marginTop: 5 }}>
                  50 ventes affichées au maximum : affinez les filtres.
                </p>
              )}
            </div>
          )}

          <p style={{ fontSize: 11, color: "#9a927f" }}>
            Ventes remises sans client. Le rattachement est documentaire : il ne crédite pas la fidélité.
          </p>
          <button
            type="button"
            onClick={() => setPickerOuvert(false)}
            style={{ alignSelf: "flex-start", fontSize: 12, fontWeight: 600, color: "#6b7469" }}
          >
            Fermer
          </button>
        </div>
      )}

      {error && (
        <p style={{ fontSize: 12.5, color: "#c0442e", background: "rgba(192,68,46,.1)", borderRadius: 8, padding: "8px 10px", marginTop: 8 }}>
          {error}
        </p>
      )}
    </div>
  );
}

function fmtDateHeure(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}
