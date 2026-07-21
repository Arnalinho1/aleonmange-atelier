"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { togglePanierFraisTeasing } from "./actions";

/** Agrégat des votes (comptage CONFIRMÉS uniquement par option + totaux). */
export type AgregatPanierFrais = {
  totalConfirmes: number;
  totalEnAttente: number;
  taille: Record<string, number>;
  rythme: Record<string, number>;
  contenu: Record<string, number>;
};

const LIBELLES: Record<string, string> = {
  petit: "Petit (2 pers.)",
  grand: "Grand (4-5 pers.)",
  hebdo: "Chaque semaine",
  quinzaine: "Tous les 15 jours",
  legumes: "Légumes",
  fruits: "Fruits",
  mixte: "Les deux",
};

const GROUPES: { cle: "taille" | "rythme" | "contenu"; titre: string; options: string[] }[] = [
  { cle: "taille", titre: "Taille", options: ["petit", "grand"] },
  { cle: "rythme", titre: "Rythme", options: ["hebdo", "quinzaine"] },
  { cle: "contenu", titre: "Contenu", options: ["legumes", "fruits", "mixte"] },
];

/**
 * Réglages du bloc « Panier frais » (teasing) — flag de pilotage (config-source parametre_site)
 * + agrégat des votes pour éclairer la décision d'activer. Comptage STRICT : seules les
 * intentions CONFIRMÉES (double opt-in) comptent comme demande ; les en attente sont affichées
 * à part, jamais ventilées par option (consentement non valide tant que non confirmé).
 */
export function PanierFraisReglages({ actif, agregat }: { actif: boolean; agregat: AgregatPanierFrais }) {
  const router = useRouter();
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function basculer() {
    setError(undefined);
    startTransition(async () => {
      const res = await togglePanierFraisTeasing(!actif);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <Card style={{ padding: 16, maxWidth: 440 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "#0e3947" }}>Panier frais (teasing)</p>
        <Badge tone={actif ? "succes" : "neutre"}>{actif ? "Affiché" : "Masqué"}</Badge>
      </div>
      <p style={{ fontSize: 12, color: "#9a927f", marginBottom: 12 }}>
        Affiche le bloc « Panier frais » sur la page Boutique du site. Le site (autre app) se
        rafraîchit en ~5 min (ISR), pas instantanément.
      </p>

      {/* Toggle */}
      <div
        className="flex items-center justify-between"
        style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 10, padding: "10px 12px" }}
      >
        <span style={{ fontSize: 12.5, color: "#6b7469" }}>Afficher le bloc sur /boutique</span>
        <button
          type="button"
          role="switch"
          aria-checked={actif}
          aria-label="Afficher le bloc Panier frais sur la boutique"
          onClick={basculer}
          disabled={pending}
          style={{
            width: 44,
            height: 26,
            borderRadius: 999,
            background: actif ? "#1f8a5b" : "#cdc3ad",
            position: "relative",
            transition: "background .15s",
            opacity: pending ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 3,
              left: actif ? 21 : 3,
              width: 20,
              height: 20,
              borderRadius: 999,
              background: "#fff",
              transition: "left .15s",
              boxShadow: "0 1px 2px rgba(14,57,71,.35)",
            }}
          />
        </button>
      </div>
      {error && <p style={{ fontSize: 12, color: "#c0442e", marginTop: 8 }}>{error}</p>}

      {/* Dépendance prod : mode email */}
      <div
        className="flex items-start gap-2"
        style={{ marginTop: 12, background: "rgba(233,162,59,.14)", border: "1px solid rgba(233,162,59,.4)", borderRadius: 10, padding: "10px 12px" }}
      >
        <AlertTriangle size={15} strokeWidth={2} color="#a9761e" style={{ marginTop: 1, flexShrink: 0 }} />
        <p style={{ fontSize: 11.5, lineHeight: 1.5, color: "#8a6a1e" }}>
          En production, n&apos;activez qu&apos;après vérification du domaine email (RESEND_PROD=1) :
          sinon les emails de confirmation partent en mode test et les intentions ne peuvent pas être confirmées.
        </p>
      </div>

      {/* Agrégat des votes (confirmés uniquement) */}
      <div style={{ marginTop: 14, borderTop: "1px solid #e6ddca", paddingTop: 12 }}>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0e3947" }}>Intentions confirmées</span>
          <span className="font-mono" style={{ fontSize: 15, fontWeight: 700, color: "#0e3947" }}>{agregat.totalConfirmes}</span>
        </div>
        <p style={{ fontSize: 11.5, color: "#9a927f", marginTop: 2 }}>
          {agregat.totalEnAttente} en attente de confirmation (non comptée{agregat.totalEnAttente > 1 ? "s" : ""})
        </p>

        {agregat.totalConfirmes === 0 ? (
          <p style={{ fontSize: 12, color: "#9a927f", marginTop: 10 }}>
            Aucune intention confirmée pour l&apos;instant. Les votes s&apos;affichent ici dès la première confirmation.
          </p>
        ) : (
          <div className="flex flex-col" style={{ gap: 10, marginTop: 10 }}>
            {GROUPES.map((g) => (
              <div key={g.cle}>
                <div className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: ".1em", color: "#9a927f", marginBottom: 4 }}>{g.titre}</div>
                <div className="flex flex-col" style={{ gap: 3 }}>
                  {g.options.map((o) => (
                    <div key={o} className="flex items-center justify-between">
                      <span style={{ fontSize: 12.5, color: "#6b7469" }}>{LIBELLES[o]}</span>
                      <span className="font-mono" style={{ fontSize: 12.5, color: "#0e3947" }}>{agregat[g.cle][o] ?? 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
