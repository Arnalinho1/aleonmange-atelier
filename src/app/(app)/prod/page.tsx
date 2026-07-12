import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { Factory } from "lucide-react";

export const metadata = { title: "Production — Atelier ALM" };

export default function ProdPage() {
  const m = SCREEN_META.prod;
  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      <EmptyState
        icon={<Factory size={30} strokeWidth={1.6} />}
        titre="Pas encore d'historique pour prévoir"
        message="La prévision de demande s'appuie sur l'historique des ventes. En attendant, la saisie manuelle d'un plan de production sera proposée plutôt qu'un graphe vide."
      />
    </>
  );
}
