import type { NextRequest } from "next/server";
import { rafraichirSession } from "@/lib/supabase/middleware";

/**
 * Proxy (Next 16 : ex-middleware). Rafraichit la session Supabase et protege
 * l'espace client. Le matcher le cadre STRICTEMENT a /compte : la vitrine
 * publique (Vagues 1-3, EN PRODUCTION) n'est jamais interceptee -> zero risque
 * pour l'existant, zero surcout sur les pages publiques.
 */
export async function proxy(request: NextRequest) {
  return rafraichirSession(request);
}

export const config = {
  matcher: ["/compte/:path*"],
};
