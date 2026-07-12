import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { History } from "lucide-react";

export const metadata = { title: "Historique des ventes — Atelier ALM" };

export default function HistoryPage() {
  const m = SCREEN_META.history;
  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      <EmptyState
        icon={<History size={30} strokeWidth={1.6} />}
        titre="Aucune vente enregistrée"
        message="Les ventes remises s'afficheront ici par jour, avec CA, nombre de ventes et panier moyen. Même source que Finances."
      />
    </>
  );
}
