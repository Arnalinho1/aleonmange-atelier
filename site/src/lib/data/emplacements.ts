import "server-only";
import { clientLecture } from "@/lib/supabase/serveur";
import { HORAIRE_SERVICE_TRUCK } from "@/lib/contenu";

/**
 * Emplacements du food truck — SOURCE UNIQUE : la table emplacement de
 * l'Atelier (celle que la Saisie et la Productivite consomment deja).
 * Le flag « aujourd'hui » est CALCULE (jour courant Europe/Paris vs
 * jour_semaine), jamais stocke — meme mecanique que le badge AUJ. de
 * l'Atelier. Lieu precis et horaire par emplacement arriveront avec le
 * plan de migration referentiel (colonnes additives).
 */

export type EmplacementTruck = {
  id: string;
  nom: string; // libelle Atelier (ex. « Marché du Bois d'Oingt »)
  jour: string; // « Mardi »
  ville: string | null; // 0022 — saisie Reglages, null = non renseigne
  lieu: string | null; // 0022 — lieu precis (ex. « Place du marché »)
  horaire: string; // horaire_service (0022) ou amplitude par defaut
  aujourdhui: boolean; // CALCULE
};

const JOURS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function jourCourantParis(): number {
  const nom = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "Europe/Paris" }).format(new Date());
  return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].indexOf(nom) + 1;
}

/** Emplacements actifs, tries par jour de semaine. Vide si non configure. */
export async function emplacementsTruck(): Promise<EmplacementTruck[]> {
  const supabase = clientLecture();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("emplacement")
    .select("id, libelle, jour_semaine, ville, lieu, horaire_service")
    .eq("actif", true)
    .order("jour_semaine", { ascending: true, nullsFirst: false });
  if (error) {
    throw new Error(`[site ALM] Lecture des emplacements impossible : ${error.message}`);
  }

  type Ligne = {
    id: string;
    libelle: string;
    jour_semaine: number | null;
    ville: string | null;
    lieu: string | null;
    horaire_service: string | null;
  };
  const auj = jourCourantParis();
  return ((data ?? []) as Ligne[]).map((e) => ({
    id: e.id,
    nom: e.libelle,
    jour: e.jour_semaine != null ? JOURS[e.jour_semaine] ?? "" : "",
    ville: e.ville?.trim() || null,
    lieu: e.lieu?.trim() || null,
    horaire: e.horaire_service?.trim() || HORAIRE_SERVICE_TRUCK,
    aujourdhui: e.jour_semaine != null && e.jour_semaine === auj,
  }));
}
