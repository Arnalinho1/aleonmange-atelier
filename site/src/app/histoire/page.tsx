import Image from "next/image";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  path: "/histoire",
  title: "Notre histoire · deux chefs en Beaujolais",
  description:
    "L'histoire d'A Léon Mange : Audrey et Victorien, deux chefs, un laboratoire à Létra et une cuisine faite maison avec les producteurs du Beaujolais.",
});

/**
 * Page « Notre histoire » (refonte maquette CD "Notre Histoire", docs/handoffs/).
 * 8 sections de la maquette : le header + le footer sont rendus par le layout
 * (inchanges) ; cette page porte hero -> pont canaux. Server component (metadata
 * preservee). Textes figes integres verbatim (voix « nous », zero cadratin : le
 * seul tiret cadratin du recit est passe en deux-points). Photos = visuels ALM
 * existants (hero = chefs-truck.webp, la photo ALM neutre). Container aligne au
 * standard du site (max-w-1280 + px-4 md:px-8) pour rester cale avec l'en-tete.
 */

const CANAUX = [
  {
    href: "/boutique",
    img: "/images/boutique-planche.webp",
    alt: "La boutique",
    titre: "La Boutique",
    phrase: "La carte qui change chaque semaine, à emporter à Létra.",
    cta: "Découvrir",
  },
  {
    href: "/traiteur",
    img: "/images/traiteur-buffet.webp",
    alt: "Le traiteur",
    titre: "Le Traiteur",
    phrase: "Vos réceptions, dressées et pensées comme à la maison.",
    cta: "Demander un devis",
  },
  {
    href: "/food-truck",
    img: "/images/truck-service.webp",
    alt: "Le food truck",
    titre: "Le Food truck",
    phrase: "Sur les marchés du Beaujolais et de l'ouest lyonnais.",
    cta: "Voir les emplacements",
  },
];

const PARCOURS = [
  { n: "01", titre: "Chez Bocuse", texte: "Audrey en cuisine, Victorien en pâtisserie. La rigueur d'une grande maison." },
  { n: "02", titre: "Le camion J9", texte: "Notre reconversion : un vieux food truck, retapé de nos mains." },
  { n: "03", titre: "La boutique de Létra", texte: "Un point fixe et un vrai labo, au cœur du Beaujolais." },
  { n: "04", titre: "Trois canaux", texte: "Boutique, traiteur et food truck : une même cuisine partout." },
];

