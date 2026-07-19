import "server-only";

/**
 * Rate limiting BASIQUE en memoire, par IP + cle de route (fenetre glissante).
 * Best-effort : l'etat vit dans le process et se remet a zero au cold start
 * serverless — suffisant pour decourager les abus simples, pas une protection
 * forte (une vraie limite viendrait d'un compteur partage ou du firewall Vercel).
 */

const fenetres = new Map<string, number[]>();

/** true = autorise, false = trop de requetes. Defaut : 5 requetes / 60 s. */
export function autorise(cle: string, max = 5, fenetreMs = 60_000): boolean {
  const maintenant = Date.now();
  const debut = maintenant - fenetreMs;
  const horodatages = (fenetres.get(cle) ?? []).filter((t) => t > debut);
  if (horodatages.length >= max) {
    fenetres.set(cle, horodatages);
    return false;
  }
  horodatages.push(maintenant);
  fenetres.set(cle, horodatages);
  return true;
}

/** IP de l'appelant depuis les en-tetes de la requete (best-effort). */
export function ipDe(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "inconnue";
}
