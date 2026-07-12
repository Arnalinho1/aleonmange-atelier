import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { BookOpen } from "lucide-react";

export const metadata = { title: "Catalogue — Atelier ALM" };

/**
 * Catalogue = CONTENU refait à la main (les 58 produits de démo ne sont PAS
 * portés). Vide au lancement — tous les écrans en aval en dépendent.
 * Le formulaire "Nouveau produit" (entrée du vrai contenu) est construit en Phase 1.
 */
export default function CatalogPage() {
  const m = SCREEN_META.catalog;
  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      <EmptyState
        icon={<BookOpen size={30} strokeWidth={1.6} />}
        titre="Aucun produit — créez le premier"
        message="Le catalogue démarre vide et se remplit avec vos vrais plats (canal, mode unité ou poids, prix, composants). C'est par ici qu'entre le contenu validé par les chefs."
      />
    </>
  );
}
