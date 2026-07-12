import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SCREEN_META } from "@/lib/nav";
import { Upload } from "lucide-react";

export const metadata = { title: "Import caisse — Atelier ALM" };

/**
 * Import caisse — POINT OUVERT #1. Le mapping CSV et la déduction de mode sont
 * PROVISOIRES (HANDOFF §05) : à caler sur un vrai export caisse. Rien n'est figé
 * ici — l'écran prévoit un mapping configurable. État vide : zone de dépôt seule.
 */
export default function ImportPage() {
  const m = SCREEN_META.import;
  return (
    <>
      <ScreenHeader rubrique="Activité · boutique" titre={m.titre} desc={m.desc} />

      <div style={{ background: "rgba(233,162,59,.16)", border: "1px solid rgba(233,162,59,.3)", borderRadius: 12, padding: "10px 14px", marginBottom: 18 }}>
        <div className="flex items-center gap-2">
          <Badge tone="demo">Provisoire</Badge>
          <p style={{ fontSize: 13, color: "#a9761e" }}>
            Format à caler sur un vrai export de la caisse boutique. Mapping et déduction de mode non figés.
          </p>
        </div>
      </div>

      <Card style={{ padding: 28 }}>
        <div
          className="flex flex-col items-center justify-center text-center"
          style={{ border: "2px dashed #d8cdb6", borderRadius: 14, padding: "44px 20px" }}
        >
          <Upload size={30} strokeWidth={1.6} color="#9a927f" />
          <p className="font-display" style={{ fontWeight: 700, fontSize: 16, color: "#0e3947", marginTop: 12 }}>
            Déposez un fichier caisse (CSV)
          </p>
          <p style={{ fontSize: 13, color: "#6b7469", marginTop: 6, maxWidth: 420 }}>
            Le fichier sera prévisualisé et mappé avant validation. Les lignes non rapprochées sont exclues du batch.
          </p>
        </div>
      </Card>
    </>
  );
}
