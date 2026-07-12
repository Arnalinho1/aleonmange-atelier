import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Emplacement } from "@/lib/supabase/database.types";
import { MapPin } from "lucide-react";
import { EmplacementsManager } from "./EmplacementsManager";

export const metadata = { title: "Emplacements & réglages — Atelier ALM" };

/**
 * Réglages — référentiel des emplacements truck (HANDOFF §01, point critique) :
 * table éditable (ajouter / renommer / désactiver), jamais un enum, jamais de
 * suppression. Les 3 marchés réels sont seedés ; la liste vit ensuite ici.
 */
export default async function SettingsPage() {
  const m = SCREEN_META.settings;
  let emplacements: Emplacement[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("emplacement")
      .select("*")
      .order("actif", { ascending: false })
      .order("jour_semaine", { ascending: true, nullsFirst: false })
      .order("libelle");
    emplacements = data ?? [];
  }

  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />

      {emplacements.length === 0 ? (
        <EmptyState
          icon={<MapPin size={30} strokeWidth={1.6} />}
          titre="Aucun emplacement"
          message="Les emplacements truck sont seedés à l'installation (Oingt, Tassin, Salvagny). Si cette liste est vide, vérifiez que la migration de seed a bien été appliquée."
        />
      ) : (
        <EmplacementsManager emplacements={emplacements} />
      )}
    </>
  );
}
