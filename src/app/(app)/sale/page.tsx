import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { ShoppingBag } from "lucide-react";

export const metadata = { title: "Saisie de vente — Atelier ALM" };

/**
 * Saisie de vente = LA source de vérité transactionnelle.
 * État vide (HANDOFF §02) : catalogue vide → inviter à créer des produits.
 * La composition réelle (panier multi-mode, encaissement, occurred_at, dérivation
 * fulfillment) est construite en Phase 2, une fois le catalogue alimentable.
 */
export default function SalePage() {
  const m = SCREEN_META.sale;
  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      <EmptyState
        icon={<ShoppingBag size={30} strokeWidth={1.6} />}
        titre="Aucun produit à vendre pour l'instant"
        message="Le catalogue est vide. Ajoutez des produits au Catalogue pour pouvoir composer et encaisser une vente."
        cta={{ label: "Aller au Catalogue", href: "/catalog" }}
      />
    </>
  );
}
