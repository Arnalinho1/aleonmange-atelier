import { BadgeMono, Carte, SurTitre } from "@/components/ui";
import { COORDONNEES } from "@/lib/contenu";

export const metadata = {
  title: "Mentions légales",
  robots: { index: false },
};

/**
 * Mentions legales (d-mentions) — PLACEHOLDERS JURIDIQUES clairement
 * identifies (raison sociale, SIRET, hebergeur : contenus reels a fournir,
 * decision business ouverte). Structure fidele a la maquette.
 */
const SECTIONS = [
  {
    titre: "Éditeur du site",
    corps: `[Raison sociale à fournir] · [SIRET à fournir] · ${COORDONNEES.adresse} · ${COORDONNEES.email}`,
    placeholder: true,
  },
  {
    titre: "Hébergement",
    corps: "[Nom de l'hébergeur, adresse à fournir]. Le site est hébergé dans l'Union européenne.",
    placeholder: true,
  },
  {
    titre: "Données personnelles (RGPD)",
    corps:
      "Les données transmises via les futurs formulaires (commande, devis, lettre d'information) ne servent qu'à traiter votre demande. Aucune revente, aucun partage publicitaire. Vous pouvez demander l'accès, la rectification ou la suppression de vos données en écrivant à " +
      COORDONNEES.email +
      ". [Texte définitif à valider.]",
    placeholder: true,
  },
  {
    titre: "Propriété intellectuelle",
    corps: "Les contenus, textes et photographies sont la propriété d'A Léon Mange, sauf mention contraire.",
    placeholder: false,
  },
  {
    titre: "Cookies et mesure d'audience",
    corps:
      "Le site ne dépose aucun cookie de suivi tant que vous n'y consentez pas. Avec votre accord, nous utilisons Google Analytics (mesure d'audience et de conversions) ; vous pouvez refuser sans perdre l'accès au site. Votre choix est conservé 13 mois au maximum, puis la bannière de consentement réapparaît ; vous pouvez le modifier à tout moment via « Gérer les cookies » en bas de chaque page. La mesure d'usage technique du site (Vercel Analytics) reste anonyme et sans cookie.",
    placeholder: false,
  },
];

export default function MentionsLegales() {
  return (
    <section className="mx-auto max-w-[860px] px-4 md:px-8 py-12 md:py-16">
      <SurTitre>Informations légales</SurTitre>
      <h1 className="font-display font-extrabold text-[clamp(28px,4.5vw,40px)] tracking-[-.02em] text-canard mt-3">
        Mentions légales
      </h1>
      <p className="text-[14px] text-texte-2 mt-3">
        Contenu à fournir : raison sociale, SIRET, hébergeur, texte RGPD définitif.
        Les blocs concernés sont identifiés ci-dessous.
      </p>

      <div className="mt-8 space-y-4">
        {SECTIONS.map((s) => (
          <Carte key={s.titre} className="p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-display font-extrabold text-[17px] text-canard">{s.titre}</h2>
              {s.placeholder && <BadgeMono>Placeholder · contenu à fournir</BadgeMono>}
            </div>
            <p className="text-[14px] leading-relaxed text-texte-2 mt-2.5">{s.corps}</p>
          </Carte>
        ))}
      </div>
    </section>
  );
}
