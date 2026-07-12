import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Emplacement, ParametreRentabilite } from "@/lib/supabase/database.types";
import { MapPin } from "lucide-react";
import { EmplacementsManager } from "./EmplacementsManager";
import { RentabiliteForm } from "./RentabiliteForm";

export const metadata = { title: "Réglages de l'atelier — Atelier ALM" };

/**
 * Réglages de l'atelier — la configuration MÉTIER vit ici, les écrans de
 * pilotage consultent : emplacements truck (HANDOFF §01 — table éditable,
 * jamais un enum, jamais de suppression) et paramètres de rentabilité
 * (MO/transport par portion, LUS par la marge nette de Finances).
 */
export default async function SettingsPage() {
  const m = SCREEN_META.settings;
  let emplacements: Emplacement[] = [];
  let parametres: ParametreRentabilite | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const [{ data }, params] = await Promise.all([
      supabase
        .from("emplacement")
        .select("*")
        .order("actif", { ascending: false })
        .order("jour_semaine", { ascending: true, nullsFirst: false })
        .order("libelle"),
      supabase.from("parametre_rentabilite").select("*").maybeSingle(),
    ]);
    emplacements = data ?? [];
    parametres = (params.data as ParametreRentabilite | null) ?? null;
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

      {/* La saisie des paramètres vit ICI (Réglages configure, Finances consulte). */}
      <div style={{ marginTop: 20 }}>
        <RentabiliteForm parametres={parametres} />
      </div>
    </>
  );
}
