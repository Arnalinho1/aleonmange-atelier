import { SurTitre } from "@/components/ui";
import { PanierPrecommande } from "@/components/PanierPrecommande";
import { carteDuCanal } from "@/lib/data/carte";
import { emplacementsTruck } from "@/lib/data/emplacements";
import { prochainRetraitTruck } from "@/lib/data/creneaux";

export const metadata = {
  title: "Precommande food truck",
  robots: { index: false },
};

/** Precommande truck (d-precmd) : panier truck + emplacement du marche -> precommande web a confirmer. */
export default async function Precommander({ searchParams }: { searchParams: Promise<{ emplacement?: string }> }) {
  const { emplacement } = await searchParams;
  const [familles, emplacements] = await Promise.all([carteDuCanal("truck"), emplacementsTruck()]);
  // Date de retrait COMPLETE (jour + date) par emplacement : MEME source que le due_at
  // pose a la commande (prochainRetraitTruck, cote /api/commande) -> affichage coherent
  // avec le calcul Europe/Paris, sans divergence.
  const choix = emplacements.map((e) => ({
    code: e.code,
    nom: e.nom,
    jour: e.jour,
    dateLabel: e.jourSemaine != null ? (prochainRetraitTruck(e.jourSemaine)?.label ?? null) : null,
  }));
  const initial = choix.some((c) => c.code === emplacement) ? (emplacement as string) : "";

  return (
    <section className="mx-auto max-w-[1280px] px-4 md:px-8 py-12 md:py-16">
      <div className="mb-8">
        <SurTitre>Precommande food truck</SurTitre>
        <h1 className="font-display font-extrabold text-[clamp(26px,4vw,36px)] tracking-[-.02em] text-canard mt-2">
          Precommander sur le truck
        </h1>
        <p className="text-[14.5px] text-texte-2 mt-2 max-w-[560px] leading-relaxed">
          Choisissez votre marche et composez votre commande. Retrait sur place, paiement au retrait.
          La precommande est ouverte jusqu&apos;a la veille au soir, et confirmee par l&apos;atelier.
        </p>
      </div>
      <PanierPrecommande canal="truck" familles={familles} emplacements={choix} emplacementInitial={initial} />
    </section>
  );
}
