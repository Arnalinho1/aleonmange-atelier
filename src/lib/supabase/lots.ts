/**
 * Requêtes `.in()` PAR LOTS. Au-delà d'une centaine d'UUID, l'URL PostgREST
 * dépasse la limite de longueur du proxy et la requête échoue — data vide,
 * sans erreur visible à l'écran. Révélé en production par le volume du jeu
 * de démonstration (732 ventes) : toute lecture « lignes des ventes X »
 * doit passer par ici dès que la liste d'ids suit le volume transactionnel.
 */
export async function enLots<T>(
  ids: string[],
  requete: (lot: string[]) => PromiseLike<{ data: T[] | null }>,
  taille = 100
): Promise<T[]> {
  const resultat: T[] = [];
  for (let i = 0; i < ids.length; i += taille) {
    const { data } = await requete(ids.slice(i, i + taille));
    resultat.push(...(data ?? []));
  }
  return resultat;
}
