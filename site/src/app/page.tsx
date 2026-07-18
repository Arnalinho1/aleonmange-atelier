import Link from "next/link";
import { BadgeMono, Carte, PhotoAvenir, SurTitre } from "@/components/ui";
import { COORDONNEES, HORAIRE_SERVICE_TRUCK } from "@/lib/contenu";
import { emplacementsTruck } from "@/lib/data/emplacements";

/** ISR : fraicheur des lectures (emplacement du jour, carte pilotee par l'Atelier). */
export const revalidate = 300;

export const metadata = {
  title: "A Léon Mange · Cuisine maison en Beaujolais : boutique, traiteur et food truck",
};

/**
 * Accueil (d-acc) : hero + « Par ou commencer ? » — trois cartes canaux,
 * BOUTIQUE EN TETE (reequilibrage acte), puis Notre maison. Le bandeau
 * truck est CALCULE depuis les emplacements (aujourd'hui vs prochain jour).
 */
export default async function Accueil() {
  const emplacements = await emplacementsTruck();
  const duJour = emplacements.find((e) => e.aujourdhui) ?? null;
  const prochain = duJour ?? emplacements[0] ?? null;

  return (
    <>
      {/* Hero */}
      <section className="relative bg-canard text-surface-2 overflow-hidden">
        <div className="mx-auto max-w-[1280px] px-4 md:px-8 py-14 md:py-20 grid md:grid-cols-[1.15fr_1fr] gap-10 items-center">
          <div>
            <SurTitre>Boutique · Traiteur · Food truck · Beaujolais</SurTitre>
            <h1 className="font-display font-extrabold text-[clamp(30px,5.5vw,48px)] leading-[1.05] tracking-[-.02em] mt-3">
              Cuisine « maison » en Beaujolais : boutique, traiteur et food truck
            </h1>
            <p className="text-[15.5px] leading-relaxed text-surface-2/85 mt-4 max-w-[480px]">
              Des plats faits main chaque jour par deux chefs, des produits de la région,
              et trois façons d&apos;en profiter.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-7">
              <Link
                href="/boutique"
                className="inline-flex items-center h-[48px] px-7 rounded-pille bg-[var(--accent)] text-white font-display font-bold text-[15px]"
              >
                Découvrir la boutique
              </Link>
              <Link
                href="/traiteur/devis"
                className="inline-flex items-center h-[48px] px-6 rounded-pille border border-white/25 text-surface-2 font-display font-bold text-[14.5px]"
              >
                Demander un devis
              </Link>
            </div>
            <p className="inline-flex items-center gap-2 mt-6 font-mono text-[11px] uppercase tracking-[.1em] text-or">
              <span className="w-2 h-2 rounded-full bg-vert-fond" aria-hidden />
              Boutique ouverte · Mardi à vendredi 9h à 19h · Samedi 9h à 14h
            </p>
          </div>
          <PhotoAvenir ratio="4/3" libelle="Photo à venir · la maison" className="rounded-carte-lg" />
        </div>
      </section>

      {/* Trois canaux, boutique en tete */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-8 py-12 md:py-16">
        <SurTitre>Par où commencer ?</SurTitre>
        <h2 className="font-display font-extrabold text-[clamp(24px,3.5vw,32px)] text-canard tracking-[-.02em] mt-2">
          Trois façons de nous retrouver
        </h2>

        <div className="grid gap-5 md:grid-cols-3 mt-8">
          <Carte className="overflow-hidden flex flex-col">
            <PhotoAvenir ratio="16/10" libelle="Photo à venir · la boutique" />
            <div className="p-5 flex-1 flex flex-col">
              <BadgeMono ton="accent">Le plus simple</BadgeMono>
              <h3 className="font-display font-extrabold text-[20px] text-canard mt-3">La Boutique</h3>
              <p className="text-[13.5px] leading-relaxed text-texte-2 mt-2 flex-1">
                Passez quand vous voulez : plats du jour, bocaux et petite épicerie de producteurs.
                À emporter tout de suite, ou en click &amp; collect.
              </p>
              <Link href="/boutique" className="mt-4 font-display font-bold text-[14px] text-[var(--accent)]">
                Commander en click &amp; collect →
              </Link>
            </div>
          </Carte>

          <Carte className="overflow-hidden flex flex-col">
            <PhotoAvenir ratio="16/10" libelle="Photo à venir · le traiteur" />
            <div className="p-5 flex-1 flex flex-col">
              <BadgeMono>Événements</BadgeMono>
              <h3 className="font-display font-extrabold text-[20px] text-canard mt-3">Le Traiteur</h3>
              <p className="text-[13.5px] leading-relaxed text-texte-2 mt-2 flex-1">
                Vos réceptions, faites maison. Mariages, entreprises, cocktails :
                un devis sur mesure, sans engagement.
              </p>
              <Link href="/traiteur" className="mt-4 font-display font-bold text-[14px] text-[var(--accent)]">
                Demander un devis →
              </Link>
            </div>
          </Carte>

          <Carte className="overflow-hidden flex flex-col">
            <PhotoAvenir ratio="16/10" libelle="Photo à venir · le food truck" />
            <div className="p-5 flex-1 flex flex-col">
              {duJour ? (
                <BadgeMono ton="accent">Aujourd&apos;hui · {duJour.nom}</BadgeMono>
              ) : (
                <BadgeMono ton="vert">Trois midis par semaine</BadgeMono>
              )}
              <h3 className="font-display font-extrabold text-[20px] text-canard mt-3">Le Food truck</h3>
              <p className="text-[13.5px] leading-relaxed text-texte-2 mt-2 flex-1">
                {duJour
                  ? `Aujourd'hui : ${duJour.nom}, ${HORAIRE_SERVICE_TRUCK}. Précommande possible.`
                  : prochain
                    ? `De retour ${prochain.jour.toLowerCase()} : ${prochain.nom}. Sur les marchés du Beaujolais.`
                    : "Sur les marchés du Beaujolais. Les emplacements de la semaine arrivent ici."}
              </p>
              <Link href="/food-truck" className="mt-4 font-display font-bold text-[14px] text-[var(--accent)]">
                Voir les emplacements →
              </Link>
            </div>
          </Carte>
        </div>
      </section>

      {/* Notre maison */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-8 pb-14">
        <Carte className="overflow-hidden grid md:grid-cols-[1fr_1.2fr]">
          <PhotoAvenir ratio="4/3" libelle="Photo à venir · Audrey et Victorien" className="h-full" />
          <div className="p-6 md:p-10 flex flex-col justify-center">
            <SurTitre>Notre maison</SurTitre>
            <h2 className="font-display font-extrabold text-[clamp(22px,3vw,28px)] text-canard mt-2">
              Deux chefs, une cuisine faite main en Beaujolais
            </h2>
            <p className="text-[14.5px] leading-relaxed text-texte-2 mt-3 max-w-[480px]">
              Audrey et Victorien cuisinent chaque jour à {COORDONNEES.adresse.split(",")[1]?.trim() ?? "Létra"} :
              des recettes de saison, des producteurs voisins, et l&apos;envie de bien nourrir.
            </p>
            <Link href="/histoire" className="mt-5 font-display font-bold text-[14.5px] text-[var(--accent)]">
              Notre histoire →
            </Link>
          </div>
        </Carte>
      </section>
    </>
  );
}
