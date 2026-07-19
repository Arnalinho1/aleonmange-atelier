/**
 * Contenu editorial du site — coordonnees REELLES du handoff
 * (docs/handoff-site/INTEGRATION.md §06, « a reprendre telles quelles »).
 *
 * PROVISOIRE-EDITABLE : les horaires et le libelle de service truck ont
 * vocation a devenir des tables pilotees depuis l'Atelier (plan de migration
 * de fin de vague, cf. docs/site/ARCHITECTURE.md). Aucun contenu de la
 * maquette (produits, prix, textes de demonstration) n'est repris ici.
 */

export const COORDONNEES = {
  nom: "A Léon Mange",
  adresse: "1923 route de la vallée, 69620 Létra",
  region: "Beaujolais",
  telephone: "06 75 36 23 26",
  telephoneLien: "+33675362326",
  email: "contact@aleonmange.com",
  instagram: "https://www.instagram.com/aleonmange/",
  facebook: "https://www.facebook.com/aleonmange",
  plan: "https://www.google.com/maps/dir/?api=1&destination=1923+route+de+la+vall%C3%A9e+69620+L%C3%A9tra",
} as const;

/** Horaires reels de la boutique (§06) — table editable a venir. */
export const HORAIRES_BOUTIQUE = [
  { jours: "Mardi à vendredi", heures: "9h à 13h · 15h à 19h" },
  { jours: "Samedi", heures: "9h à 14h" },
  { jours: "Dimanche et lundi", heures: "Fermé" },
] as const;

/** Amplitude de service truck par defaut — provisoire, editable a venir. */
export const HORAIRE_SERVICE_TRUCK = "11h30 à 14h";

/** Les deux chefs — contexte reel (relais §1). */
export const CHEFS = "Audrey Depouilly et Victorien Thebault";
