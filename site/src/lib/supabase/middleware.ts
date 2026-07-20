import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Rafraichit la session Supabase et protege l'espace client (/compte).
 * Appele par le proxy (Next 16). Cadre STRICTEMENT a /compte via le matcher :
 * la vitrine publique (Vagues 1-3) n'est jamais touchee.
 *
 * Regle de securite (doc Next/Supabase) : on ne fait JAMAIS confiance a
 * getSession() cote serveur ; getUser() revalide le jeton aupres du serveur
 * d'auth. Le proxy est une garde OPTIMISTE : chaque Server Action et chaque
 * page re-verifient l'auth de leur cote (les RPC 0039 sont self-scope auth.uid()).
 */

const URL_SUPABASE = process.env.SUPABASE_URL ?? "";
const CLE_ANON = process.env.SUPABASE_ANON_KEY ?? "";

export async function rafraichirSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Auth non configuree -> on laisse passer (l'app ne plante pas ; les pages
  // /compte afficheront leur etat "indisponible").
  if (!URL_SUPABASE || !CLE_ANON) return response;

  const supabase = createServerClient(URL_SUPABASE, CLE_ANON, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser peut echouer si le reseau vers Supabase est indisponible : on ne
  // fait pas planter, on traite comme non connecte.
  let connecte = false;
  try {
    const { data } = await supabase.auth.getUser();
    connecte = Boolean(data.user);
  } catch {
    connecte = false;
  }

  const path = request.nextUrl.pathname;
  // Routes ouvertes de l'espace : la connexion/creation et le callback d'auth.
  const routeOuverte =
    path.startsWith("/compte/connexion") || path.startsWith("/compte/auth");

  // Non connecte sur une page protegee de /compte -> vers la connexion.
  if (!connecte && !routeOuverte) {
    const url = request.nextUrl.clone();
    url.pathname = "/compte/connexion";
    return NextResponse.redirect(url);
  }
  // Deja connecte sur la page de connexion -> vers le tableau de bord.
  if (connecte && path.startsWith("/compte/connexion")) {
    const url = request.nextUrl.clone();
    url.pathname = "/compte";
    return NextResponse.redirect(url);
  }

  return response;
}
