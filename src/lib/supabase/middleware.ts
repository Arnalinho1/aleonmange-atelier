import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

/**
 * Rafraîchit la session Supabase à chaque requête et protège les routes de
 * l'app. Si Supabase n'est pas configuré (pas de clés), on laisse passer :
 * l'app démarre sans planter et affiche ses états vides / la page de connexion.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

  // Rafraichit la session ET lit le claim d'autorisation. getClaims() est la
  // methode recommandee cote serveur (refresh + claims verifies). Le claim
  // app_role=equipe est pose par le hook depuis la table profil (0034/0040) :
  // c'est la MEME source de verite que est_chef() cote base. Peut echouer si le
  // reseau Supabase est indisponible -> traite comme non connecte (pas de crash).
  let claims: Record<string, unknown> | null = null;
  try {
    const res = await supabase.auth.getClaims();
    claims = (res.data?.claims as Record<string, unknown> | undefined) ?? null;
  } catch {
    claims = null;
  }
  const connecte = Boolean(claims);
  const estEquipe = claims?.app_role === "equipe";

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/auth");

  // Non connecte hors des routes d'auth -> /login.
  if (!connecte && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Connecte MAIS pas equipe (ex : compte client du site public) -> deconnexion
  // + retour login. L'Atelier est RESERVE a l'equipe : un compte sans claim
  // app_role=equipe est REJETE au niveau applicatif (pas seulement prive de
  // donnees par la RLS). On revoque la session et on efface les cookies auth.
  if (connecte && !estEquipe && !isAuthRoute) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const redir = NextResponse.redirect(url);
    request.cookies.getAll().forEach((c) => {
      if (c.name.startsWith("sb-")) redir.cookies.delete(c.name);
    });
    return redir;
  }

  // Deja equipe sur /login -> tableau de bord.
  if (estEquipe && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
