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
- Cible approuvee (migration 0019, APPLIQUEE le 2026-07-18) : role Postgres `site_lecteur` NOLOGIN, lecture seule par GRANT explicite, endosse par PostgREST via la claim `role` d'un JWT. REGLE PERMANENTE : `site_lecteur` ne bypasse PAS la RLS (contrairement a service_role) et reste HORS des default privileges de la migration 0006 — chaque future table lisible par le site recoit son `grant select` ET sa policy de lecture (`for select to site_lecteur using (true)`) dans la MEME migration, sinon les SELECT renvoient zero ligne malgre les grants.
- JWT `site_lecteur` (remplacera la service_role dans `site/.env.local`, variable cible `SUPABASE_SITE_LECTEUR_JWT`, des 0019 appliquee) :
  - claims `{ "iss": "supabase", "ref": "yecxgmuryrmztymxjbxo", "role": "site_lecteur", "iat": <frappe>, "exp": <frappe + 10 ans> }`, signees HS256 avec le secret JWT legacy du projet (dashboard Supabase → Settings → API → JWT Secret).
  - `exp` EXPLICITE : duree 10 ans ; la date d'echeance est NOTEE en commentaire dans `site/.env.local` a la frappe (et reportee ici).
  - Frappe : script local ponctuel, jamais commite ; verification avant bascule : `curl` REST avec le JWT → lecture `produit` OK, INSERT refuse (42501).
  - Rotation : re-frapper un JWT avec un nouvel `exp` et remplacer la variable (local + env Vercel au deploiement). Revocation d'urgence : rotation du secret JWT du projet — invalide TOUTES les cles legacy (anon et service_role de l'Atelier comprises), operation lourde a coordonner.
  - Disciplines inchangees : jamais NEXT_PUBLIC, jamais commite, grep du bundle a chaque livraison.
- Pages a donnees en ISR (`revalidate = 300`) : fraicheur du flag « aujourd'hui » (CALCULE : jour courant Europe/Paris vs `jour_semaine`, jamais stocke) et de la carte, performance mobile.

## Lectures de la Vague 1 (sources uniques Atelier)

| Donnee site | Source | Note |
|---|---|---|
| Cartes truck / traiteur / vitrine boutique | table `produit` (canal, actif) groupee par `categorie` | La MEME source que le pipeline de vente : les precommandes V2 refereceront ces `produit_id`. Descriptions/notes de famille : plan de migration ci-dessous |
| Emplacements truck | table `emplacement` (libelle, jour_semaine) | « Aujourd'hui » calcule ; lieu precis + horaire par emplacement : plan de migration |
| Horaires boutique, coordonnees | `site/src/lib/contenu.ts` (§06 du handoff, valeurs REELLES) | Provisoire-editable : table a venir |
| Annonces | AUCUNE surface dans la maquette | signale ; `social_post` disponible si un bloc actus est souhaite |

## Plan de migration referentiel (STOP semi-supervise — APPROUVE le 2026-07-18, un feu vert PAR migration)

Ordre approuve : **0019 → 0020 → 0022 → 0021 → 0023**, dry-run en transaction annulee + rollback ecrit AVANT chaque execution, jamais deux migrations d'affilee. Decisions tranchees : `visible_site` default `true` (preserve le rendu actuel) · `famille_carte` rapprochee par `(canal, nom = produit.categorie)` SANS FK (zero backfill, pipeline de vente intact) · `horaire_boutique` en colonnes `time` (2 plages nullables par jour). Colonnes additives : aucune rupture des ecrans Atelier (Catalogue et Reglages font `select("*")`).

1. **0019 `site_lecteur`** (`supabase/migrations/0019_site_lecteur.sql`) : role lecture seule + grants produit/emplacement + policies « site lit … » (RLS active sur ces tables). APPLIQUEE et verifiee le 2026-07-18 (dry-run puis execution : role NOLOGIN sans bypass RLS, membre d'authenticator, lecture OK sous le role — 100 produits, 3 emplacements —, INSERT refuse 42501). Reste a faire : frappe du JWT (script `site/scripts/frappe-jwt.mjs`, commande a executer par Arnaud), bascule de `site/.env.local` vers `SUPABASE_SITE_LECTEUR_JWT` et sortie de la service_role.
2. **0020 `produit`** : `+ description text`, `+ visible_site boolean not null default true` ; le site lira `actif AND visible_site`. Aucun index (100 lignes, ISR 5 min).
3. **0022 `emplacement`** : `+ ville text`, `+ lieu text`, `+ horaire_service text` (fallback « 11h30 à 14h » cote site).
4. **0021 `famille_carte`** : `(id, canal, nom, note, ordre, actif, created_at)` + `unique (canal, nom)` (sert d'index de jointure) ; famille absente de la table → tri alphabetique actuel.
5. **0023 `horaire_boutique`** : `jour smallint unique check 1-7`, `plage1_debut/fin`, `plage2_debut/fin` (`time`, null = pas de plage) + seed des horaires reels dans la meme migration.
6. **0024 `creneau_retrait`** : REPORTEE au STOP Vague 2 (delai/cutoff/horizon = decisions business ouvertes), avec `demande_devis`, `newsletter_abonne`, enum `source_vente` += `'web'`, etat `web_a_confirmer` (enum fulfillment), rapprochement client create-or-match (index uniques du socle client).

Chaque table 1-5 recoit son `grant select` + policy `site_lecteur` dans sa propre migration (regle permanente ci-dessus). Chantier UI Atelier associe (hors migrations, a chiffrer apres) : Catalogue (description, interrupteur visible_site), Reglages (emplacements enrichis, horaires boutique, familles de carte).

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
