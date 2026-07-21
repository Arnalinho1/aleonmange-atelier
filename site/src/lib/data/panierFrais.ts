import { clientLecture } from "@/lib/supabase/serveur";

/**
 * Flag de pilotage du bloc « Panier frais » (teasing) sur /boutique.
 * Config-source : lu dans le singleton parametre_site (jamais un booleen code en dur),
 * togglable depuis l'Atelier (Reglages). Lecture SSR via site_lecteur (0043 : site_lecteur
 * lit le flag, jamais les intentions). Fallback STRICT false : sans config, le bloc n'apparait
 * pas (aucune regression sur la vitrine).
 */
export async function panierFraisTeasingActif(): Promise<boolean> {
  const supabase = clientLecture();
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("parametre_site")
    .select("panier_frais_teasing_actif")
    .maybeSingle();
  if (error || !data) return false;
  return data.panier_frais_teasing_actif === true;
}
