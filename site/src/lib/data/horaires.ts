import "server-only";
import { clientLecture } from "@/lib/supabase/serveur";
import { HORAIRES_BOUTIQUE } from "@/lib/contenu";

/**
 * Horaires boutique — SOURCE : table horaire_boutique (0023), pilotee par
 * les chefs depuis les Reglages de l'Atelier. 1 ligne par jour, 2 plages
 * time nullables : plages nulles = FERME (fermeture explicite).
 * Table VIDE = non configure → fallback INTEGRAL sur contenu.ts (le site
 * ne reste jamais sans horaires). Les jours consecutifs au meme horaire
 * sont regroupes (« Mardi à vendredi ») dans l'ordre d'affichage historique
 * mardi → lundi : avec le seed de la 0023, l'affichage est iso avec
 * l'ancien contenu en dur.
 */

export type LigneHoraire = { jours: string; heures: string };

type LigneBrute = {
  jour: number;
  plage1_debut: string | null;
  plage1_fin: string | null;
  plage2_debut: string | null;
  plage2_fin: string | null;
};

const NOMS_JOURS = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const ORDRE_AFFICHAGE = [2, 3, 4, 5, 6, 7, 1]; // mardi → lundi (ouverture de la boutique)
// Jour 1-7 (lundi-dimanche) → nom schema.org (openingHoursSpecification).
const JOURS_SCHEMA = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** "09:00:00" → "9h" · "09:30:00" → "9h30". */
function fmtHeure(t: string): string {
  const [h, m] = t.split(":");
  return `${Number(h)}h${m !== "00" ? m : ""}`;
}

/** Libelle des plages d'un jour : "9h à 13h · 15h à 19h", ou "Fermé". */
function fmtPlages(l: LigneBrute | undefined): string {
  if (!l || l.plage1_debut == null || l.plage1_fin == null) return "Fermé";
  const p1 = `${fmtHeure(l.plage1_debut)} à ${fmtHeure(l.plage1_fin)}`;
  if (l.plage2_debut == null || l.plage2_fin == null) return p1;
  return `${p1} · ${fmtHeure(l.plage2_debut)} à ${fmtHeure(l.plage2_fin)}`;
}

function capitale(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Horaires groupes pour affichage. Fallback contenu.ts si non configure. */
export async function horairesBoutique(): Promise<LigneHoraire[]> {
  const supabase = clientLecture();
  if (!supabase) return [...HORAIRES_BOUTIQUE];

  const { data, error } = await supabase
    .from("horaire_boutique")
    .select("jour, plage1_debut, plage1_fin, plage2_debut, plage2_fin");
  if (error) {
    throw new Error(`[site ALM] Lecture des horaires boutique impossible : ${error.message}`);
  }
  if (!data || data.length === 0) return [...HORAIRES_BOUTIQUE];

  const parJour = new Map((data as LigneBrute[]).map((l) => [l.jour, l]));
  // Jour ABSENT de la table = traite comme ferme (defensif) — la fermeture
  // normale reste la ligne presente aux plages nulles.
  const heuresParJour = ORDRE_AFFICHAGE.map((j) => ({ jour: j, heures: fmtPlages(parJour.get(j)) }));

  // Regroupement des jours consecutifs (dans l'ordre d'affichage) identiques.
  const groupes: { jours: number[]; heures: string }[] = [];
  for (const { jour, heures } of heuresParJour) {
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.heures === heures) dernier.jours.push(jour);
    else groupes.push({ jours: [jour], heures });
  }

  return groupes.map((g) => {
    const noms = g.jours.map((j) => NOMS_JOURS[j]);
    const jours =
      noms.length === 1
        ? capitale(noms[0])
        : noms.length === 2
          ? capitale(`${noms[0]} et ${noms[1]}`)
          : capitale(`${noms[0]} à ${noms[noms.length - 1]}`);
    return { jours, heures: g.heures };
  });
}

export type OpeningSpec = {
  "@type": "OpeningHoursSpecification";
  dayOfWeek: string;
  opens: string;
  closes: string;
};

/**
 * openingHoursSpecification schema.org depuis les colonnes time BRUTES de
 * horaire_boutique (le helper d'affichage ne sort que du texte "9h à 13h").
 * Une plage = une specification. Jour ferme (plages nulles) = aucune spec.
 * Non configure / erreur / vide => [] (le JSON-LD OMET alors la propriete,
 * jamais d'horaire duplique en dur).
 */
export async function horairesBoutiqueSpec(): Promise<OpeningSpec[]> {
  const supabase = clientLecture();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("horaire_boutique")
    .select("jour, plage1_debut, plage1_fin, plage2_debut, plage2_fin");
  if (error || !data || data.length === 0) return [];

  const specs: OpeningSpec[] = [];
  const plage = (day: string, debut: string | null, fin: string | null) => {
    if (debut && fin) specs.push({ "@type": "OpeningHoursSpecification", dayOfWeek: day, opens: debut.slice(0, 5), closes: fin.slice(0, 5) });
  };
  for (const l of data as LigneBrute[]) {
    const day = JOURS_SCHEMA[l.jour];
    if (!day) continue;
    plage(day, l.plage1_debut, l.plage1_fin);
    plage(day, l.plage2_debut, l.plage2_fin);
  }
  return specs;
}
