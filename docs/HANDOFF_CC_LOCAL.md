# Reprise de projet — Atelier ALM (À Léon Mange)

Tu prends le relais sur une réimplémentation **Next.js + Supabase** déjà bien avancée.
Une session précédente a fait les fondations ; tu deviens le **pilote unique** car toi
seul peux tester contre la vraie base Supabase (accès réseau OK en local).

## 0. AVANT TOUTE LIGNE DE CODE — lis ces documents (ils font autorité)
Dans cet ordre, intégralement :
1. `handoff/README.md`
2. `handoff/HANDOFF.md`  (§02 = spec écran par écran + états vides ; §05-06 = points ouverts)
3. `handoff/ALM - Handoff CC - Contrat de données Vente.dc.html`  (schéma Vente, enums figés)
4. `docs/PLAN.md`  (plan d'exécution : schéma, ordre des écrans, décisions)
5. `handoff/MOCKUP_DIGEST.md`  (référence VISUELLE des 17 écrans — recréer au pixel près,
   NE PAS porter le runtime `support.js`)

En cas de doute, ces docs priment sur ton intuition. Si un doute persiste : signale-le,
ne tranche pas seul (voir §7).

## 1. Contexte produit (résumé)
L'**Atelier** = back-office interne d'ALM (traiteur/food truck/boutique du Beaujolais),
desktop, ~17 écrans, dashboard d'accueil. PAS une boutique en ligne.
**3 canaux** structurent tout : `truck` (3 emplacements réels éditables : oingt/tassin/
salvagny), `boutique` (comptoir + click&collect), `traiteur` (précommande).
Axe transversal `fulfillment` : vente **instantanée** (→ `remis`) vs **commande à
produire** (→ `a_produire`…). C'est le `mode_vente` saisi (pas le canal) qui dérive
le `fulfillment`.

## 2. État d'avancement
**Phase 0 (faite)** : schéma SQL (`supabase/migrations/0001→0005`), RLS activée, seed
minimal (3 emplacements + owner via trigger), shell (sidebar/topbar), design tokens
(thème Tailwind v4 dans `src/app/globals.css`), composants partagés
(`src/components/ui/*` : EmptyState, ChanFilter, KpiCard, Badge, Card, ScreenHeader),
clients Supabase (`src/lib/supabase/*`), 17 écrans navigables avec **états vides**.

**Phase 1 (commencée)** : auth (`src/app/login/*`, `src/lib/supabase/middleware.ts`),
catalogue avec drawer « Nouveau produit » qui écrit en base
(`src/app/(app)/catalog/*`).

## 3. Bug critique déjà identifié — à finaliser EN PREMIER
Les nouveaux projets Supabase ne font plus de `GRANT` par défaut sur le schéma `public`
→ erreur `42501 permission denied` même avec la RLS correcte (RLS filtre les lignes,
GRANT donne le privilège table — il faut les deux).
Fichier `supabase/migrations/0006_grants.sql` a été préparé. Contenu attendu :

```sql
grant usage on schema public to authenticated, service_role;
grant all on all tables    in schema public to authenticated, service_role;
grant all on all sequences in schema public to authenticated, service_role;
grant all on all functions in schema public to authenticated, service_role;
alter default privileges in schema public grant all on tables    to authenticated, service_role;
alter default privileges in schema public grant all on sequences to authenticated, service_role;
alter default privileges in schema public grant all on functions to authenticated, service_role;
-- anon : rien (les policies RLS ne visent que 'authenticated').
```

→ Exécute-le dans le **SQL Editor** Supabase, puis crée un user dans
Authentication → Users pour tester le login.

## 4. Vérifie ces deux points tout de suite
- **`src/middleware.ts`** (wiring racine de la protection des routes) doit exister et
  être commité. S'il manque, `/dashboard` est accessible sans login. La logique est dans
  `src/lib/supabase/middleware.ts` (redirige les non-connectés vers `/login`).
- **Commit + push** tout ce qui est en attente en local (`0006_grants.sql`, `schema.sql`
  à jour, `src/middleware.ts`) pour que la branche soit la source de vérité unique.

## 5. Stack & conventions à respecter
- **Next.js 16 App Router**, React 19, **Tailwind v4** (thème via `@theme` dans
  `globals.css`, PAS de `tailwind.config`). Polices : Bricolage Grotesque (display),
  Hanken Grotesk (corps), Spline Sans Mono (labels).
- **Supabase** via `@supabase/ssr` : client navigateur `src/lib/supabase/client.ts`,
  serveur `src/lib/supabase/server.ts`. Garde `isSupabaseConfigured()` : l'app ne doit
  jamais planter sans clés.
- **Écritures = Server Actions** (`"use server"`, ex. `catalog/actions.ts`) + `revalidatePath`.
- **Types** : `src/lib/supabase/database.types.ts`, écrits à la main en `type` (PAS
  `interface` — postgrest-js exige une signature d'index, sinon l'`Insert` casse en `never`).
- **Libellés FR** côté front seulement ; les **clés d'enum** stockées restent inchangées
  (`src/lib/nav.ts` porte les maps de libellés/couleurs).
- Fidélité visuelle **hi-fi** : reproduire les écrans de `MOCKUP_DIGEST.md` fidèlement.

## 6. RÈGLES NON NÉGOCIABLES (les violer = échec)
- **Modèle, pas contenu** : AUCUN seed de démo (ni produits, ni ventes, ni stock). Seul
  seed autorisé : enums + 3 emplacements réels + compte owner. Le catalogue et le
  transactionnel **naissent vides**.
- **Emplacements** : table de référentiel **éditable** à **FK** (jamais un enum). On ne
  SUPPRIME jamais un référentiel (emplacement/produit/client) → **soft delete `actif=false`**.
- **2 modes de tarification** seulement : `unite` et `poids`. Pas de `portion`, pas de
  taille S/M/L. Le bowl se vend à l'unité mais reste **composé** (déplié en composants).
- **Sources uniques** (un calcul, plusieurs vues) :
  - CA compté **une seule fois** sur `fulfillment='remis'` via la vue `v_vente_remise` ;
    Historique ET Finances lisent cette même source.
  - Commandes du jour = `v_commande_ouverte` (précommandes non remises).
  - Insights = **une** table `insight` ; le dashboard lit le même jeu, `.slice(0,3)`,
    même tri urgence→impact. Zéro logique parallèle.
  - Marges nommées distinctement : « brute matière » (prix − coût matière) vs « nette »
    (après charges). Jamais le même libellé pour deux calculs.
  - Composant lu par son `id`, jamais par canal (recouvrement catalogue voulu).
- **`occurred_at`** : capturé à l'encaissement, fuseau **Europe/Paris**, JAMAIS dérivé de
  `created_at`. Toute l'analytique temporelle lit `occurred_at`.
- **États vides** : chaque écran gère l'absence de données proprement — jamais de `NaN`,
  `0/0`, ni graphe cassé. Voir les libellés attendus dans HANDOFF §02.
- **CTA réels** : encaisser, créer un produit, avancer un fulfillment, importer → écrivent
  VRAIMENT en base. Pas de toasts de démo.
- **RLS activée dès la création** de toute nouvelle table. `service_role` serveur uniquement.

## 7. POINTS OUVERTS — NE PAS trancher seul, signaler à Arnaud
1. **Import caisse** : mapping CSV + déduction de mode = **provisoires**. Garder le mapping
   **configurable**, marquer les lignes au mode déduit « à confirmer », exclure les lignes
   inconnues. Aucun parseur figé.
2. **Règles des insights + seuils d'alerte** (stock, DLC) : poser structure + état vide,
   ne PAS figer les règles.
3. **Modèle de rôles/permissions par écran** : bootstrap owner+équipe ; modèle fin à préciser.
4. **Périmètre du référentiel social** : squelette seulement.
5. **Matérialisation de la recette virtuelle du bowl** : reco = une recette virtuelle par
   bowl signature (compositions libres dépliées sans parent) — à confirmer.

## 8. Ordre de travail (dépendances d'abord)
Finir **Phase 1 — référentiel** (l'entrée du vrai contenu, tout l'aval en dépend) :
`catalog` (fini, à tester en écriture) → `recipes` (fiches techniques + composants) →
**emplacements éditables** (Réglages : ajouter/renommer/désactiver) → `clients` → `users`.

Puis **Phase 2 — cœur** : `sale` (source de vérité : écrit vente+lignes, `occurred_at`,
dérive `fulfillment`) → `orders` (avance le fulfillment) → `history`.

Puis **Phase 3** (dashboard, insight, finance, sales, productivity) →
**Phase 4** (stock, haccp, prod) → **Phase 5** (notifs, import, commu).

## 9. Discipline de vérification (à chaque incrément)
- `npm run lint`, le typecheck (via `npm run build`) et le build doivent **passer**.
- Teste les CTA en **vrai** : crée un produit, recharge, vérifie qu'il est en base et
  s'affiche. Idem pour chaque écriture. Ne te contente pas du rendu.
- Vérifie l'**état vide** de chaque écran (base vide) ET l'état rempli.
- L'app tourne en local sur `http://localhost:3001` (le port 3000 traîne parfois un vieux
  process sans variables d'env — tue-le si besoin). `.env.local` contient
  `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (gitignored).

## 10. Git
Branche de travail : **`claude/project-launch-hadufi`**. Commits clairs et fréquents,
push régulier (source de vérité unique). Ne crée pas de PR sauf demande explicite d'Arnaud.

---

**Commence par** : lire les docs du §0, appliquer le GRANT (§3), vérifier `src/middleware.ts`
(§4), tester une écriture catalogue, puis enchaîner l'ordre du §8. Signale tout point
ouvert (§7) au lieu de deviner.
