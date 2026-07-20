import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase de la SESSION CLIENT authentifiee (espace client, Vague 4).
 * SERVEUR UNIQUEMENT (import "server-only").
 *
 * Contrairement a serveur.ts (role technique site_lecteur) et ecrivain.ts
 * (site_ecrivain), ce client porte le JETON DU CLIENT CONNECTE (cookies gered
 * par @supabase/ssr). La RLS (0035/0036) le cadre a SES SEULES donnees : il
 * n'accede jamais aux tables internes (est_chef() = false pour un client). On
 * reutilise SUPABASE_URL + SUPABASE_ANON_KEY (deja presentes, server-only) :
 * la cle anon sert de ticket de passerelle, le role effectif est porte par le
 * Bearer du cookie de session. Aucun nouveau secret, jamais NEXT_PUBLIC.
 */

const URL_SUPABASE = process.env.SUPABASE_URL ?? "";
const CLE_ANON = process.env.SUPABASE_ANON_KEY ?? "";

export function authConfiguree(): boolean {
  return URL_SUPABASE.length > 0 && CLE_ANON.length > 0;
}

/** Client lie a la session (RSC, Server Actions, Route Handlers). */
export async function clientSession() {
  const cookieStore = await cookies();
  return createServerClient(URL_SUPABASE, CLE_ANON, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Appele depuis un Server Component : ecriture cookie interdite ici,
          // le proxy (rafraichirSession) se charge du rafraichissement.
        }
      },
    },
  });
}
