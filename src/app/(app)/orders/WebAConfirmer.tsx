"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Clock } from "lucide-react";
import { CANAL_COLOR, CANAL_LABEL } from "@/lib/nav";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card, SectionHeader } from "@/components/ui/Card";
import type { Canal } from "@/lib/supabase/database.types";
import { confirmerCommandeWeb, refuserCommandeWeb } from "./actions";

export type CommandeWeb = {
  id: string;
  canal: Canal;
  montant_total: number;
  due_label: string;
  client_nom: string | null;
  refuse_le: string | null;
  motif_refus: string | null;
  lignes: { libelle: string; qte: number | null; poids_g: number | null }[];
};

const MOTIFS: { code: string; label: string }[] = [
  { code: "rupture", label: "Rupture d'ingrédient" },
  { code: "capacite", label: "Capacité insuffisante" },
  { code: "fermeture", label: "Fermeture exceptionnelle" },
  { code: "autre", label: "Autre" },
];
const MOTIF_LABEL = new Map(MOTIFS.map((m) => [m.code, m.label]));

function fmtEuro(n: number): string {
  return n.toFixed(2).replace(".", ",") + " €";
}
function resumeLignes(lignes: CommandeWeb["lignes"]): string {
  return lignes.map((l) => `${l.libelle}${l.qte ? ` x${l.qte}` : l.poids_g ? ` ${l.poids_g} g` : ""}`).join(", ");
}

