import { SurTitre } from "@/components/ui";
import { PanierPrecommande } from "@/components/PanierPrecommande";
import { carteDuCanal } from "@/lib/data/carte";
import { creneauxRetraitBoutique } from "@/lib/data/creneaux";

export const metadata = {
  title: "Click & collect · commander a la boutique",
  robots: { index: false },
};

/** Click & collect (d-cc) : panier boutique + creneau de retrait -> precommande web a confirmer. */
export default async function Commander() {
  const [familles, creneaux] = await Promise.all([carteDuCanal("boutique"), creneauxRetraitBoutique()]);

  return (
    <section className="mx-auto max-w-[1280px] px-4 md:px-8 py-12 md:py-16">
      <div className="mb-8">
        <SurTitre>Click &amp; collect</SurTitre>
        <h1 className="font-display font-extrabold text-[clamp(26px,4vw,36px)] tracking-[-.02em] text-canard mt-2">
          Commander a la boutique
        </h1>
        <p className="text-[14.5px] text-texte-2 mt-2 max-w-[560px] leading-relaxed">
          Composez votre panier et choisissez un creneau de retrait. Aucun paiement en ligne :
          vous reglez au retrait, et l&apos;atelier confirme votre demande.
        </p>
      </div>
      <PanierPrecommande canal="boutique" familles={familles} creneaux={creneaux} />
    </section>
  );
}
