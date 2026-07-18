import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase du site — SERVEUR UNIQUEMENT (import "server-only" fait
 * echouer toute importation cote client au build).
 *
 * L'acces anonyme a la base est integralement bloque (et le reste) : les
 * lectures publiques passent par la cle service_role, qui contourne toute
 * RLS. Discipline stricte :
 *  - jamais NEXT_PUBLIC, jamais exposee au client (verifie par grep du
 *    bundle a chaque livraison) ;
 *  - LECTURE SEULE en Vague 1 (aucun .insert/.update/.delete dans site/) ;
 *  - remplacee par un role Postgres lecture seule dedie au site des la
 *    Vague 2 (plan de migration, cf. docs/site/ARCHITECTURE.md).
 */

const URL_SUPABASE = process.env.SUPABASE_URL ?? "";
const CLE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function lecturesConfigurees(): boolean {
  return URL_SUPABASE.length > 0 && CLE_SERVICE.length > 0;
}

let avertissementEmis = false;

/**
 * Retourne le client de lecture, ou null avec un avertissement CLAIR dans
 * les logs serveur si la configuration manque (pas de crash silencieux :
 * les pages affichent alors leurs etats vides).
 */
export function clientLecture(): SupabaseClient | null {
  if (!lecturesConfigurees()) {
    if (!avertissementEmis) {
      avertissementEmis = true;
      console.warn(
        "[site ALM] Lectures Supabase DESACTIVEES : SUPABASE_URL ou " +
          "SUPABASE_SERVICE_ROLE_KEY absente. Renseignez site/.env.local " +
          "(modele : site/.env.local.example). Les pages affichent leurs etats vides."
      );
    }
    return null;
  }
  return createClient(URL_SUPABASE, CLE_SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
