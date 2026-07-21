/**
 * Progression du guide d'onboarding — INTERFACE UNIQUE de persistance
 * (contrat maquette v2) : tout passe par loadProgress() / saveProgress().
 * Clé localStorage `alm_guide_progress` ; si le stockage est indisponible
 * (mode privé, quota), repli mémoire silencieux : le guide fonctionne, la
 * progression ne survit juste pas au rechargement. AUCUN appel localStorage
 * ailleurs dans l'app. Le flag « toast vu » vit en sessionStorage, HORS de
 * cette clé (portée session voulue).
 */

export type EtatChapitre = "a_faire" | "fait" | "a_revoir";

/** Progression par numéro de chapitre (1-7). Clé absente = à faire. */
export type Progression = Partial<Record<number, EtatChapitre>>;

const CLE = "alm_guide_progress";
const ETATS: readonly string[] = ["a_faire", "fait", "a_revoir"];

/** Repli mémoire quand localStorage est indisponible. */
let memoire: Progression = {};

export function loadProgress(): Progression {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return { ...memoire };
    const parse: unknown = JSON.parse(brut);
    if (typeof parse !== "object" || parse === null) return { ...memoire };
    const propre: Progression = {};
    for (const [k, v] of Object.entries(parse)) {
      const num = Number(k);
      if (Number.isInteger(num) && num >= 1 && num <= 7 && typeof v === "string" && ETATS.includes(v)) {
        propre[num] = v as EtatChapitre;
      }
    }
    return propre;
  } catch {
    return { ...memoire };
  }
}

export function saveProgress(chapitre: number, etat: EtatChapitre): Progression {
  const suivant: Progression = { ...loadProgress(), [chapitre]: etat };
  memoire = suivant;
  try {
    localStorage.setItem(CLE, JSON.stringify(suivant));
  } catch {
    // Repli mémoire déjà à jour — dégradation silencieuse (mode privé/quota).
  }
  return suivant;
}
