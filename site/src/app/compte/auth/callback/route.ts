import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { clientSession } from "@/lib/supabase/session";

/**
 * Callback de confirmation d'e-mail (Vague 4). Supabase renvoie soit ?code=
 * (flux PKCE, template par defaut via emailRedirectTo) soit ?token_hash=&type=
 * (flux verifyOtp, template personnalise). On gere LES DEUX pour ne pas
 * dependre de la config du template.
 *
 * Une fois la session etablie :
 *  1. rattachement au socle client (web_rattacher_compte_client, 0039) par
 *     l'email VERIFIE du compte (jamais un email saisi) ;
 *  2. si l'opt-in fidelite a ete coche a l'inscription (metadata), on le pose
 *     date (web_maj_profil_client, non retroactif).
 * Ces deux appels sont best-effort : /compte les reprend (rattachement
 * idempotent) si l'un echoue.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");
  const destination = next && next.startsWith("/") ? next : "/compte";

  const supabase = await clientSession();
  let ok = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  }

  if (!ok) {
    return NextResponse.redirect(`${origin}/compte/connexion?erreur=lien`);
  }

  try {
    await supabase.rpc("web_rattacher_compte_client");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.user_metadata?.fidelite_opt_in === true) {
      await supabase.rpc("web_maj_profil_client", { p_fidelite_opt_in: true });
    }
  } catch {
    // best-effort : /compte reprend le rattachement (idempotent).
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
