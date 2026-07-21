import { Carte, Photo, SurTitre } from "@/components/ui";
import { CHEFS, COORDONNEES } from "@/lib/contenu";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  path: "/histoire",
  title: "Notre histoire · deux chefs en Beaujolais",
  description:
    "L'histoire d'A Léon Mange : Audrey et Victorien, deux chefs, un laboratoire à Létra et une cuisine faite maison avec les producteurs du Beaujolais.",
});

const PILIERS = [
  { titre: "Local", detail: "Producteurs du Beaujolais" },
  { titre: "Fait maison", detail: "Tout est cuisiné au labo" },
  { titre: "De saison", detail: "La carte suit le marché" },
];

/**
 * Notre histoire (d-hist) : Audrey & Victorien, le laboratoire, les trois
 * piliers. Les textes longs definitifs (contenu reel) restent a ecrire avec
 * le marketing — trame fidele a la maquette, sobre, sans invention.
 */
export default function Histoire() {
  return (
    <>
      <section className="mx-auto max-w-[1280px] px-4 md:px-8 py-12 md:py-16">
        <SurTitre>Notre histoire</SurTitre>
        <h1 className="font-display font-extrabold text-[clamp(30px,5vw,44px)] leading-[1.05] tracking-[-.02em] text-canard mt-3 max-w-[640px]">
          Audrey et Victorien : tout part du laboratoire
        </h1>
        <p className="text-[15.5px] leading-relaxed text-texte-2 mt-4 max-w-[620px]">
          A Léon Mange, c&apos;est {CHEFS} : deux chefs installés à {COORDONNEES.adresse.split(",")[1]?.trim() ?? "Létra"},
          en plein Beaujolais. Chaque jour, tout se cuisine au laboratoire : les plats de la boutique,
          la carte du food truck et les réceptions du traiteur sortent de la même cuisine,
          avec les mêmes produits.
        </p>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 md:px-8 grid gap-5 md:grid-cols-2">
        <Photo
          src="/images/chefs-truck.webp"
          alt="Audrey et Victorien devant le food truck A Léon Mange"
          ratio="4/3"
          sizes="(max-width: 768px) 100vw, 45vw"
          className="rounded-carte-lg"
        />
        <Photo
          src="/images/laboratoire.webp"
          alt="Le laboratoire d'A Léon Mange, mise en place du jour"
          ratio="4/3"
          sizes="(max-width: 768px) 100vw, 50vw"
          className="rounded-carte-lg"
        />
      </section>

      <section className="mx-auto max-w-[1280px] px-4 md:px-8 py-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {PILIERS.map((p) => (
            <Carte key={p.titre} className="p-6">
              <p className="font-display font-extrabold text-[19px] text-canard">{p.titre}</p>
              <p className="text-[13.5px] text-texte-2 mt-1.5">{p.detail}</p>
            </Carte>
          ))}
        </div>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[.12em] text-muet">
          Texte complet et photos à venir · contenus réels en préparation avec l&apos;équipe
        </p>
      </section>
    </>
  );
}
