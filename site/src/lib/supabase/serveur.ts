import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase du site — SERVEUR UNIQUEMENT (import "server-only" fait
 * echouer toute importation cote client au build).
 *
 * L'acces anonyme a la base est integralement bloque (et le reste) : les
 * lectures publiques passent par le role Postgres site_lecteur (migration
 * 0019), lecture seule garantie par la base elle-meme (grants limites a
 * produit + emplacement, RLS active, ecritures refusees 42501).
 * Mecanique a deux en-tetes, verifiee le 2026-07-18 :
 *  - la passerelle API n'accepte en `apikey` que les cles enregistrees du
 *    projet → la cle anon sert de ticket de passerelle (ZERO grant, zero
 *    policy : seule, elle ne lit rien) ;
 *  - PostgREST endosse le role du `Authorization: Bearer` → JWT site_lecteur
 *    (frappe et rotation : docs/site/ARCHITECTURE.md, exp explicite 10 ans).
 * Discipline inchangee : jamais NEXT_PUBLIC, jamais expose au client
 * (verifie par grep du bundle a chaque livraison).
 */

const URL_SUPABASE = process.env.SUPABASE_URL ?? "";
const CLE_PASSERELLE = process.env.SUPABASE_ANON_KEY ?? "";
const JWT_LECTURE = process.env.SUPABASE_SITE_LECTEUR_JWT ?? "";

export function lecturesConfigurees(): boolean {
  return URL_SUPABASE.length > 0 && CLE_PASSERELLE.length > 0 && JWT_LECTURE.length > 0;
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
        "[site ALM] Lectures Supabase DESACTIVEES : SUPABASE_URL, " +
          "SUPABASE_ANON_KEY ou SUPABASE_SITE_LECTEUR_JWT absente. Renseignez " +
          "site/.env.local (modele : site/.env.local.example). Les pages affichent leurs etats vides."
      );
    }
    return null;
  }
  return createClient(URL_SUPABASE, CLE_PASSERELLE, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${JWT_LECTURE}` } },
  });
}
