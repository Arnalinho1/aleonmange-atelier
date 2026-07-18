import { SurTitre } from "@/components/ui";
import { BientotDisponible } from "@/components/BientotDisponible";

export const metadata = {
  title: "Click & collect · bientôt disponible",
  robots: { index: false },
};

/** Click & collect (d-cc) — l'ECRITURE arrive en Vague 2 (panier, creneau, commande web a confirmer). */
export default function Commander() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 md:px-8 py-14 md:py-20">
      <div className="text-center mb-8">
        <SurTitre>Click &amp; collect</SurTitre>
        <h1 className="font-display font-extrabold text-[clamp(26px,4vw,36px)] tracking-[-.02em] text-canard mt-2">
          Commander à la boutique
        </h1>
      </div>
      <BientotDisponible
        titre="La commande en ligne ouvre bientôt"
        detail="Vous pourrez composer votre panier, choisir un créneau de retrait et payer directement à la boutique. Chaque commande sera confirmée par l'atelier avant préparation."
      />
    </section>
  );
}
