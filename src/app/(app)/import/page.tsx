import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ImportMapping, Produit } from "@/lib/supabase/database.types";
import { ImportWizard } from "./ImportWizard";

export const metadata = { title: "Import caisse — Atelier ALM" };

/**
 * Import caisse (Contrat §05, POINT OUVERT #1) : reconstitue les ventes
 * boutique de fin de journée par lot. Mapping PROVISOIRE et configurable
 * (persisté), lignes inconnues exclues, mode déduit marqué « à confirmer ».
 */
export default async function ImportPage() {
  const m = SCREEN_META.import;
  let produits: Produit[] = [];
  let mappingInitial: { separateur: string; colonnes: Record<string, string> } | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const [p, mp] = await Promise.all([
      supabase.from("produit").select("*").eq("canal", "boutique").eq("actif", true),
      supabase.from("import_mapping").select("*").eq("nom", "defaut").eq("actif", true).maybeSingle(),
    ]);
    produits = (p.data ?? []) as Produit[];
    const mapping = mp.data as ImportMapping | null;
    if (mapping && mapping.colonnes && typeof mapping.colonnes === "object") {
      mappingInitial = { separateur: mapping.separateur, colonnes: mapping.colonnes as Record<string, string> };
    }
  }

  return (
    <>
      <ScreenHeader rubrique={`${m.rubrique} · boutique`} titre={m.titre} desc={m.desc} />
      <ImportWizard produits={produits} mappingInitial={mappingInitial} />
    </>
  );
}
