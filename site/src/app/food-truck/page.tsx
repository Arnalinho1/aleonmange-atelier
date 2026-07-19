import Link from "next/link";
import { BadgeMono, Carte, PhotoAvenir, SurTitre } from "@/components/ui";
import { carteDuCanal, fmtPrix } from "@/lib/data/carte";
import { emplacementsTruck } from "@/lib/data/emplacements";

/** ISR : fraicheur des lectures (emplacement du jour, carte pilotee par l'Atelier). */
export const revalidate = 300;

export const metadata = {
  title: "Le Food truck · les marchés du Beaujolais",
  description:
    "Le food truck A Léon Mange sur les marchés du Beaujolais : emplacements de la semaine, carte du moment, précommande possible.",
};

/**
 * Le Food truck (d-truck) : emplacements de la semaine (« aujourd'hui »
 * CALCULE et mis en avant, jamais stocke), carte du truck (catalogue
 * Atelier), CTA precommande contextualise. Paiement au retrait, sur place.
 */
export default async function FoodTruck() {
  const [emplacements, familles] = await Promise.all([emplacementsTruck(), carteDuCanal("truck")]);
  const duJour = emplacements.find((e) => e.aujourdhui);

  return (
    <>
      <section className="bg-canard text-surface-2">
        <div className="mx-auto max-w-[1280px] px-4 md:px-8 py-14 md:py-16">
          <SurTitre>Le food truck</SurTitre>
          <h1 className="font-display font-extrabold text-[clamp(30px,5vw,46px)] leading-[1.05] tracking-[-.02em] mt-3">
            Où manger cette semaine
          </h1>
          <p className="text-[15.5px] leading-relaxed text-surface-2/85 mt-4 max-w-[520px]">
            Trois rendez-vous par semaine dans le Beaujolais. Précommandez, on prépare pour vous.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-7">
            <Link
              href="/food-truck/precommander"
              className="inline-flex items-center h-[48px] px-7 rounded-pille bg-[var(--accent)] text-white font-display font-bold text-[15px]"
            >
              Précommander sur le truck
            </Link>
            <BadgeMono ton="canard">Paiement au retrait · sur place</BadgeMono>
          </div>
        </div>
      </section>

      {/* Emplacements de la semaine */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-8 py-12">
        <SurTitre>Nos emplacements</SurTitre>
        {emplacements.length === 0 ? (
          <Carte className="mt-4 p-8 text-center">
            <p className="font-display font-bold text-[17px] text-canard">Les emplacements arrivent</p>
            <p className="text-[13.5px] text-texte-2 mt-2 max-w-[440px] mx-auto leading-relaxed">
              Les marchés de la semaine s&apos;afficheront ici, mis à jour par l&apos;atelier.
              Suivez-nous sur Instagram pour connaître les prochains rendez-vous.
            </p>
          </Carte>
        ) : (
          <div className="grid gap-5 md:grid-cols-3 mt-5">
            {emplacements.map((e) => (
              <div
                key={e.id}
                className={`rounded-carte-lg bg-surface p-5 flex flex-col ${e.aujourdhui ? "border-[1.5px] border-[var(--accent)]" : "border border-bord"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <BadgeMono ton={e.aujourdhui ? "accent" : "vert"}>
                    {e.aujourdhui ? "Aujourd'hui" : e.jour || "Bientôt"}
                  </BadgeMono>
                  <span className="font-mono text-[11px] text-texte-3">{e.horaire}</span>
                </div>
                <h2 className="font-display font-extrabold text-[19px] text-canard mt-3">{e.nom}</h2>
                {(e.lieu || e.ville) && (
                  <p className="text-[12.5px] text-texte-3 mt-0.5">
                    {[e.lieu, e.ville].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="text-[13px] text-texte-2 mt-1 flex-1">
                  {e.jour ? `Chaque ${e.jour.toLowerCase()}` : "Jour à confirmer"} · {e.horaire}
                </p>
                <Link
                  href="/food-truck/precommander"
                  className="mt-4 font-display font-bold text-[14px] text-[var(--accent)]"
                >
                  {e.aujourdhui
                    ? "Précommander pour aujourd'hui →"
                    : e.jour
                      ? `Précommander pour ${e.jour.toLowerCase()} →`
                      : "Précommander →"}
                </Link>
              </div>
            ))}
          </div>
        )}
        {duJour == null && emplacements.length > 0 && (
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[.1em] text-muet">
            Le truck ne sort pas aujourd&apos;hui · prochains rendez-vous ci-dessus
          </p>
        )}
      </section>

      {/* Carte du truck */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-8 pb-14 grid gap-6 lg:grid-cols-[1.4fr_1fr] items-start">
        <Carte className="p-6 md:p-8">
          <SurTitre>La carte</SurTitre>
          <h2 className="font-display font-extrabold text-[clamp(22px,3vw,28px)] text-canard tracking-[-.02em] mt-1.5">
            Au menu du truck
          </h2>
          {familles.length === 0 ? (
            <div className="mt-6 rounded-carte border border-bord-2 bg-surface-2 p-8 text-center">
              <p className="font-display font-bold text-[16px] text-canard">Le menu arrive</p>
              <p className="text-[13.5px] text-texte-2 mt-2 leading-relaxed">
                La carte du moment s&apos;affichera ici, mise à jour par les chefs chaque semaine.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-7">
              {familles.map((f) => (
                <div key={f.nom}>
                  <p className="font-display font-bold text-[16px] text-canard border-b-[1.5px] border-bord-2 pb-2">
                    {f.nom}
                  </p>
                  {f.note && <p className="mt-1.5 text-[12px] text-texte-3">{f.note}</p>}
                  <ul className="mt-2.5 space-y-2">
                    {f.articles.map((a) => (
                      <li key={a.id} className="flex items-baseline justify-between gap-4">
                        <span className="text-[14px] text-canard">
                          {a.nom}
                          {a.description && (
                            <span className="block text-[12px] leading-snug text-texte-3">{a.description}</span>
                          )}
                        </span>
                        <span className="font-display font-extrabold text-[14px] text-[var(--accent)] whitespace-nowrap">
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
        <div className="grid gap-5">
          <PhotoAvenir ratio="4/3" libelle="Photo à venir · le truck" className="rounded-carte-lg" />
          <PhotoAvenir ratio="4/3" libelle="Photo à venir · au marché" className="rounded-carte-lg" />
        </div>
      </section>
    </>
  );
}
