# Guide d'onboarding de l'Atelier — mapping et contrats

Chantier Lot A (branche `claude/atelier-guide-v1`). Maquette de référence :
`docs/handoffs/inauguration-onboarding/atelier-onboarding.html` (v2) +
`INTEGRATION_INAUGURATION.md`. Le cadrage d'Arnaud prévaut sur le .md
(notamment la règle prod du chapitre 2, voir plus bas).

## Architecture

- `src/components/guide/progress.ts` — interface UNIQUE de persistance
  (`loadProgress` / `saveProgress`), clé localStorage `alm_guide_progress`,
  repli mémoire silencieux (mode privé/quota). Flag « toast vu » en
  sessionStorage `alm_guide_toast` (portée session), HORS de la clé.
- `src/components/guide/Spotlight.tsx` — grammaire spotlight COMMUNE
  (trou box-shadow `0 0 0 9999px rgba(9,38,48,.72)`, padding 10, radius 16,
  transition 0,5 s, carte basse `min(440px,92vw)`, « Passer » permanent,
  re-mesure resize/scroll/boucle 300 ms, fallback plein écran). AUTONOME :
  à DUPLIQUER tel quel côté `site/` pour la cérémonie (Lot B) — apps
  isolées, pas d'import partagé (même idiome que les modules email).
- `src/components/guide/chapitres.ts` — textes verbatim + sélecteurs réels.
- `src/components/guide/GuideOverlay.tsx` — hub, chapitres, clôture B7
  (badge « Atelier apprivoisé », confettis ~3,2 s). Chargé en lazy
  (`next/dynamic`, `ssr:false`) : zéro impact hors usage.
- `src/components/guide/GuideContext.tsx` — provider léger monté dans
  `AppShell` : entrée de menu « Guide · X% » (via `useGuide`, Sidebar),
  icône « ? » par module, toast, deeplink.

## Mapping des cibles (maquette -> réel)

| Maquette (`data-g`) | Réel | Fichier |
|---|---|---|
| `nav` | `<nav data-g="nav">` | `src/components/shell/Sidebar.tsx` |
| `nav-activite` | groupe `data-g="nav-<slug du titre>"` | idem |
| `nav-cmd` | item `data-g="nav-orders"` (« Commandes du jour ») | idem (`data-g="nav-<item.id>"` sur chaque item) |
| `cmd-fondatrice` | 1re commande web en attente | `orders/WebAConfirmer.tsx` |
| `cmd-statut` | rangée statut de cette commande | idem |
| `cmd-confirmer` | bouton « Confirmer » de cette commande | idem |
| `prod-plan` | carte « Plan de production du jour » | `prod/ProdBoard.tsx` |
| `prod-ligne` | lignes du plan (1re ligne ciblée) | idem |
| `saisie-canaux` | onglets canal | `sale/SaleComposer.tsx` |
| `saisie-fidelite` | carte Client (rattachement fidélité) | idem |
| `saisie-express` -> `saisie-encaisser` | bouton « Encaisser » | idem |
| `ana-ca` | grille KPI (CA facturé/encaissé, marges) | `finance/FinanceBoard.tsx` |
| `ana-marge` | carte « CA & marge nette par plat » | idem |
| (ligne magret) | `ana-marge-row` + match texte « Bowl poulet » | idem |
| `ana-ia` | item de menu `nav-insight` (« Insight stratégique ») | Sidebar |
| `cli-fiche` | carte « Fiches clients » | `clients/ClientsManager.tsx` |
| `cli-facture` | item de menu `nav-finance` (« Finances ») | Sidebar |
| (fiche Marie L.) | `cli-row` + match « Marie » + inner crayon « Éditer la fiche » | `clients/ClientsManager.tsx` |
| `nav-guide` | entrée « Guide · X% » (pied de sidebar) | Sidebar |

Résolution d'une cible : `sel` (querySelectorAll) + `contains` (filtre texte)
+ `inner` (descendant). Introuvable -> spotlight plein écran, jamais d'erreur.

## Chapitres et micro-actions (règles PROD)

