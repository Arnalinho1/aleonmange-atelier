import Link from "next/link";
import { BadgeMono, Carte, Photo, SurTitre } from "@/components/ui";
import { COORDONNEES } from "@/lib/contenu";
import { carteDuCanal } from "@/lib/data/carte";
import { horairesBoutique } from "@/lib/data/horaires";

/** ISR : fraicheur des lectures (emplacement du jour, carte pilotee par l'Atelier). */
export const revalidate = 300;

export const metadata = {
  title: "La Boutique · plats faits maison à Létra",
  description:
    "La boutique A Léon Mange à Létra : plats du jour faits maison, bocaux et épicerie de producteurs du Beaujolais. Sur place ou en click & collect.",
};

/**
 * La Boutique (d-btq) : hero, recettes signatures (etat vide propre en
 * attendant le contenu reel), infos pratiques, carte VITRINE (sans prix —
 * lue du catalogue Atelier, pilotee par les chefs), CTA click & collect.
 */
export default async function Boutique() {
  const [familles, horaires] = await Promise.all([carteDuCanal("boutique"), horairesBoutique()]);
  // Recettes signatures = produits du catalogue portant une image (0033). Pilote par la
  // donnee : aucune galerie en dur ; fallback etat vide propre si aucune image posee.
  const signatures = familles.flatMap((f) => f.articles).filter((a) => a.image);

  return (
    <>
      {/* Hero bande */}
      <section className="relative bg-canard text-surface-2">
        <div className="mx-auto max-w-[1280px] px-4 md:px-8 py-14 md:py-16 max-w-none">
          <div className="mx-auto max-w-[1280px]">
            <SurTitre>La Boutique</SurTitre>
            <h1 className="font-display font-extrabold text-[clamp(30px,5vw,46px)] leading-[1.05] tracking-[-.02em] mt-3">
              Passez quand vous voulez
            </h1>
            <p className="text-[15.5px] leading-relaxed text-surface-2/85 mt-4 max-w-[520px]">
              Le comptoir d&apos;A Léon Mange : nos plats du jour, des bocaux à garder et une petite
              épicerie de producteurs. À emporter tout de suite, ou en click &amp; collect.
            </p>
            <Link
              href="/boutique/commander"
              className="mt-7 inline-flex items-center h-[48px] px-7 rounded-pille bg-[var(--accent)] text-white font-display font-bold text-[15px]"
            >
              Commander en click &amp; collect
            </Link>
          </div>
        </div>
      </section>

      {/* Recettes signatures — pilotees par le catalogue (produits avec image, 0033) */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-8 pt-12">
        <SurTitre>Nos recettes signatures</SurTitre>
        {signatures.length === 0 ? (
          <Carte className="mt-4 p-8 text-center">
            <p className="font-display font-bold text-[17px] text-canard">Les signatures arrivent ici</p>
            <p className="text-[13.5px] text-texte-2 mt-2 max-w-[440px] mx-auto leading-relaxed">
              Les recettes emblématiques de la maison, avec leurs photos, seront présentées ici
              dès que la carte réelle sera en place.
            </p>
          </Carte>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-4">
            {signatures.map((a) => (
              <Carte key={a.id} className="overflow-hidden flex flex-col">
                <Photo
                  src={a.image!}
                  alt={a.nom}
                  ratio="4/3"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="p-4">
                  <p className="font-display font-extrabold text-[16px] text-canard">{a.nom}</p>
                  {a.description && (
                    <p className="text-[13px] text-texte-2 mt-1 leading-snug">{a.description}</p>
                  )}
                </div>
              </Carte>
            ))}
          </div>
        )}
      </section>

      {/* Infos pratiques + carte vitrine */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-8 py-12 grid gap-6 lg:grid-cols-[1fr_1.4fr] items-start">
        <div className="grid gap-5">
          <Carte className="p-6">
            <SurTitre>Nous trouver</SurTitre>
            <p className="font-display font-bold text-[17px] text-canard mt-2">{COORDONNEES.adresse}</p>
            <p className="text-[13.5px] text-texte-2 mt-1">{COORDONNEES.region}</p>
            <a
              href={COORDONNEES.plan}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block font-display font-bold text-[14px] text-[var(--accent)]"
            >
              Plan d&apos;accès →
            </a>
          </Carte>
          <Carte className="p-6">
            <SurTitre>Horaires</SurTitre>
            <ul className="mt-3 space-y-2.5">
              {horaires.map((h) => (
                <li key={h.jours} className="flex items-baseline justify-between gap-4 text-[14px]">
                  <span className="font-semibold text-canard">{h.jours}</span>
                  <span className="text-texte-2 text-right">{h.heures}</span>
                </li>
              ))}
            </ul>
          </Carte>
          <Photo
            src="/images/boutique-devanture.webp"
            alt="La devanture de la boutique A Léon Mange à Létra"
            ratio="4/3"
            sizes="(max-width: 1024px) 100vw, 34vw"
            className="rounded-carte-lg"
          />
        </div>

        <Carte className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <SurTitre>La carte de la boutique</SurTitre>
              <h2 className="font-display font-extrabold text-[clamp(22px,3vw,28px)] text-canard tracking-[-.02em] mt-1.5">
                Une carte qui change chaque semaine
              </h2>
            </div>
            <BadgeMono ton="vert">Pilotée par l&apos;atelier</BadgeMono>
          </div>

          {familles.length === 0 ? (
            <div className="mt-6 rounded-carte border border-bord-2 bg-surface-2 p-8 text-center">
              <p className="font-display font-bold text-[16px] text-canard">Notre carte arrive</p>
              <p className="text-[13.5px] text-texte-2 mt-2 leading-relaxed">
                Les familles de produits et les plats du moment s&apos;afficheront ici,
                mis à jour par les chefs. Passez en boutique en attendant !
              </p>
            </div>
          ) : (
            <div className="mt-6 columns-1 sm:columns-2 gap-10">
              {familles.map((f) => (
                <div key={f.nom} className="break-inside-avoid mb-7">
                  <p className="font-display font-bold text-[16px] text-canard border-b-[1.5px] border-bord-2 pb-2">
                    {f.nom}
                  </p>
                  {f.note && <p className="mt-1.5 text-[12px] text-texte-3">{f.note}</p>}
                  <ul className="mt-2.5 space-y-1.5">
                    {f.articles.map((a) => (
                      <li key={a.id} className="text-[13.5px] text-texte-2">
                        {a.nom}
                        {a.description && (
                          <span className="block text-[12px] leading-snug text-texte-3">{a.description}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[.1em] text-muet">
            Carte indicative · les prix s&apos;affichent en boutique et en click &amp; collect
          </p>
        </Carte>
      </section>
    </>
  );
}
