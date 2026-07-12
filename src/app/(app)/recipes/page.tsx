import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { ChefHat } from "lucide-react";

export const metadata = { title: "Recettes & plats — Atelier ALM" };

export default function RecipesPage() {
  const m = SCREEN_META.recipes;
  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      <EmptyState
        icon={<ChefHat size={30} strokeWidth={1.6} />}
        titre="Aucune fiche technique — créez-en une"
        message="Les fiches (composants, quantités, étapes, rendement) se créent avec les chefs. Rôle production : coût matière et marge brute, pas de recalcul commercial."
      />
    </>
  );
}
