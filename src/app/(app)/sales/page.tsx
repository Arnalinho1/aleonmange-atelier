import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { TrendingUp } from "lucide-react";

export const metadata = { title: "Ventes & tendances — Atelier ALM" };

export default function SalesPage() {
  const m = SCREEN_META.sales;
  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      <EmptyState
        icon={<TrendingUp size={30} strokeWidth={1.6} />}
        titre="Pas encore de tendance — revenez après quelques ventes"
        message="Courbes, top produits et saisonnalité (lecture de occurred_at) s'affichent dès qu'il y a de l'historique. Aucun axe ni graphe cassé en attendant."
      />
    </>
  );
}
