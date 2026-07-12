import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { Bell } from "lucide-react";

export const metadata = { title: "Notifications — Atelier ALM" };

/**
 * Notifications générées par des RÈGLES sur le transactionnel + référentiel
 * (seuils stock, DLC). Seuils exacts = POINT OUVERT #2.
 * État vide : « Aucune notification » — le badge de nav disparaît (jamais "0").
 */
export default function NotifsPage() {
  const m = SCREEN_META.notifs;
  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      <EmptyState
        icon={<Bell size={30} strokeWidth={1.6} />}
        titre="Aucune notification"
        message="Ruptures de stock, DLC, seuils et commandes traiteur à confirmer s'afficheront ici. Rien à traiter pour l'instant."
      />
    </>
  );
}
