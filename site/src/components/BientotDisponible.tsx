import { COORDONNEES } from "@/lib/contenu";
import { BadgeMono, Carte } from "./ui";

/**
 * Etat « Ouverture prochainement » des parcours d'ECRITURE (click & collect,
 * precommande truck, devis, formulaire contact) — Vague 2. Le CTA reste
 * utile des maintenant : le telephone REEL (§06) prend le relais.
 */
export function BientotDisponible({
  titre,
  detail,
}: {
  titre: string;
  detail: string;
}) {
  return (
    <Carte className="p-6 sm:p-8 text-center max-w-[560px] mx-auto">
      <BadgeMono ton="vert">Ouverture prochainement</BadgeMono>
      <h2 className="font-display font-extrabold text-[24px] text-canard leading-tight mt-4">{titre}</h2>
      <p className="text-[14px] leading-relaxed text-texte-2 mt-3">{detail}</p>
      <p className="text-[14px] leading-relaxed text-texte-2 mt-3">
        En attendant, un coup de fil suffit :
      </p>
      <a
        href={`tel:${COORDONNEES.telephoneLien}`}
        className="mt-4 inline-flex items-center justify-center h-[48px] px-7 rounded-pille bg-[var(--accent)] text-white font-display font-bold text-[15px]"
      >
        {COORDONNEES.telephone}
      </a>
    </Carte>
  );
}
