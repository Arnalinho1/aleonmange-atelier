# Site public ALM — Architecture (Vague 1)

> Mise a jour : 2026-07-18 (Vague 1 verifiee avec les vraies lectures Supabase ; local, zero deploiement).
> Handoff de reference : `docs/handoff-site/` (relais, INTEGRATION.md V2, maquettes desktop/mobile autonomes, plan d'integration). Artefacts compiles, jamais edites.

## Monorepo

- `site/` a la racine = application Next.js AUTONOME (Next 16.2.10, React 19, Tailwind v4, TypeScript). Son propre `package.json` + lockfile (le repo n'a pas de workspaces) : `cd site && npm install`.
- Port dev : **3002** (3000 = Foodizy, 3001 = Atelier).
- Isolation de l'Atelier (verifiee, builds independants verts) : `tsconfig.json` racine exclut `site` ; `eslint.config.mjs` racine ignore `site/**` ; `site/next.config.ts` fixe `turbopack.root` (sinon Turbopack remonte au lockfile racine et compile le proxy de l'Atelier).
- Deploiement (hors Vague 1) : projet Vercel DISTINCT, Root Directory `site/`, production sur main. Prevoir un « Ignored Build Step » sur le projet Atelier pour qu'un push touchant seulement `site/` ne le rebuilde pas (et inversement).

## Acces aux donnees (regle de securite)

- L'acces anonyme a la base est INTEGRALEMENT BLOQUE, et il le reste. Aucune cle anon cote client, aucun acces client direct.
- Lectures publiques via `site/src/lib/supabase/serveur.ts` (`import "server-only"`) avec la cle **`SUPABASE_SERVICE_ROLE_KEY`** :
  - a coller MANUELLEMENT dans `site/.env.local` (modele : `site/.env.local.example`, avec `SUPABASE_URL`). Jamais tiree automatiquement, jamais commitee.
  - elle contourne toute RLS → SERVEUR UNIQUEMENT, jamais `NEXT_PUBLIC`, LECTURE SEULE par discipline en Vague 1 (aucun insert/update/delete dans `site/`).
  - cle absente → echec CLAIR : avertissement explicite dans les logs serveur + etats vides propres a l'ecran (pas de crash silencieux).
  - preuve a chaque livraison : `grep -r "service_role" site/.next/static/` = 0 fichier.
- Pages a donnees en ISR (`revalidate = 300`) : fraicheur du flag « aujourd'hui » (CALCULE : jour courant Europe/Paris vs `jour_semaine`, jamais stocke) et de la carte, performance mobile.

## Lectures de la Vague 1 (sources uniques Atelier)

| Donnee site | Source | Note |
|---|---|---|
| Cartes truck / traiteur / vitrine boutique | table `produit` (canal, actif) groupee par `categorie` | La MEME source que le pipeline de vente : les precommandes V2 refereceront ces `produit_id`. Descriptions/notes de famille : plan de migration ci-dessous |
| Emplacements truck | table `emplacement` (libelle, jour_semaine) | « Aujourd'hui » calcule ; lieu precis + horaire par emplacement : plan de migration |
| Horaires boutique, coordonnees | `site/src/lib/contenu.ts` (§06 du handoff, valeurs REELLES) | Provisoire-editable : table a venir |
| Annonces | AUCUNE surface dans la maquette | signale ; `social_post` disponible si un bloc actus est souhaite |

## Plan de migration referentiel (STOP semi-supervise — A SOUMETTRE, rien d'execute)

1. **Role Postgres LECTURE SEULE dedie au site** (`site_lecteur` : `GRANT SELECT` sur les seules tables lues — produit, emplacement, et les futures tables de contenu), destine a REMPLACER la service_role des la Vague 2 (les ecritures passeront par les routes API avec leur propre validation).
2. Contenu editable depuis « Reglages de l'atelier » : `produit.description` + `produit.visible_site` · `famille_carte` (canal, nom, note, ordre) · `emplacement.ville / lieu / horaire_service` · `horaire_boutique` · `creneau_retrait` (plage + pas configurables).
3. Vague 2 (ecritures) : `demande_devis`, `newsletter_abonne`, enum `source_vente` += `'web'`, etat `web_a_confirmer` (enum fulfillment), rapprochement client create-or-match (index uniques du socle client).

## Risques identifies pour les Vagues 2-3 (a traiter aux STOP migrations)

- `fulfillment` n'a pas d'etat `web_a_confirmer` et `source_vente` n'a pas `'web'` : migrations d'enum supervisees.
- « Commandes du jour » (Atelier) devra afficher et CONFIRMER/REFUSER les commandes web (garde-fou anti-abus V1 : la confirmation chef).
- Le RESERVE stock (B8) et le plan de production devront EXCLURE les commandes non confirmees (une commande en attente ne reserve pas de matiere).
- Une precommande B2C nait TOUJOURS `statut_paiement = 'regle'` avec reglement au retrait ; le `'du'` est reserve au canal traiteur B2B. Le critere est le CANAL.
- Cote client, le statut affiche est TOUJOURS « En attente de confirmation par l'atelier », jamais « validee ».
- Espace client / fidelite : INTERDITS avant la refonte RLS (policies actuelles `authenticated using(true)`). Le bouton « Mon compte » de la maquette est volontairement absent du site V1.

## Pieges connus

### Menu mobile plein ecran ecrase par le backdrop-filter du header
- **Symptome** : overlay `fixed inset-0` transparent, liens du menu illisibles par-dessus le contenu de la page (les styles calcules restent pourtant corrects : fond opaque, z-50).
- **Cause racine** : un `backdrop-filter` (classe `backdrop-blur` du `<header>`) fait de l'element le BLOC CONTENEUR de tout descendant `position: fixed` : l'overlay se dimensionne sur la boite du header (68px), le contenu deborde sans fond.
- **Fix** : l'overlay du menu est rendu HORS du `<header>` (fragment React dans EnTete.tsx, monte au niveau body via le layout).
- **Regle** : jamais de `fixed inset-0` a l'interieur d'un element portant `backdrop-filter`, `transform` ou `filter`. Verifier les overlays au PIXEL (capture), pas seulement au DOM : les styles calcules ne revelent pas ce piege.

### Cle service_role collee sur la ligne suivante dans .env.local
- **Symptome** : lectures Supabase desactivees (etats vides + avertissement serveur) alors que la cle semble presente dans le fichier.
- **Cause racine** : valeur collee sur la ligne SOUS `SUPABASE_SERVICE_ROLE_KEY=` : dotenv lit une valeur vide et ignore la ligne orpheline.
- **Fix / Regle** : la valeur doit etre sur la MEME ligne que le nom. Au demarrage, verifier l'absence de l'avertissement « Lectures Supabase DESACTIVEES » dans les logs serveur.

### E2E local : playwright-core sans navigateurs telecharges
- La racine du repo fournit `playwright-core` (pas de runner, pas de download auto) ; le cache `~/Library/Caches/ms-playwright` peut ne pas correspondre a la version. Lancer avec `chromium.launch({ channel: "chrome" })` pour utiliser le Chrome systeme, zero telechargement.

## Decisions business ouvertes (ne jamais trancher seul)

Creneaux click & collect (delai, cutoff, horizon) · horaires definitifs boutique · carte boutique reelle · affichage des conditions de reglement traiteur au prospect (le « Comment ca marche » affiche une etape « facturation » au libelle volontairement sobre) · contenus reels (photos — brief photo CD existant —, textes histoire, mentions legales : raison sociale, SIRET, hebergeur).
