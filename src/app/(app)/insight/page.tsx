import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { trierInsights } from "@/lib/insights";
import type { Insight } from "@/lib/supabase/database.types";
import { Lightbulb } from "lucide-react";
import { InsightBoard } from "./InsightBoard";

export const metadata = { title: "Insight stratégique — Atelier ALM" };

/**
 * Insight stratégique — SOURCE UNIQUE des insights (HANDOFF §03) : le
 * dashboard lit ce même jeu, trié par lib/insights.ts, en .slice(0,3).
 * Les RÈGLES de génération (seuils stock, DLC, tendances) ne sont PAS
 * implémentées : POINT OUVERT #2, à valider avant de figer. L'écran pose
 * la structure (lecture + statuts) et son état vide.
 */
export default async function InsightPage() {
  const m = SCREEN_META.insight;
  let insights: Insight[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.from("insight").select("*").neq("statut", "traite");
    insights = trierInsights((data ?? []) as Insight[]);
  }

  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      {insights.length === 0 ? (
        <EmptyState
          icon={<Lightbulb size={30} strokeWidth={1.6} />}
          titre="Rien à arbitrer — pas assez de données"
          message="Les insights (CONSTAT + CHIFFRE + ACTION) naissent avec l'activité. Les règles de génération restent à valider (point ouvert) — aucune règle n'est figée ici."
        />
      ) : (
        <InsightBoard insights={insights} />
      )}
    </>
  );
}
