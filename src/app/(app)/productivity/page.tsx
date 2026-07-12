import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { Gauge } from "lucide-react";

export const metadata = { title: "Productivité — Atelier ALM" };

export default function ProductivityPage() {
  const m = SCREEN_META.productivity;
  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      <EmptyState
        icon={<Gauge size={30} strokeWidth={1.6} />}
        titre="Aucune production mesurée"
        message="Cadence, temps par plat et débit par créneau se calculent depuis les transitions de fulfillment horodatées. Pas de moyenne sur zéro."
      />
    </>
  );
}
