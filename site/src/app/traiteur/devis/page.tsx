import { SurTitre } from "@/components/ui";
import { BientotDisponible } from "@/components/BientotDisponible";

export const metadata = {
  title: "Devis traiteur · bientôt disponible",
  robots: { index: false },
};

/**
 * Demande de devis (d-devis) — l'ECRITURE arrive en Vague 2. Un devis est
 * une DEMANDE, jamais une commande ferme : le libelle le dit deja ici.
 */
export default function Devis() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 md:px-8 py-14 md:py-20">
      <div className="text-center mb-8">
        <SurTitre>Demande de devis</SurTitre>
        <h1 className="font-display font-extrabold text-[clamp(26px,4vw,36px)] tracking-[-.02em] text-canard mt-2">
          Décrivez-nous votre événement
        </h1>
        <p className="text-[14px] text-texte-2 mt-3 max-w-[480px] mx-auto">
          Une demande de devis n&apos;est pas un engagement : on construit la proposition ensemble,
          et on vous répond sous 48h.
        </p>
      </div>
      <BientotDisponible
        titre="Le formulaire de devis ouvre bientôt"
        detail="Type d'événement, date, nombre de convives, envies : vous pourrez tout nous décrire ici. Aucun paiement en ligne, jamais."
      />
    </section>
  );
}
