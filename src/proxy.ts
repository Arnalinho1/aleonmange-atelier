import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Proxy (ex-middleware Next) : rafraîchit la session et protège les routes. */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf les assets statiques et images.
     */
    "/((?!_next/static|_next/image|favicon.ico|alm-mark.png|alm-logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
