import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { SCREEN_META } from "@/lib/nav";
import { Megaphone } from "lucide-react";

export const metadata = { title: "Réseaux sociaux — Atelier ALM" };

/**
 * Réseaux sociaux = canal d'acquisition principal d'ALM (pas le SEO).
 * Périmètre du référentiel social = POINT OUVERT #4 (cadrage marketing).
 * Contenu de démo non porté.
 */
export default function CommuPage() {
  const m = SCREEN_META.commu;
  return (
    <>
      <ScreenHeader
        rubrique={m.rubrique}
        titre={m.titre}
        desc={m.desc}
        action={<Badge tone="demo">Périmètre à cadrer</Badge>}
      />
      <EmptyState
        icon={<Megaphone size={30} strokeWidth={1.6} />}
        titre="Aucune publication programmée"
        message="Le planning de publications par réseau, calé sur les emplacements truck réels, se remplira avec le contenu marketing. Périmètre exact à cadrer avec l'équipe."
      />
    </>
  );
}
