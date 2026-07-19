import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  Canal,
  CreneauRetrait,
  Emplacement,
  FamilleCarte,
  HoraireBoutique,
  ParametreRentabilite,
} from "@/lib/supabase/database.types";
import { MapPin } from "lucide-react";
import { EmplacementsManager } from "./EmplacementsManager";
import { FamillesCarteManager } from "./FamillesCarteManager";
import { HorairesBoutiqueForm } from "./HorairesBoutiqueForm";
import { CreneauRetraitForm } from "./CreneauRetraitForm";
import { RentabiliteForm } from "./RentabiliteForm";

export const metadata = { title: "Réglages de l'atelier — Atelier ALM" };

/**
 * Réglages de l'atelier — la configuration MÉTIER vit ici, les écrans de
 * pilotage consultent : emplacements truck (HANDOFF §01 — table éditable,
 * jamais un enum, jamais de suppression), contenu du SITE PUBLIC (familles
 * de carte 0021, horaires boutique 0023, précisions d'emplacement 0022) et
 * paramètres de rentabilité (MO/transport par portion, LUS par Finances).
 */
export default async function SettingsPage() {
  const m = SCREEN_META.settings;
  let emplacements: Emplacement[] = [];
  let familles: FamilleCarte[] = [];
  let horaires: HoraireBoutique[] = [];
  let creneau: CreneauRetrait | null = null;
  let parametres: ParametreRentabilite | null = null;
  const categoriesParCanal: Record<Canal, string[]> = { truck: [], boutique: [], traiteur: [] };

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const [{ data }, fam, hor, cre, cats, params] = await Promise.all([
      supabase
        .from("emplacement")
        .select("*")
        .order("actif", { ascending: false })
        .order("jour_semaine", { ascending: true, nullsFirst: false })
        .order("libelle"),
      supabase.from("famille_carte").select("*").order("canal").order("ordre").order("nom"),
      supabase.from("horaire_boutique").select("*").order("jour"),
      supabase.from("creneau_retrait").select("*").eq("actif", true).order("created_at").limit(1).maybeSingle(),
      supabase.from("produit").select("canal, categorie").eq("actif", true),
      supabase.from("parametre_rentabilite").select("*").maybeSingle(),
    ]);
    emplacements = data ?? [];
    familles = (fam.data as FamilleCarte[] | null) ?? [];
    horaires = (hor.data as HoraireBoutique[] | null) ?? [];
    creneau = (cre.data as CreneauRetrait | null) ?? null;
    parametres = (params.data as ParametreRentabilite | null) ?? null;
    // Catégories EN USAGE par canal (aide au rapprochement famille ↔ categorie).
    for (const p of (cats.data as { canal: Canal; categorie: string | null }[] | null) ?? []) {
      const cat = p.categorie?.trim();
      if (cat && !categoriesParCanal[p.canal].includes(cat)) categoriesParCanal[p.canal].push(cat);
    }
    (Object.keys(categoriesParCanal) as Canal[]).forEach((c) => categoriesParCanal[c].sort());
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

      {/* Contenu du SITE PUBLIC : familles de carte (ordre + notes) et horaires boutique. */}
      <div style={{ marginTop: 20 }}>
        <FamillesCarteManager familles={familles} categoriesParCanal={categoriesParCanal} />
      </div>
      <div style={{ marginTop: 20 }}>
        <HorairesBoutiqueForm horaires={horaires} />
      </div>
      <div style={{ marginTop: 20 }}>
        <CreneauRetraitForm creneau={creneau} />
      </div>

      {/* La saisie des paramètres vit ICI (Réglages configure, Finances consulte). */}
      <div style={{ marginTop: 20 }}>
        <RentabiliteForm parametres={parametres} />
      </div>
    </>
  );
}
