import { SurTitre } from "@/components/ui";
import { FormulaireDevis } from "@/components/FormulaireDevis";

export const metadata = {
  title: "Demande de devis traiteur",
  robots: { index: false },
};

/** Timeline NEUTRE : jamais de delai/conditions de reglement au prospect (J+30 cote Atelier). */
const ETAPES = ["Votre demande", "Validation par l'atelier", "La prestation", "La facturation"];

/** Demande de devis (d-devis) : une DEMANDE, pas une commande. Ecrit dans demande_devis. */
export default function Devis() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 md:px-8 py-12 md:py-16">
      <div className="mb-8">
        <SurTitre>Demande de devis</SurTitre>
        <h1 className="font-display font-extrabold text-[clamp(26px,4vw,36px)] tracking-[-.02em] text-canard mt-2">
          Decrivez-nous votre evenement
        </h1>
        <p className="text-[14.5px] text-texte-2 mt-3 max-w-[520px] leading-relaxed">
          Une demande de devis n&apos;est pas un engagement : on construit la proposition ensemble,
          et on vous repond sous 48h. Aucun paiement en ligne, jamais.
        </p>
      </div>

      <ol className="flex flex-wrap gap-2 mb-8">
        {ETAPES.map((e, i) => (
          <li key={e} className="flex items-center gap-2 text-[13px] text-texte-2">
            <span className="grid place-items-center w-6 h-6 rounded-full bg-surface-2 border border-bord-2 font-mono text-[11px] text-canard">{i + 1}</span>
            {e}
            {i < ETAPES.length - 1 && <span className="text-texte-3 ml-1">-&gt;</span>}
          </li>
        ))}
      </ol>

      <FormulaireDevis />
    </section>
  );
}
