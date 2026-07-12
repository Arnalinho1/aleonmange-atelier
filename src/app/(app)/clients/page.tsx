import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { Users } from "lucide-react";

export const metadata = { title: "Clients — Atelier ALM" };

export default function ClientsPage() {
  const m = SCREEN_META.clients;
  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      <EmptyState
        icon={<Users size={30} strokeWidth={1.6} />}
        titre="Aucun client enregistré"
        message="Les fiches clients (surtout traiteur et click & collect) et leur récurrence apparaîtront ici. Le comptoir anonyme ne crée pas de client."
      />
    </>
  );
}
