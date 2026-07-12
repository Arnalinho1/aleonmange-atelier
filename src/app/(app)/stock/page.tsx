import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { Boxes } from "lucide-react";

export const metadata = { title: "Stocks — Atelier ALM" };

export default function StockPage() {
  const m = SCREEN_META.stock;
  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      <EmptyState
        icon={<Boxes size={30} strokeWidth={1.6} />}
        titre="Aucun article en stock"
        message="Inventaire par composant, seuils, lots et DLC apparaîtront ici. Aucune alerte fantôme tant que le référentiel est vide."
      />
    </>
  );
}
