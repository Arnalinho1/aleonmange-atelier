# Site public ALM — Architecture (Vague 1)

> Mise a jour : 2026-07-18 (Vague 1 verifiee avec les vraies lectures Supabase ; local, zero deploiement).
> Handoff de reference : `docs/handoff-site/` (relais, INTEGRATION.md V2, maquettes desktop/mobile autonomes, plan d'integration). Artefacts compiles, jamais edites.

## Monorepo

- `site/` a la racine = application Next.js AUTONOME (Next 16.2.10, React 19, Tailwind v4, TypeScript). Son propre `package.json` + lockfile (le repo n'a pas de workspaces) : `cd site && npm install`.
- Port dev : **3002** (3000 = Foodizy, 3001 = Atelier).
- Isolation de l'Atelier (verifiee, builds independants verts) : `tsconfig.json` racine exclut `site` ; `eslint.config.mjs` racine ignore `site/**` ; `site/next.config.ts` fixe `turbopack.root` (sinon Turbopack remonte au lockfile racine et compile le proxy de l'Atelier).
- Deploiement : voir « Deploiement (etat live) » en fin de document.

## Deploiement (etat live depuis le 2026-07-19)

- **Projet `aleonmange-site`** (team arnalinho1s-projects) : Root Directory `site/`, production sur `main`. Reglages CRITIQUES : « Include source files outside of the Root Directory » DECOCHE (sandbox = site/ seul, cf. piege ci-dessous) · skip natif « pas de changement dans le Root Directory » · Deployment Protection desactivee (site public). DOMAINE : **`aleonmange.app`** (achete chez Vercel, zone DNS geree par eux) + `www.aleonmange.app` en redirect 308 vers l'apex, chemin preserve. Alias techniques conserves : `aleonmange-site-arnalinho1s-projects.vercel.app` (+ legacy `aleonmange-atelier-7x86.vercel.app`, nom de creation du projet).
- **Projet `aleonmange-atelier`** : Root `.`, prod sur `main`, DOMAINE **`atelier.aleonmange.app`** (l'ancienne `aleonmange-atelier.vercel.app` reste servie en transition), plus un Ignored Build Step custom : `git diff --quiet HEAD^ HEAD -- . ':(exclude)site' ':(exclude)docs'` (un push purement site/docs ne le rebuilde pas — prouve 4 fois). Supabase Auth : Site URL = `https://atelier.aleonmange.app`, redirect URLs = nouveau domaine + ancienne adresse vercel.app (transition sans coupure) ; l'ancienne pourra etre retiree une fois les chefs bascules.
- Certificat TLS wildcard `*.aleonmange.app` verifie sur les trois hotes (2026-07-19).
- Les 3 variables du site (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SITE_LECTEUR_JWT) vivent dans le dashboard du projet site (Production + Preview), collees par Arnaud, jamais en clair dans le repo ni la session.

### Rollback, etage par etage

1. **Contenu** : les chefs corrigent dans l'Atelier, ISR 5 min — aucun deploiement.
2. **Deploiement site ou Atelier** : Vercel → projet → Deployments → deploiement precedent → « Instant Rollback » (ou `vercel rollback <url>`). Les deploiements de prod precedents restent listes et re-promouvables.
3. **Code** : revert git sur une branche + merge sur main apres feu vert. ATTENTION : un revert de toute la vague retire `site/` → casse la prod du site ; preferer l'Instant Rollback Vercel + fix forward.
4. **Base** : chaque migration 0019-0023 porte son rollback en pied de fichier (ordre inverse : 0023 → 0019).

### Pieges Vercel (vecus au deploiement du 2026-07-19)

- **Ignored Build Step et push fast-forward multi-commits** : Vercel compare `HEAD^..HEAD` (DERNIER commit du push seulement). Le merge ff de la vague (17 commits, dernier = site-only) a fait annuler le build de prod ATELIER alors que la vague touchait `src/` — rattrape par `vercel deploy --prod` depuis la racine. REGLE pour les prochaines vagues : merger en `git merge --no-ff` (le diff du commit de merge couvre TOUTE la plage) ou verifier que le dernier commit du push reflete le total.
- **`vercel redeploy` reutilise le contexte FIGE du deploiement d'origine** : un changement de reglage projet (sandbox, root...) n'est pris qu'avec un deploiement FRAIS (push git ou `vercel deploy`).
- **Sandbox monorepo** : avec « Include source files outside of the Root Directory » COCHE, la plateforme injecte `outputFileTracingRoot` a la racine du repo, qui PREVAUT sur `turbopack.root` (piege du proxy Atelier rejoue au build distant) ; l'aligner sur `site/` casse la finalisation (`lstat /vercel/path0/.next`). Le decochage est la seule configuration coherente pour ce monorepo sans workspaces.

## Acces aux donnees (regle de securite)

- L'acces anonyme a la base est INTEGRALEMENT BLOQUE, et il le reste (role `anon` : aucun grant, aucune policy — re-verifie a la bascule). Aucun acces client direct.
- Lectures publiques via `site/src/lib/supabase/serveur.ts` (`import "server-only"`), role Postgres **`site_lecteur`** (migration 0019 ; la service_role est SORTIE du site le 2026-07-18). Mecanique a DEUX en-tetes — la passerelle API n'accepte en `apikey` que les cles ENREGISTREES du projet, un JWT custom seul est rejete « Invalid API key » :
  - `SUPABASE_ANON_KEY` = ticket de passerelle (en-tete `apikey`), ZERO droit en base : seule, elle ne lit rien (42501) ;
  - `SUPABASE_SITE_LECTEUR_JWT` = `Authorization: Bearer` → PostgREST endosse `site_lecteur` : lecture seule garantie par la BASE (grants produit + emplacement, RLS active, ecritures refusees 42501), plus seulement par discipline de code.
  - les deux a coller MANUELLEMENT dans `site/.env.local` (modele : `site/.env.local.example`, avec `SUPABASE_URL`), valeur sur la MEME ligne que le nom. Jamais commitees, jamais `NEXT_PUBLIC`.
  - variable absente → echec CLAIR : avertissement explicite dans les logs serveur + etats vides propres a l'ecran (pas de crash silencieux).
  - preuve a chaque livraison : grep de `site/.next/static/` sur `service_role`, `site_lecteur` ET les VALEURS (JWT, cle anon) = 0 fichier.
- REGLE PERMANENTE : `site_lecteur` (NOLOGIN, membre d'`authenticator`) ne bypasse PAS la RLS et reste HORS des default privileges de la migration 0006 — chaque future table lisible par le site recoit son `grant select` ET sa policy de lecture (`for select to site_lecteur using (true)`) dans la MEME migration, sinon les SELECT renvoient zero ligne malgre les grants.
- JWT `site_lecteur` (EN SERVICE depuis le 2026-07-18 ; echeance du JWT courant : 2036-07-18, rappelee en commentaire dans `site/.env.local`) :
  - claims `{ "iss": "supabase", "ref": "yecxgmuryrmztymxjbxo", "role": "site_lecteur", "iat": <frappe>, "exp": <frappe + 10 ans> }`, signees HS256 avec le secret JWT legacy du projet (dashboard Supabase → Settings → API → JWT Secret).
  - `exp` EXPLICITE : duree 10 ans ; la date d'echeance est NOTEE en commentaire dans `site/.env.local` a la frappe (et reportee ici).
  - Frappe : `site/scripts/frappe-jwt.mjs` (secret lu depuis `SUPABASE_JWT_SECRET`, jamais en argument ni commite — commande recommandee en tete du script) ; verification avant bascule : `curl` REST avec `apikey` anon + `Bearer` JWT → lecture `produit` OK, INSERT refuse (42501).
  - Rotation : re-frapper un JWT avec un nouvel `exp` et remplacer la variable (local + env Vercel au deploiement). Revocation d'urgence : rotation du secret JWT du projet — invalide TOUTES les cles legacy (anon et service_role de l'Atelier comprises), operation lourde a coordonner.
  - Disciplines inchangees : jamais NEXT_PUBLIC, jamais commite, grep du bundle a chaque livraison.
- Pages a donnees en ISR (`revalidate = 300`) : fraicheur du flag « aujourd'hui » (CALCULE : jour courant Europe/Paris vs `jour_semaine`, jamais stocke) et de la carte, performance mobile.

## Lectures de la Vague 1 (sources uniques Atelier)

| Donnee site | Source | Note |
|---|---|---|
| Cartes truck / traiteur / vitrine boutique | table `produit` (canal, `actif AND visible_site`) groupee par `categorie` | La MEME source que le pipeline de vente : les precommandes V2 refereceront ces `produit_id`. Descriptions affichees si renseignees (Catalogue) ; ordre + notes de familles via `famille_carte` (Reglages), fallback tri alphabetique |
| Emplacements truck | table `emplacement` (libelle, jour_semaine, ville, lieu, horaire_service) | « Aujourd'hui » calcule ; horaire par emplacement avec fallback « 11h30 à 14h » |
| Horaires boutique | table `horaire_boutique` (7 jours, plages time ; saisie Reglages) | Plages nulles = « Fermé » ; jours consecutifs identiques regroupes ; table VIDE = fallback integral `contenu.ts` |
| Coordonnees | `site/src/lib/contenu.ts` (§06 du handoff, valeurs REELLES) | Provisoire-editable |
| Annonces | AUCUNE surface dans la maquette | signale ; `social_post` disponible si un bloc actus est souhaite |

## Plan de migration referentiel (TERMINE : 0019 a 0023 APPLIQUEES le 2026-07-18 ; 0024 reportee au STOP Vague 2)

Ordre execute : **0019 → 0020 → 0022 → 0021 → 0023**, un feu vert PAR migration, dry-run en transaction annulee + rollback ecrit AVANT chaque execution, jamais deux migrations d'affilee. Decisions tranchees : `visible_site` default `true` (preserve le rendu actuel) · `famille_carte` rapprochee par `(canal, nom = produit.categorie)` SANS FK (zero backfill, pipeline de vente intact) · `horaire_boutique` en colonnes `time` (2 plages nullables par jour). Colonnes additives : aucune rupture des ecrans Atelier (Catalogue et Reglages font `select("*")`).

1. **0019 `site_lecteur`** (`supabase/migrations/0019_site_lecteur.sql`) : role lecture seule + grants produit/emplacement + policies « site lit … » (RLS active sur ces tables). APPLIQUEE et verifiee le 2026-07-18 (dry-run puis execution : role NOLOGIN sans bypass RLS, membre d'authenticator, lecture OK sous le role — 100 produits, 3 emplacements —, INSERT refuse 42501). Bascule TERMINEE le meme jour : JWT frappe par Arnaud (echeance 2036-07-18), `serveur.ts` sur le duo `apikey` anon + `Bearer` site_lecteur, service_role SORTIE de `site/.env.local`, preuve zero fuite re-passee, E2E vert.
2. **0020 `produit`** (`supabase/migrations/0020_produit_contenu_site.sql`) : `+ description text`, `+ visible_site boolean not null default true`. APPLIQUEE et verifiee le 2026-07-18 (defaults corrects, lecture des nouvelles colonnes sous site_lecteur SANS grant supplementaire — grant de niveau table 0019 —, comptages site identiques 50/35/15, privileges Atelier intacts). Aucun index (100 lignes, ISR 5 min). Cote code site : filtre `actif AND visible_site` + affichage des descriptions a activer avec l'UI Catalogue (sans urgence : 100 % visibles, 0 description renseignee).
3. **0022 `emplacement`** (`supabase/migrations/0022_emplacement_precisions.sql`) : `+ ville text`, `+ lieu text`, `+ horaire_service text`. APPLIQUEE et verifiee le 2026-07-18 (lecture sous site_lecteur OK — grant de table 0019 —, jour_semaine intact 2/3/4, ecran /food-truck identique avec fallback « 11h30 à 14h », zero badge fantome). Cote code site : consommation de ville/lieu/horaire_service a activer avec l'UI Reglages (EmplacementsManager), colonnes vides a ce jour.
4. **0021 `famille_carte`** (`supabase/migrations/0021_famille_carte.sql`) : `(id, canal, nom, note, ordre, actif, created_at)` + `unique (canal, nom)` (sert d'index de jointure) ; famille absente de la table → tri alphabetique actuel. APPLIQUEE et verifiee le 2026-07-18 — premiere CREATION de table du plan, regle permanente appliquee dans la meme migration (RLS active, policies equipe convention 0002, grant + policy site_lecteur) ; verifs : lecture sous le role OK, INSERT refuse 42501, authenticated/service_role 7 privileges via defaults 0006, table vide (saisie chef via l'UI Reglages a venir).
5. **0023 `horaire_boutique`** (`supabase/migrations/0023_horaire_boutique.sql`) : `jour smallint unique check 1-7`, `plage1/plage2` en `time` + 3 contraintes de coherence, RLS + policies + grant/policy site_lecteur, SEED des horaires reels dans la meme migration. APPLIQUEE et verifiee le 2026-07-18 : 7 lignes lues sous le role (Mar-Ven 9h-13h + 15h-19h, Sam 9h-14h, Dim/Lun fermes), ecritures refusees 42501. Jour FERME = ligne PRESENTE aux plages nulles (explicite) ; table VIDE = non configure → le site retombera sur contenu.ts. Consommation cote site a activer (statut « ouvert maintenant » calculable plus tard).
6. **0024 `creneau_retrait`** : REPORTEE au STOP Vague 2 (delai/cutoff/horizon = decisions business ouvertes), avec `demande_devis`, `newsletter_abonne`, enum `source_vente` += `'web'`, etat `web_a_confirmer` (enum fulfillment), rapprochement client create-or-match (index uniques du socle client).

Chaque table 1-5 recoit son `grant select` + policy `site_lecteur` dans sa propre migration (regle permanente ci-dessus).

FINITION du 2026-07-18 (apres les migrations) : UI Atelier livree — Catalogue (description, interrupteur « Visible sur le site », badge « Masqué du site ») et Reglages (emplacements enrichis ville/lieu/horaire, section Horaires boutique 7 jours a 2 plages time, section Familles de carte avec datalist des categories en usage et badge « Sans catégorie ») ; consommation cote site activee (filtre visible_site, descriptions, ordre/notes de familles, precisions d'emplacement, horaires en base) avec fallbacks integrals. ISR : `revalidate = 300` au niveau LAYOUT (le pied de page affiche les horaires en base sur toutes les routes) — toutes les pages suivent la fraicheur 5 min.

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

### Valeur collee sur la ligne suivante dans .env.local
- **Symptome** : lectures Supabase desactivees (etats vides + avertissement serveur) alors que la cle semble presente dans le fichier.
- **Cause racine** : valeur collee sur la ligne SOUS le nom de la variable (`NOM=` vide + ligne orpheline) : dotenv lit une valeur vide et ignore le reste. Vecu avec la cle service_role de la Vague 1.
- **Fix / Regle** : la valeur doit etre sur la MEME ligne que le nom. Au demarrage, verifier l'absence de l'avertissement « Lectures Supabase DESACTIVEES » dans les logs serveur.

### JWT custom rejete par la passerelle API (« Invalid API key », 401)
- **Symptome** : toutes les requetes REST echouent en 401 avec un JWT site_lecteur pourtant valide (signature et claims correctes).
- **Cause racine** : la passerelle Supabase (Kong) ne valide en en-tete `apikey` que les cles API ENREGISTREES du projet (anon / service_role legacy, cles sb_*) ; un JWT custom n'en fait pas partie, quelle que soit sa validite.
- **Fix** : duo d'en-tetes — `apikey` = cle anon (ticket de passerelle, zero droit dans ce projet) + `Authorization: Bearer` = JWT site_lecteur (le role effectif). Dans supabase-js : `createClient(url, cleAnon, { global: { headers: { Authorization } } })`.
- **Regle** : la cle anon seule ne donne RIEN (verifie : 42501 sur produit) ; le controle d'acces reel reste porte par le role du Bearer. Re-verifier ce refus anon a chaque evolution des grants.

### Inventaire de grants fausse par le role courant (information_schema)
- **Symptome** : pendant un dry-run, `information_schema.role_table_grants` semble montrer qu'un role (ex. authenticated) n'a AUCUN droit sur une table qu'on vient de creer — alors que les default privileges se sont bien appliques.
- **Cause racine** : les vues `information_schema` FILTRENT selon le role courant : sous `set local role site_lecteur`, on ne voit que les grants qui concernent site_lecteur.
- **Fix / Regle** : toute verification de grants/policies dans un dry-run se fait en `postgres` (AVANT le `set local role`), jamais sous le role teste. Le role teste ne sert qu'aux preuves d'acces (lecture OK, ecriture refusee).

### E2E local : playwright-core sans navigateurs telecharges
- La racine du repo fournit `playwright-core` (pas de runner, pas de download auto) ; le cache `~/Library/Caches/ms-playwright` peut ne pas correspondre a la version. Lancer avec `chromium.launch({ channel: "chrome" })` pour utiliser le Chrome systeme, zero telechargement.

## Decisions business ouvertes (ne jamais trancher seul)

Creneaux click & collect (delai, cutoff, horizon) · horaires definitifs boutique · carte boutique reelle · affichage des conditions de reglement traiteur au prospect (le « Comment ca marche » affiche une etape « facturation » au libelle volontairement sobre) · contenus reels (photos — brief photo CD existant —, textes histoire, mentions legales : raison sociale, SIRET, hebergeur).
