import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Card } from "@/components/ui/Card";
import { SCREEN_META } from "@/lib/nav";

export const metadata = { title: "Tableau de bord — Atelier ALM" };

/**
 * Tableau de bord. État de lancement = base vide (HANDOFF §02) :
 * verdict « Journée pas encore démarrée », bandeau « 0/7 blocs en réel »,
 * blocs « aucune donnée aujourd'hui ». Aucun chiffre inventé.
 * Les key insights liront la MÊME source qu'Insight (jamais de recalcul).
 */
export default function DashboardPage() {
  const m = SCREEN_META.dashboard;
  return (
    <>
      <ScreenHeader
        rubrique={m.rubrique}
        titre={m.titre}
        desc={m.desc}
        action={
          <span
            className="inline-flex items-center gap-2 rounded-full"
            style={{ background: "#f6f1e7", border: "1px solid #dfd4bf", padding: "7px 13px", fontSize: 12.5, color: "#6b7469" }}
          >
            <span className="rounded-full" style={{ width: 8, height: 8, background: "#3fa8ce" }} />
            Atelier ouvert · Beaujolais
          </span>
        }
      />

      {/* Verdict tricolore — état vide */}
      <div
        style={{
          border: "1px solid #dfd4bf",
          borderLeft: "5px solid #b07a2e",
          borderRadius: 16,
          padding: "16px 20px",
          background: "#f6eedd",
          marginBottom: 18,
        }}
      >
        <div className="flex items-center gap-3">
          <span className="rounded-full" style={{ width: 12, height: 12, background: "#b07a2e" }} />
          <p className="font-display" style={{ fontWeight: 800, fontSize: 20, color: "#b07a2e" }}>
            Journée pas encore démarrée
          </p>
        </div>
        <p style={{ fontSize: 13.5, color: "#6b7469", marginTop: 6 }}>
          Le verdict et les indicateurs apparaîtront dès la première vente encaissée.
        </p>
      </div>

      {/* Bandeau fiabilité */}
      <div style={{ background: "#f1ead9", borderRadius: 12, padding: "10px 14px", marginBottom: 18 }}>
        <p className="font-mono uppercase" style={{ fontSize: 10.5, letterSpacing: ".1em", color: "#b07a2e" }}>
          0 / 7 blocs en réel — l&apos;Atelier se remplit par l&apos;usage
        </p>
      </div>

      {/* 7 blocs vides */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 14 }}>
        {[
          "CA du jour par canal",
          "Objectif du jour",
          "Ventes & panier moyen",
          "Plat qui performe",
          "Charge à produire",
          "Commandes traiteur",
          "Alertes vitales",
        ].map((t) => (
          <Card key={t} style={{ padding: 16 }}>
            <p className="font-display" style={{ fontWeight: 700, fontSize: 15, color: "#0e3947" }}>
              {t}
            </p>
            <p style={{ fontSize: 12.5, color: "#9a927f", marginTop: 8 }}>Aucune donnée aujourd&apos;hui.</p>
          </Card>
        ))}
      </div>
    </>
  );
}