export function WebAConfirmer({ aConfirmer, refusees }: { aConfirmer: CommandeWeb[]; refusees: CommandeWeb[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | undefined>();
  const [refusEnCours, setRefusEnCours] = useState<string | null>(null); // id en cours de motivation
  const [motifCode, setMotifCode] = useState("rupture");
  const [motifDetail, setMotifDetail] = useState("");
  const [voirRefusees, setVoirRefusees] = useState(false);

  function confirmer(id: string) {
    setErreur(undefined);
    startTransition(async () => {
      const res = await confirmerCommandeWeb(id);
      if (res?.error) setErreur(res.error);
      else router.refresh();
    });
  }
  function refuser(id: string) {
    setErreur(undefined);
    startTransition(async () => {
      const res = await refuserCommandeWeb(id, motifCode, motifDetail.trim() || undefined);
      if (res?.error) setErreur(res.error);
      else {
        setRefusEnCours(null);
        setMotifDetail("");
        setMotifCode("rupture");
        router.refresh();
      }
    });
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <Card style={{ overflow: "hidden", border: "1.5px solid #e9a23b" }}>
        <SectionHeader
          titre="Commandes web à confirmer"
          sous="Passées sur le site — à valider ou refuser. Le client est prévenu par email dans les deux cas."
          compteur={`${aConfirmer.length} en attente`}
        />
        {aConfirmer.length === 0 ? (
          <p style={{ padding: "14px 16px", fontSize: 13, color: "#6b7469" }}>Aucune commande web en attente. Tout est traité.</p>
        ) : (
          aConfirmer.map((c, i) => (
            // Ancres data-g (1re commande en attente) : cibles du guide d'onboarding (B2).
            <div key={c.id} data-g={i === 0 ? "cmd-fondatrice" : undefined} style={{ padding: "13px 16px", borderBottom: "1px solid #efe7d6" }}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2" data-g={i === 0 ? "cmd-statut" : undefined}>
                  <Dot color={CANAL_COLOR[c.canal]} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#0e3947" }}>{CANAL_LABEL[c.canal]}</span>
                  <Badge tone="neutre">Paiement au retrait</Badge>
                </div>
                <span className="font-mono" style={{ fontSize: 13.5, fontWeight: 600, color: "#0e3947" }}>{fmtEuro(c.montant_total)}</span>
              </div>
              <p style={{ fontSize: 12.5, color: "#6b7469", marginTop: 4 }}>
                <Clock size={12} style={{ display: "inline", verticalAlign: "-1px", marginRight: 4 }} />
                Retrait : <strong>{c.due_label}</strong>
                {c.client_nom && <span> · {c.client_nom}</span>}
              </p>
              <p style={{ fontSize: 12.5, color: "#0e3947", marginTop: 4 }}>{resumeLignes(c.lignes)}</p>

              {refusEnCours === c.id ? (
                <div style={{ marginTop: 10, background: "#f6f1e7", borderRadius: 10, padding: 12 }}>
                  <div className="flex flex-col gap-2">
                    <select
                      value={motifCode}
                      onChange={(e) => setMotifCode(e.target.value)}
                      className="outline-none"
                      style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 8, padding: "7px 10px", fontSize: 13, color: "#0e3947" }}
                    >
                      {MOTIFS.map((m) => (
                        <option key={m.code} value={m.code}>{m.label}</option>
                      ))}
                    </select>
                    <input
                      value={motifDetail}
                      onChange={(e) => setMotifDetail(e.target.value)}
                      placeholder="Détail interne (optionnel, non envoyé au client)"
                      className="outline-none"
                      style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 8, padding: "7px 10px", fontSize: 13, color: "#0e3947" }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => refuser(c.id)}
                        disabled={pending}
                        style={{ padding: "7px 12px", borderRadius: 8, background: "#c0442e", color: "#fff", fontSize: 12.5, fontWeight: 600, opacity: pending ? 0.5 : 1 }}
                      >
                        Confirmer le refus
                      </button>
                      <button
                        onClick={() => setRefusEnCours(null)}
                        style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #dfd4bf", background: "#fbf8f1", fontSize: 12.5, fontWeight: 600, color: "#6b7469" }}
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2" style={{ marginTop: 10 }}>
                  <button
                    onClick={() => confirmer(c.id)}
                    disabled={pending}
                    data-g={i === 0 ? "cmd-confirmer" : undefined}
                    className="flex items-center gap-1.5"
                    style={{ padding: "8px 14px", borderRadius: 9, background: "#1f8a5b", color: "#fff", fontSize: 13, fontWeight: 600, opacity: pending ? 0.5 : 1 }}
                  >
                    <Check size={15} strokeWidth={2.4} /> Confirmer
                  </button>
                  <button
                    onClick={() => { setRefusEnCours(c.id); setErreur(undefined); }}
                    disabled={pending}
                    className="flex items-center gap-1.5"
                    style={{ padding: "8px 14px", borderRadius: 9, border: "1px solid #dfd4bf", background: "#fbf8f1", color: "#c0442e", fontSize: 13, fontWeight: 600 }}
                  >
                    <X size={15} strokeWidth={2.4} /> Refuser
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        {erreur && <p style={{ padding: "10px 16px", fontSize: 12.5, color: "#c0442e" }}>{erreur}</p>}
      </Card>

      {refusees.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setVoirRefusees((v) => !v)}
            style={{ fontSize: 12.5, fontWeight: 600, color: "#8a7f6a" }}
          >
            {voirRefusees ? "Masquer" : "Voir"} les commandes refusées récentes ({refusees.length})
          </button>
          {voirRefusees && (
            <Card style={{ overflow: "hidden", marginTop: 8 }}>
              {refusees.map((c) => (
                <div key={c.id} style={{ padding: "10px 16px", borderBottom: "1px solid #efe7d6", opacity: 0.75 }}>
                  <div className="flex items-center justify-between gap-3">
                    <span style={{ fontSize: 13, color: "#0e3947" }}>
                      {CANAL_LABEL[c.canal]} · {c.due_label}{c.client_nom ? ` · ${c.client_nom}` : ""}
                    </span>
                    <Badge tone="alerte">Refusée</Badge>
                  </div>
                  <p style={{ fontSize: 12, color: "#8a7f6a", marginTop: 3 }}>
                    Motif : {MOTIF_LABEL.get((c.motif_refus ?? "").split(" - ")[0]) ?? c.motif_refus ?? "—"}
                  </p>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
