import { BadgeMono, Carte, SurTitre } from "@/components/ui";
import { COORDONNEES } from "@/lib/contenu";
import { horairesBoutique } from "@/lib/data/horaires";
import { buildMetadata } from "@/lib/seo";

/** ISR : les horaires affiches sont pilotes par l'Atelier (0023). */
export const revalidate = 300;

export const metadata = buildMetadata({
  path: "/contact",
  title: "Contact · A Léon Mange à Létra",
  description:
    "Contacter A Léon Mange : 1923 route de la vallée à Létra (Beaujolais), téléphone, email, horaires de la boutique et plan d'accès.",
});

/**
 * Contact (d-contact) : coordonnees REELLES (§06), horaires, plan d'acces.
 * Le formulaire « Un message ? » est une ECRITURE (envoi d'email) → Vague 2 ;
 * en attendant, telephone et email cliquables font le travail.
 */
export default async function Contact() {
  const horaires = await horairesBoutique();
  return (
    <section className="mx-auto max-w-[1280px] px-4 md:px-8 py-12 md:py-16">
      <SurTitre>Contact</SurTitre>
      <h1 className="font-display font-extrabold text-[clamp(30px,5vw,44px)] leading-[1.05] tracking-[-.02em] text-canard mt-3">
        On vous répond
      </h1>

      <div className="grid gap-5 lg:grid-cols-3 mt-8 items-start">
        <Carte className="p-6">
          <SurTitre>La boutique</SurTitre>
          <p className="font-display font-bold text-[17px] text-canard mt-2">
            {COORDONNEES.adresse.split(",")[0]}
          </p>
          <p className="text-[14px] text-texte-2">{COORDONNEES.adresse.split(",")[1]?.trim()}</p>
          <p className="text-[13.5px] text-texte-2 mt-0.5">{COORDONNEES.region}</p>
          <a
            href={COORDONNEES.plan}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center h-[42px] px-5 rounded-pille border border-bord-2 bg-surface-2 text-canard font-display font-bold text-[13.5px]"
          >
            Plan d&apos;accès
          </a>
          <ul className="mt-5 space-y-2 border-t border-bord pt-4">
            {horaires.map((h) => (
              <li key={h.jours} className="flex items-baseline justify-between gap-4 text-[13.5px]">
                <span className="font-semibold text-canard">{h.jours}</span>
                <span className="text-texte-2 text-right">{h.heures}</span>
              </li>
            ))}
          </ul>
        </Carte>

        <Carte className="p-6">
          <SurTitre>Par téléphone ou email</SurTitre>
          <a
            href={`tel:${COORDONNEES.telephoneLien}`}
            className="mt-3 block font-display font-extrabold text-[24px] text-canard"
          >
            {COORDONNEES.telephone}
          </a>
          <a
            href={`mailto:${COORDONNEES.email}`}
            className="mt-2 inline-block text-[14.5px] font-semibold text-[var(--accent)] underline underline-offset-4"
          >
            {COORDONNEES.email}
          </a>
          <div className="mt-5 flex gap-2.5">
            <a
              href={COORDONNEES.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center h-[40px] px-4 rounded-pille bg-vert-fond text-vert font-display font-bold text-[13px]"
            >
              Instagram
            </a>
            <a
              href={COORDONNEES.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center h-[40px] px-4 rounded-pille bg-vert-fond text-vert font-display font-bold text-[13px]"
            >
              Facebook
            </a>
          </div>
        </Carte>

        <Carte className="p-6">
          <div className="flex items-center justify-between gap-3">
            <SurTitre>Un message ?</SurTitre>
            <BadgeMono ton="vert">Ouverture prochainement</BadgeMono>
          </div>
          <p className="text-[13.5px] leading-relaxed text-texte-2 mt-3">
            Le formulaire de contact arrive bientôt. En attendant, écrivez-nous directement
            par email ou appelez la boutique : on répond vite.
          </p>
          <a
            href={`mailto:${COORDONNEES.email}`}
            className="mt-4 inline-flex items-center h-[44px] px-6 rounded-pille bg-[var(--accent)] text-white font-display font-bold text-[14px]"
          >
            Écrire un email
          </a>
        </Carte>
      </div>
    </section>
  );
}
