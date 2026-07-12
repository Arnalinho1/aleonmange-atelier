import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { ShieldCheck } from "lucide-react";

export const metadata = { title: "HACCP — Atelier ALM" };

export default function HaccpPage() {
  const m = SCREEN_META.haccp;
  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      <EmptyState
        icon={<ShieldCheck size={30} strokeWidth={1.6} />}
        titre="Aucun relevé aujourd'hui"
        message="Températures, DLC de lots et contrôles s'enregistrent ici, horodatés — registre réglementaire de traçabilité."
      />
    </>
  );
}
