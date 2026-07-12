import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { Lightbulb } from "lucide-react";

export const metadata = { title: "Insight stratégique — Atelier ALM" };

/**
 * Insight = source UNIQUE des insights (le dashboard lit le même jeu, .slice(0,3)).
 * Règles de génération exactes + seuils = POINT OUVERT #2 (à valider avec Arnaud).
 * État vide : « Rien à arbitrer — pas assez de données ».
 */
export default function InsightPage() {
  const m = SCREEN_META.insight;
  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      <EmptyState
        icon={<Lightbulb size={30} strokeWidth={1.6} />}
        titre="Rien à arbitrer — pas assez de données"
        message="Les insights (constat · chiffre · action) naissent avec l'activité. Le dashboard lira ce même jeu, jamais un calcul parallèle."
      />
    </>
  );
}
