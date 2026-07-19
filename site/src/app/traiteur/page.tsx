import Link from "next/link";
import { BadgeMono, Carte, PhotoAvenir, SurTitre } from "@/components/ui";
import { carteDuCanal, fmtPrix } from "@/lib/data/carte";

/** ISR : fraicheur des lectures (emplacement du jour, carte pilotee par l'Atelier). */
export const revalidate = 300;

export const metadata = {
  title: "Le Traiteur · réceptions faites maison en Beaujolais",
  description:
    "Traiteur artisanal en Beaujolais : mariages, entreprises, cocktails et repas de famille. Un devis sur mesure, sans engagement.",
};

const RECEPTIONS = [
  { titre: "Mariages", detail: "Cocktail et repas assis" },
  { titre: "Entreprises", detail: "Plateaux et buffets" },
  { titre: "Cocktails", detail: "Pièces salées et sucrées" },
  { titre: "Repas de famille", detail: "Grandes tablées" },
];

const ETAPES = [
  { titre: "Votre demande", detail: "Vous décrivez l'événement. Sans engagement." },
  { titre: "Le devis sur mesure", detail: "On revient vers vous avec une proposition, sous 48h." },
  { titre: "La prestation", detail: "Le jour J, on cuisine et on dresse." },
  { titre: "La facturation", detail: "Après la prestation." },
];

/**
 * Le Traiteur (d-trait) : offre, galerie de receptions (photos a venir),
 * carte traiteur (catalogue Atelier), « comment ca marche » en 4 temps.
 * Le devis est une DEMANDE, jamais une commande ferme — pas de total, pas
 * de paiement en ligne. Le detail des conditions de reglement au prospect
 * reste une decision ouverte (libelle volontairement sobre, signale).
 */
export default async function Traiteur() {
  const familles = await carteDuCanal("traiteur");

  return (
    <>
      <section className="bg-canard text-surface-2">
        <div className="mx-auto max-w-[1280px] px-4 md:px-8 py-14 md:py-16 grid md:grid-cols-[1.2fr_1fr] gap-10 items-center">
          <div>
            <SurTitre>Le traiteur</SurTitre>
            <h1 className="font-display font-extrabold text-[clamp(30px,5vw,46px)] leading-[1.05] tracking-[-.02em] mt-3">
              Vos réceptions, faites maison
            </h1>
            <p className="text-[15.5px] leading-relaxed text-surface-2/85 mt-4 max-w-[480px]">
              Mariages, entreprises, cocktails : les mêmes produits locaux que la boutique,
              cuisinés pour vos grands jours. Un devis sur mesure, sans engagement.
            </p>
            <Link
              href="/traiteur/devis"
              className="mt-7 inline-flex items-center h-[48px] px-7 rounded-pille bg-[var(--accent)] text-white font-display font-bold text-[15px]"
            >
              Demander un devis
            </Link>
          </div>
          <PhotoAvenir ratio="4/3" libelle="Photo à venir · une réception" className="rounded-carte-lg" />
        </div>
      </section>

      {/* Quelques receptions */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-8 py-12">
        <SurTitre>Quelques réceptions</SurTitre>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mt-5">
          {RECEPTIONS.map((r) => (
            <Carte key={r.titre} className="overflow-hidden">
              <PhotoAvenir ratio="4/3" libelle={`Photo à venir · ${r.titre.toLowerCase()}`} />
              <div className="p-4">
                <p className="font-display font-extrabold text-[17px] text-canard">{r.titre}</p>
                <p className="text-[13px] text-texte-2 mt-1">{r.detail}</p>
              </div>
            </Carte>
          ))}
        </div>
      </section>

      {/* Carte traiteur */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-8 pb-12">
        <Carte className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <SurTitre>La carte traiteur</SurTitre>
              <h2 className="font-display font-extrabold text-[clamp(22px,3vw,28px)] text-canard tracking-[-.02em] mt-1.5">
                La carte au complet
              </h2>
              <p className="text-[14px] text-texte-2 mt-2 max-w-[560px] leading-relaxed">
                Des pièces apéritives aux desserts : composez vos repas et réceptions,
                avec les mêmes produits locaux que la boutique.
              </p>
            </div>
            <BadgeMono>6 personnes minimum · devis sans engagement</BadgeMono>
          </div>

          {familles.length === 0 ? (
            <div className="mt-6 rounded-carte border border-bord-2 bg-surface-2 p-8 text-center">
              <p className="font-display font-bold text-[16px] text-canard">La carte arrive</p>
              <p className="text-[13.5px] text-texte-2 mt-2 leading-relaxed">
                Les pièces apéritives, plats et desserts s&apos;afficheront ici,
                mis à jour par les chefs. Décrivez-nous votre événement en attendant.
              </p>
            </div>
          ) : (
            <div className="mt-6 columns-1 sm:columns-2 lg:columns-3 gap-10">
              {familles.map((f) => (
                <div key={f.nom} className="break-inside-avoid mb-7">
                  <p className="font-display font-bold text-[16px] text-canard border-b-[1.5px] border-bord-2 pb-2">
                    {f.nom}
                  </p>
                  {f.note && <p className="mt-1.5 text-[12px] text-texte-3">{f.note}</p>}
                  <ul className="mt-2.5 space-y-2">
                    {f.articles.map((a) => (
                      <li key={a.id} className="flex items-baseline justify-between gap-4">
                        <span className="text-[13.5px] text-canard">
                          {a.nom}
                          {a.description && (
                            <span className="block text-[12px] leading-snug text-texte-3 font-normal">{a.description}</span>
                          )}
                        </span>
                        <span className="font-display font-extrabold text-[13.5px] text-[var(--accent)] whitespace-nowrap">
                          {fmtPrix(a)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Carte>
      </section>

      {/* Comment ca marche */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-8 pb-14">
        <SurTitre>Comment ça marche</SurTitre>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-5">
          {ETAPES.map((e, i) => (
            <Carte key={e.titre} className="p-5">
              <span className="font-mono text-[11px] font-semibold text-white bg-canard rounded-[7px] px-2.5 py-1">
                {i + 1}
              </span>
              <p className="font-display font-extrabold text-[16px] text-canard mt-3">{e.titre}</p>
              <p className="text-[13px] text-texte-2 mt-1.5 leading-relaxed">{e.detail}</p>
            </Carte>
          ))}
        </div>
        <p className="mt-4 text-[13.5px] text-texte-2">
          Pas de total ferme en ligne, pas de paiement immédiat. On établit le devis ensemble.
        </p>
      </section>
    </>
  );
}