| Chap | Écran | Micro-action | Écriture |
|---|---|---|---|
| B1 | `/dashboard` | clic réel « Commandes du jour » au menu | aucune |
| B2 | `/orders` | clic « Confirmer » d'une commande EN ATTENTE réelle | `confirmerCommandeWeb` (parcours existant) |
| B3 | `/prod` | clic sur une ligne du plan du jour | aucune |
| B4 | `/sale` | vente préremplie (Lasagnes (part), truck, 8,50 €) puis « Encaisser » | `createVente` (parcours existant, VRAIE vente) |
| B5 | `/finance` | clic sur la ligne « Bowl poulet » de la table des marges | aucune |
| B6 | `/clients` | ouvrir la fiche Marie Lambert (crayon -> drawer) | aucune |
| B7 | — | clôture (badge + confettis + récap) | aucune |

- RÈGLE PROD (prévaut sur l'astuce « reset » du .md, comportement de maquette
  uniquement) : on ne remet JAMAIS une commande confirmée « en attente ».
  Cible de micro-action absente -> MODE DÉMONSTRATION : spotlight simple,
  bouton « Suivant », note discrète, AUCUNE écriture. Fin de chapitre = `fait`.
- B4 : préremplissage par `CustomEvent("alm:guide:prefill-vente")` (état
  contrôlé de `SaleComposer` : canal, panier, emplacement du jour) ; réussite
  = `CustomEvent("alm:guide:vente-ok")` émis APRÈS un `createVente` réussi
  (jamais sur simple clic).
- Réussite -> coche verte + « C'est fait. » + Continuer -> `fait`.
  « Passer » en cours -> `a_revoir` (sauf si déjà `fait`).
- Mobile (<1024 px) : les étapes qui ciblent le menu portent `drawer: true`
  -> le guide ouvre le drawer (état AppShell), le referme en sortant.

## Aide contextuelle « ? »

Icône 34 px (contour canard, fixe en haut à droite, toujours visible) sur les
modules couverts. Mapping (`CHAPITRE_PAR_ROUTE`) : `/dashboard`→B1,
`/orders`→B2, `/prod`→B3, `/sale`→B4, `/sales` + `/insight` + `/finance`→B5,
`/clients`→B6. Chapitre lancé via « ? » : à la fin, retour AU MODULE (pas au
hub). Écart assumé vs cadrage (« clients/finances=B6 ») : `/finance` pointe B5
car la micro-action marge s'y joue (découle de l'arbitrage B5 sur /finance).

## Ouverture (3 contextes) et deeplink

1. `?guide=1` -> hub auto + nettoyage du param (`history.replaceState`).
   CONTRAT D'URL FIGÉ : cible du CTA « Découvrir votre Atelier » de la
   cérémonie (Lot B) et de l'email chefs.
2. Sans param + progression vide -> toast « Envie d'une visite guidée de
   votre Atelier ? » (Oui / Plus tard ; refus mémorisé en sessionStorage).
3. Progression existante -> rien d'automatique (menu Guide + icônes « ? »).

Préservation du deeplink à travers l'auth (flag booléen WHITELISTÉ, jamais
d'URL de redirection fournie par le client) :
- `src/app/page.tsx` : `/` reporte `?guide=1` sur `/dashboard`.
- `src/lib/supabase/middleware.ts` : équipe déjà connectée sur `/login?guide=1`
  -> `/dashboard?guide=1` (le redirect non-connecté préservait déjà la query).
- `/login` : input hidden `guide` -> `signIn` redirige `/{accueil}?guide=1`.

## Adaptations aux données réelles (validées au STOP état des lieux)

- B4 : « Lasagnes, 6,50 € » -> « Lasagnes (part) », truck, **8,50 €** (réel).
- B5 : « magret sauce miel » -> **« Bowl poulet »** (le magret n'existe qu'en
  brouillon traiteur importé : 0 vente, pas de recette, absent des marges) ;
  chapitre joué sur `/finance` ; étape IA re-ciblée sur le menu Insight.
- B6 : « Marie L. » = **Marie Lambert** (fiche réelle) ; étape « On facture »
  re-ciblée sur le menu Finances (le statut de paiement se suit sur /finance).
- B3 (signalé au STOP Lot A, découvert à l'implémentation) : le vrai écran
  Production est un plan PAR PRODUIT (prévision 7 j), pas une liste de
  commandes -> micro-action adaptée « cliquez sur sa ligne » dans le plan.
- NB copie : les montants (8,50 €) sont figés dans le texte du chapitre ; si
  le prix du produit change, mettre à jour `chapitres.ts`.
