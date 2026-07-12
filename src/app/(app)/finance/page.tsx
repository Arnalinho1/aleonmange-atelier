import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { KpiCard } from "@/components/ui/KpiCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";

export const metadata = { title: "Finances — Atelier ALM" };

/**
 * Finances — dérive de la MÊME source qu'Historique (vue v_vente_remise, CA sur
 * fulfillment=remis). Marges nommées distinctement : "brute matière" vs "nette".
 * État vide : montants à 0 € proprement, ratios masqués (jamais NaN%).
 */
export default function FinancePage() {
  const m = SCREEN_META.finance;
  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 18 }}>
        <KpiCard label="Chiffre d'affaires" value="0 €" sub="ventes remises" />
        <KpiCard label="Marge brute matière" value="—" sub="prix − coût matière" />
        <KpiCard label="Marge nette" value="—" sub="après charges" />
        <KpiCard label="Panier moyen" value="—" sub="masqué si 0 vente" />
      </div>
      <EmptyState
        titre="Pas de données sur la période"
        message="Les montants, marges et ventilations par canal se calculent dès les premières ventes remises. Aucun ratio n'est affiché tant que le dénominateur est nul."
      />
    </>
  );
}
