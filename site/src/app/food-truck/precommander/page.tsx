import { SurTitre } from "@/components/ui";
import { BientotDisponible } from "@/components/BientotDisponible";

export const metadata = {
  title: "Précommande food truck · bientôt disponible",
  robots: { index: false },
};

/** Precommande truck (d-precmd) — l'ECRITURE arrive en Vague 2 (panier contextualise emplacement + jour). */
export default function Precommander() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 md:px-8 py-14 md:py-20">
      <div className="text-center mb-8">
        <SurTitre>Précommande food truck</SurTitre>
        <h1 className="font-display font-extrabold text-[clamp(26px,4vw,36px)] tracking-[-.02em] text-canard mt-2">
          Précommander sur le truck
        </h1>
      </div>
      <BientotDisponible
        titre="La précommande en ligne ouvre bientôt"
        detail="Vous pourrez commander pour l'emplacement de votre choix et récupérer votre repas sans attendre. Paiement au retrait, sur place."
      />
    </section>
  );
}