function Fleche() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function HistoirePage() {
  return (
    <div className="overflow-hidden">
      {/* ============ HERO ============ */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-8 pt-12 md:pt-16 pb-8 md:pb-10 grid gap-10 md:gap-[52px] md:grid-cols-[1.02fr_1fr] items-center">
        <div>
          <div className="inline-flex items-center gap-2.5 font-mono text-[12px] uppercase tracking-[.16em] text-terracotta">
            <span className="w-[22px] h-[1.5px] bg-terracotta inline-block" />
            Notre histoire
          </div>
          <h1 className="font-display font-extrabold text-[clamp(34px,7vw,60px)] leading-[1] tracking-[-.035em] text-canard mt-[18px]">
            Deux chefs,<br />un camion,<br />et le nom de Léon.
          </h1>
          <p className="text-[17px] leading-[1.7] text-encre mt-6 max-w-[500px] text-pretty">
            Nous, c&apos;est Audrey et Victorien, formés chez <strong className="text-canard font-semibold">Bocuse</strong> : Audrey en cuisine, Victorien en pâtisserie. Un jour, nous avons troqué les grandes maisons pour un vieux <strong className="text-canard font-semibold">camion J9</strong> et une idée simple : cuisiner pour de vrai, tous les jours, avec les produits du Beaujolais.
          </p>
          <div className="flex gap-2.5 mt-6 flex-wrap">
            {["Cuisine", "Cœur", "Convivialité"].map((p) => (
              <span key={p} className="font-mono text-[11.5px] uppercase tracking-[.1em] text-canard bg-surface border border-bord-2 rounded-pille px-[15px] py-[9px]">
                {p}
              </span>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="relative aspect-[4/4.6] rounded-[22px] overflow-hidden bg-voile shadow-[0_40px_80px_-46px_rgba(14,57,71,.55)]">
            <Image
              src="/images/chefs-truck.webp"
              alt="Audrey et Victorien devant le food truck, dans les vignes du Beaujolais"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 45vw"
              className="object-cover"
              style={{ objectPosition: "76% 50%" }}
            />
          </div>
          <div className="absolute left-2 md:left-[-18px] bottom-[26px] bg-surface border border-bord-2 rounded-[16px] px-[18px] py-[13px] shadow-[0_20px_40px_-22px_rgba(14,57,71,.5)]">
            <div className="font-mono text-[10px] uppercase tracking-[.14em] text-terracotta">Depuis</div>
            <div className="font-display font-extrabold text-[22px] text-canard leading-[1] mt-[3px]">le Beaujolais</div>
          </div>
        </div>
      </section>

      {/* ============ MANIFESTE (bande canard) ============ */}
      <section className="bg-canard text-[#f3ecdd] mt-6">
        <div className="mx-auto max-w-[1280px] px-4 md:px-8 py-12 md:py-14 grid gap-8 md:gap-10 grid-cols-1 md:grid-cols-[auto_1fr] items-center">
          <span className="w-24 h-24 rounded-full bg-[#f3ecdd] flex items-center justify-center shrink-0 overflow-hidden">
            <Image src="/alm-mark.png" alt="Léon" width={78} height={78} className="object-contain" style={{ transform: "translate(7%,6%)" }} />
          </span>
          <div>
            <div className="font-mono text-[11.5px] uppercase tracking-[.16em] text-or">Pourquoi « À Léon Mange »</div>
            <p className="font-display font-medium text-[clamp(21px,3.4vw,27px)] leading-[1.4] tracking-[-.01em] mt-3 text-[#f7f1e4] max-w-[900px] text-pretty">
              Léon, c&apos;est le grand-père de Victorien. Un nom, un béret, et l&apos;idée qu&apos;on cuisine d&apos;abord pour faire plaisir. Notre camion, notre labo, notre marque : <span className="text-or">tout est fait maison, et tout nous ressemble.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ============ RECIT LABO ============ */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-8 pt-12 md:pt-16 pb-5 grid gap-8 md:gap-[52px] md:grid-cols-[1.15fr_1fr] items-center">
        <div className="relative aspect-[16/11] rounded-[22px] overflow-hidden bg-voile shadow-[0_40px_80px_-50px_rgba(14,57,71,.5)]">
          <Image src="/images/laboratoire.webp" alt="Le laboratoire d'À Léon Mange" fill sizes="(max-width: 768px) 100vw, 55vw" className="object-cover" />
        </div>
        <div>
          <div className="font-mono text-[12px] uppercase tracking-[.14em] text-terracotta">Tout part du labo</div>
          <h2 className="font-display font-extrabold text-[clamp(26px,4vw,34px)] leading-[1.08] tracking-[-.02em] text-canard mt-3">
            Une seule cuisine,<br />trois façons d&apos;en profiter
          </h2>
          <p className="text-[15.5px] leading-[1.75] text-encre mt-[18px] text-pretty">
            Chaque matin, au laboratoire de Létra, nous préparons tout à la main. Les plats de la <strong className="text-canard font-semibold">boutique</strong>, la carte du <strong className="text-canard font-semibold">food truck</strong> et les réceptions du <strong className="text-canard font-semibold">traiteur</strong> sortent de la même cuisine : mêmes recettes, mêmes producteurs, mêmes mains.
          </p>
          <p className="text-[15.5px] leading-[1.75] text-encre mt-3.5 text-pretty">
            Rien d&apos;industriel, rien de figé : la carte suit le marché et les saisons du Beaujolais.
          </p>
        </div>
      </section>

      {/* ============ LES 3 C ============ */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-8 pt-11 pb-2">
        <div className="text-center mb-6">
          <div className="font-mono text-[12px] uppercase tracking-[.14em] text-terracotta">Notre signature</div>
          <h2 className="font-display font-extrabold text-[clamp(24px,3.6vw,30px)] tracking-[-.02em] text-canard mt-2">Les 3 C</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="bg-surface border border-bord rounded-[20px] p-[26px] md:p-[30px_26px]">
            <span className="w-12 h-12 rounded-[13px] bg-[#f3e4d6] flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B0704C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 3v5M12 3v5M16 3v5M6 12h12l-1 9H7z" /></svg>
            </span>
            <div className="font-display font-extrabold text-[21px] text-canard mt-[18px]">Cuisine</div>
            <p className="text-[14px] leading-[1.6] text-texte-3 mt-2">Le fait maison, tous les jours, avec des produits d&apos;ici et de saison.</p>
          </div>
          <div className="bg-surface border border-bord rounded-[20px] p-[26px] md:p-[30px_26px]">
            <span className="w-12 h-12 rounded-[13px] bg-[#f6dcd9] flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D81020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21C7 18 4 14 4 9.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8 3.5C20 14 17 18 12 21z" /></svg>
            </span>
            <div className="font-display font-extrabold text-[21px] text-canard mt-[18px]">Cœur</div>
            <p className="text-[14px] leading-[1.6] text-texte-3 mt-2">Nous cuisinons comme on reçoit à la maison, d&apos;abord pour faire plaisir.</p>
          </div>
          <div className="bg-surface border border-bord rounded-[20px] p-[26px] md:p-[30px_26px]">
            <span className="w-12 h-12 rounded-[13px] bg-vert-fond flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2E6B4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            </span>
            <div className="font-display font-extrabold text-[21px] text-canard mt-[18px]">Convivialité</div>
            <p className="text-[14px] leading-[1.6] text-texte-3 mt-2">Sur le marché, à la boutique ou en réception : toujours un bon moment partagé.</p>
          </div>
        </div>
      </section>

      {/* ============ PARCOURS (mobile vertical) ============ */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-8 pt-12 pb-5">
        <div className="font-mono text-[12px] uppercase tracking-[.14em] text-terracotta">Le parcours</div>
        <h2 className="font-display font-extrabold text-[clamp(24px,3.6vw,30px)] tracking-[-.02em] text-canard mt-2 mb-6">De l&apos;école Bocuse à Létra</h2>
        <div className="grid gap-[18px] md:grid-cols-4">
          {PARCOURS.map((e) => {
            const dernier = e.n === "04";
            return (
              <div key={e.n} className={`rounded-[18px] p-[22px] md:p-[24px_22px] border ${dernier ? "bg-canard border-canard" : "bg-surface border-bord"}`}>
                <div className={`font-mono text-[11px] tracking-[.12em] w-[30px] h-[30px] rounded-[9px] flex items-center justify-center ${dernier ? "text-canard bg-or" : "text-white bg-canard"}`}>{e.n}</div>
                <div className={`font-display font-bold text-[17px] mt-4 ${dernier ? "text-[#f7f1e4]" : "text-canard"}`}>{e.titre}</div>
                <p className={`text-[13.5px] leading-[1.6] mt-[7px] ${dernier ? "text-[#cddce0]" : "text-texte-3"}`}>{e.texte}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============ PONT CANAUX ============ */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-8 pt-12 pb-12 md:pb-16">
        <div className="grid gap-5 md:grid-cols-3">
          {CANAUX.map((c) => (
            <Link key={c.href} href={c.href} className="group block bg-surface border border-bord rounded-[20px] overflow-hidden transition-colors hover:border-canard">
              <div className="relative aspect-[16/10] bg-voile overflow-hidden">
                <Image src={c.img} alt={c.alt} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
              </div>
              <div className="p-[22px]">
                <div className="font-display font-extrabold text-[19px] text-canard">{c.titre}</div>
                <p className="text-[13.5px] leading-[1.55] text-texte-3 mt-1.5">{c.phrase}</p>
                <div className="inline-flex items-center gap-1.5 mt-3 font-display font-bold text-[14px] text-[var(--accent)]">
                  {c.cta}
                  <Fleche />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
