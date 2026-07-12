import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { ClipboardList } from "lucide-react";

export const metadata = { title: "Commandes du jour — Atelier ALM" };

export default function OrdersPage() {
  const m = SCREEN_META.orders;
  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      <EmptyState
        icon={<ClipboardList size={30} strokeWidth={1.6} />}
        titre="Aucune commande à produire"
        message="Les précommandes non remises (traiteur et click & collect) apparaîtront ici, groupées par créneau. Le comptoir instantané n'y figure pas."
      />
    </>
  );
}
