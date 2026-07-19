import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase d'ECRITURE du site — SERVEUR UNIQUEMENT (import "server-only").
 *
 * Role `site_ecrivain` (migration 0030) : AUCUN droit sur les tables, seulement
 * EXECUTE sur 4 fonctions SECURITY DEFINER vetees. Ce client n'appelle donc QUE
 * des RPC (`.rpc(...)`), jamais `.from().insert()`. Meme passerelle a deux en-tetes
 * que la lecture (cf. serveur.ts) :
 *  - `apikey` = cle anon (ticket de passerelle, zero droit) ;
 *  - `Authorization: Bearer` = JWT site_ecrivain (le role effectif).
 * Discipline inchangee : jamais NEXT_PUBLIC, jamais commite, grep du bundle.
 */

const URL_SUPABASE = process.env.SUPABASE_URL ?? "";
const CLE_PASSERELLE = process.env.SUPABASE_ANON_KEY ?? "";
const JWT_ECRITURE = process.env.SUPABASE_SITE_ECRIVAIN_JWT ?? "";

export function ecrituresConfigurees(): boolean {
  return URL_SUPABASE.length > 0 && CLE_PASSERELLE.length > 0 && JWT_ECRITURE.length > 0;
}

let avertissementEmis = false;

/**
 * Retourne le client d'ecriture, ou null avec un avertissement CLAIR dans les
 * logs serveur si la configuration manque (les routes repondent alors une erreur
 * propre, jamais un crash silencieux).
 */
export function clientEcriture(): SupabaseClient | null {
  if (!ecrituresConfigurees()) {
    if (!avertissementEmis) {
      avertissementEmis = true;
      console.warn(
        "[site ALM] Ecritures Supabase DESACTIVEES : SUPABASE_URL, SUPABASE_ANON_KEY " +
          "ou SUPABASE_SITE_ECRIVAIN_JWT absente. Renseignez site/.env.local. Les routes " +
          "d'ecriture repondent une erreur de configuration."
      );
    }
    return null;
  }
  return createClient(URL_SUPABASE, CLE_PASSERELLE, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${JWT_ECRITURE}` } },
  });
}
