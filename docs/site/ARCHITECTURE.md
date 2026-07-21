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
- **Go-live Vagues 2+3 (2026-07-19)** : merge `--no-ff` `a48b497` (la regle apprise en V1, cf. Pieges Vercel) → les DEUX projets rebuildes legitimement (le diff du commit de merge couvre toute la plage). Test de bout en bout EN PRODUCTION OK (2 commandes web → confirmation chef avec depliage bowl conforme recette → remise → CA facture + encaisse), donnees d'essai nettoyees. Variables posees : projet SITE (`SUPABASE_SITE_ECRIVAIN_JWT`, `RESEND_API_KEY`, `RESEND_DEST_TEST`), projet ATELIER (`RESEND_API_KEY`, `RESEND_DEST_TEST`), racine `.env.local` (emails chef). Emails en mode dev — domaine Resend `aleonmange.app` a verifier (DNS zone Vercel) pour passer `RESEND_PROD=1`.

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

**0041 `produit` contenu import (2026-07-20)** : colonnes additives pour l'import du catalogue reel des chefs (JSON V2, `docs/imports/`) en brouillons invisibles. `tags text[]`, `import_ref text` (index unique partiel : cle stable = id JSON, idempotence + tracabilite + detection de collision avec la demo qui a `import_ref` NULL), `allergenes text[]`, `allergenes_verifies boolean not null default false`. Additive, RLS inchangee, `site_lecteur` lit via le grant de table (0019/0020/0033). DEUX REGLES PERMANENTES gravees :
- **Allergenes** : le site public n'affiche JAMAIS les allergenes d'un produit dont `allergenes_verifies = false`. Les allergenes importes du JSON sont AUTO-GENERES, NON verifies ; la verification (passer `verifies=true`) se fait par les chefs dans l'Atelier. Aucun affichage n'existe aujourd'hui : la regle vaut pour tout futur cablage.
- **Contrainte `produit_visible_requiert_prix`** : `check (not visible_site or prix_unitaire is not null or prix_kg is not null)`. Invariant grave EN BASE (pas seulement en consigne) : un produit VISIBLE a TOUJOURS un prix ; un brouillon sans prix ne peut pas devenir visible tant que le chef n'a pas saisi le sien. Prouve au dry-run : les 101 lignes demo passent (0 violation).

Import du catalogue chefs : 85 produits (45 boutique sans prix, 40 traiteur avec prix) inseres `visible_site=false`, `actif=true` ; script rejouable `scripts/import-catalogue-chefs.mjs` (insert-only `on conflict do nothing`, ne touche jamais une ligne existante). Prix suggeres de marche = UNIQUEMENT dans `docs/imports/RAPPORT_SAISIE_CHEFS.md`, jamais en base.

**0042 `prix_selon_mode` relachee (2026-07-20)** : l'ancienne `prix_selon_mode` exigeait un prix pour TOUT produit (mode -> sa colonne de prix NOT NULL), ce qui interdisait les brouillons sans prix de l'import 0041. Relachee. **COUPLE DE CONTRAINTES `produit` (invariant global)** :
- `prix_selon_mode` = **coherence mode / colonne de prix** : `check ((mode='unite' and prix_kg is null) or (mode='poids' and prix_unitaire is null))`. Le mode INTERDIT la colonne de prix de l'autre mode et AUTORISE la sienne a NULL (brouillon).
- `produit_visible_requiert_prix` (0041) = **un produit VISIBLE a toujours un prix** (`prix_unitaire` ou `prix_kg`).
Ensemble : un produit visible a un prix CORRECT pour son mode ; **le seul cas relache = un brouillon INVISIBLE sans prix** (a completer par les chefs). Les 101 lignes demo passent la version relachee (prouve au dry-run avant apply : 0 violation, `produit_visible_requiert_prix` conservee).

## Risques identifies pour les Vagues 2-3 (a traiter aux STOP migrations)

- `fulfillment` n'a pas d'etat `web_a_confirmer` et `source_vente` n'a pas `'web'` : migrations d'enum supervisees.
- « Commandes du jour » (Atelier) devra afficher et CONFIRMER/REFUSER les commandes web (garde-fou anti-abus V1 : la confirmation chef).
- Le RESERVE stock (B8) et le plan de production devront EXCLURE les commandes non confirmees (une commande en attente ne reserve pas de matiere).
- Une precommande B2C nait TOUJOURS `statut_paiement = 'regle'` avec reglement au retrait ; le `'du'` est reserve au canal traiteur B2B. Le critere est le CANAL.
- Cote client, le statut affiche est TOUJOURS « En attente de confirmation par l'atelier », jamais « validee ».
- Espace client / fidelite : INTERDITS avant la refonte RLS (policies actuelles `authenticated using(true)`). Le bouton « Mon compte » de la maquette est volontairement absent du site V1.

## Vague 2 — les trois ecritures (migrations 0024-0030, EN PRODUCTION sur `main` depuis le 2026-07-19)

Le site alimente le pipeline de vente EXISTANT (jamais un systeme parallele). Detail conformite : `docs/site/CONFORMITE_VAGUE_2.md`.

- **Mecanisme d'ecriture** : role Postgres `site_ecrivain` (0030), NOLOGIN, membre d'`authenticator`, JWT frappe (`SUPABASE_JWT_ROLE=site_ecrivain node site/scripts/frappe-jwt.mjs`), variable `SUPABASE_SITE_ECRIVAIN_JWT`. Le role a **AUCUN droit table** : seulement `EXECUTE` sur 4 fonctions `SECURITY DEFINER` (`web_creer_precommande`, `web_creer_devis`, `web_inscrire_newsletter`, `web_confirmer_newsletter`, `search_path` fige, `public` revoke). Un JWT compromis ne peut qu'appeler ces 4 fonctions. Client d'ecriture : `site/src/lib/supabase/ecrivain.ts` (meme duo apikey anon + Bearer que la lecture ; n'appelle QUE `.rpc()`). La `service_role` n'est PAS revenue.
- **Prix** : recalcule EN SQL dans `web_creer_precommande` depuis `produit` (actif ET visible_site ET meme canal). Le prix client n'existe pas dans le contrat (`produit_id` + `qte|poids_g`). Ecriture atomique (une RPC = une transaction).
- **create-or-match** dans la RPC : email prioritaire (normalise lower/trim), telephone secours (E.164, meme regexp que 0015), contre les index uniques du socle client ; `unique_violation` geree (re-select). JAMAIS de doublon aveugle, jamais de recherche floue. **Regle de priorite (0038, Vague 4)** : l'email reste PREMIER et inchange. Sur echec email, le TELEPHONE ne rattache QUE si l'email du client trouve est VIDE ou IDENTIQUE (ou si la commande ne fournit pas d'email). Si le client trouve par telephone a un email DIFFERENT non vide -> un NOUVEAU client est cree avec le nouvel email, **SANS telephone** (le telephone reste sur le client d'origine ; l'email fait l'identite ; l'index unique `client_telephone_unique` est preserve sans etre relache). Consequences : plus jamais de confirmation au mauvais destinataire, ZERO ecrasement d'identite. La resolution des **DOUBLONS VOLONTAIRES** (meme personne, deux emails/comptes) viendra de **l'espace client authentifie** (rapprochement volontaire) ou du **chef en fiche client** — jamais d'une fusion automatique. Prouve par 4 scenarios (email match ; tel + email existant vide -> rattache, email intact ; tel + email different -> nouveau client, tel nul, pas de mauvais destinataire ; frais -> nouveau client avec tel).
- **Etat pipeline** : `vente` nait `source_vente='web'`, `fulfillment='web_a_confirmer'`, `statut_paiement='regle'` (B2C, jamais `'du'`), `origine='spontane'`, `moyen_paiement='especes'` (placeholder corrige au retrait), `due_at`=creneau/marche, `occurred_at`=due_at (provisoire). AUCUN `reglement`, AUCUN `mouvement_stock`, AUCUN `vente_ligne_composant` a l'insertion (depliage bowl differe a la confirmation Vague 3).
- **Fuite fermee** : `v_commande_ouverte` (0029) exclut `web_a_confirmer` -> une commande non confirmee ne reserve aucune matiere et n'entre dans aucun agregat (RESERVE B8, charge prod, KPI orders, badge sidebar) ; absente aussi de `v_vente_remise` et `v_encaissement`.
- **Creneaux** : `creneau_retrait` (config seedee pas=30/delai=120/horizon=7) ; `site/src/lib/data/creneaux.ts` genere les creneaux = horaires d'ouverture INTERSECTES `[now+delai, now+horizon]` ; cutoff truck veille 23h59 Europe/Paris. Le backstop delai SQL LIT `delai_min_minutes` (jamais une constante — principe config-source).
- **Emails** : Resend best-effort (l'ecriture prime, jamais bloquant) ; expediteur `contact@aleonmange.app` (constante configurable) + `Reply-To: contact@aleonmange.com` temporaire ; mode dev par defaut (domaine `.app` a verifier chez Resend — enregistrements DNS a poser dans la zone Vercel, etape a part).
- **Decision differee Vague 3** : `productivite.ts` filtre `source_vente != 'import'` -> a l'arbitrage, decider si `'web'` (confirme) est exclu des heures de service comme `'import'`. Sans effet cette vague (web jamais dans `v_vente_remise` tant que non remis).

## Vague 3 — confirmation chef (migrations 0031-0032, EN PRODUCTION sur `main` depuis le 2026-07-19, go-live teste E2E)

Le chef confirme ou refuse les commandes web depuis l'Atelier. Detail : `docs/site/CONFORMITE_VAGUE_3.md`.

- **REGLE PERMANENTE (refus)** : une commande web refusee RESTE `fulfillment='web_a_confirmer'` (Option B, 0031 : colonnes `refuse_le` + `motif_refus`, aucun enum, aucune vue). Donc **tout lecteur de `web_a_confirmer` DOIT filtrer `refuse_le`** : `IS NULL` = file a confirmer (badge, section /orders), `IS NOT NULL` = historique refusees. Un lecteur qui oublie ce filtre ferait reapparaitre une commande refusee dans la file. Une refusee est absente de tout agregat par construction (web_a_confirmer deja exclu par 0029).
- **Confirmation** (`confirmerCommandeWeb`, `orders/actions.ts`) : `web_a_confirmer -> a_produire` (garde concurrence) -> entre dans `v_commande_ouverte` (RESERVE/charge/KPI). C'est LE moment du DEPLIAGE BOWL : `vente_ligne_composant` crees depuis la fiche recette via `composerLignesComposantBowl` (`stock.ts`, source UNIQUE extraite de `createVente` — sortie byte-identique). `fulfillment_event` journalise. Email best-effort.
- **Refus** (`refuserCommandeWeb`) : `refuse_le` + `motif_refus` (code + detail interne), fulfillment INCHANGE, aucun event, aucun credit. Email doux (phrase mappee au code, jamais le detail).
- **Remise B2C** : `avancerFulfillment(venteId, moyenReel?)` — au retrait, le chef choisit le moyen de paiement REEL (le web nait `'especes'` placeholder) ; `moyen_paiement` + `reglement` corriges. Le reste du flux de remise est inchange (verifie : apres confirmation, une commande web B2C est dans le meme etat qu'une precommande C&C manuelle).
- **Notification a l'arrivee** (0032) : trigger DEFENSIF `notifier_commande_web` (after insert on vente when source_vente='web' -> notification `categorie='commande'`, `ecran='orders'`), exception avalee (ne bloque jamais une vente). Categorie `'commande'` ajoutee a l'ecran Notifs.
- **Email Atelier** : module PROPRE `src/lib/email.ts` (isolation : le module du site n'est pas importable ; `resend` ajoute aux deps racine). Env a poser (racine + Vercel Atelier) : `RESEND_API_KEY`, `RESEND_DEST_TEST`, `RESEND_PROD`. Mode dev par defaut.
- **Ecritures chef** : directes en `authenticated` (RLS `for all to authenticated`), PAS de `site_ecrivain` (ce role ne sert qu'au site public). Le pilotage UI cote chef requiert l'auth Atelier (verifie par Arnaud, pas en autonomie).
- **Productivite** : `'web'` compte comme `'manuel'` (aucun changement — decision Vague 3 tranchee).
- **Editeur `creneau_retrait`** : Reglages Atelier (delai/pas/horizon/plage), met a jour la ligne active.

## Visuels du site (integration handoff CD, EN PRODUCTION depuis le 2026-07-19)

Merge `--no-ff` `3cb18b2` (`CLAUDE.md` + migration 0033 pre-commits hors du merge -> le tip ne touche que `site/` + `docs/` -> l'Atelier SAUTE, prouve : deploiement Atelier CANCELED ; seul le site a rebuilde). Verif prod OK (images rendues sur les 5 pages, portraits chefs en placeholder, poids source 79-165 Ko webp, next/image sert ~67 Ko).

Amendement de regle (decision Arnaud) : « pas d'image IA » visait les FAUSSES representations non validees, pas les visuels du handoff CD (direction artistique validee). Ces visuels sont integres et RESTENT remplacables par un shooting reel plus tard SANS changement de code (memes emplacements, memes noms de fichiers). Controle anti-Foodizy MAINTENU (RAS sur les 22 visuels).

- **Source** : extraits du manifeste base64 des maquettes (`docs/handoff-site/*.html`, format « Bundled Page » : `<script type="__bundler/manifest">` = dict `{uuid: {mime, compressed, data(base64)}}`, references par `<img src="uuid">` avec alt descriptifs). Desktop et mobile portent les MEMES visuels (uuid distincts par fichier) : rien d'unique cote mobile. 22 visuels.
- **Optimisation** : webp qualite 80, redimensionnes (<=1400px hero, 1000-1300px cartes/galerie, 900px plats), dans `site/public/images/` (ambiance) et `site/public/images/plats/` (plats). ~1,6 Mo au total (contre ~65 Mo de PNG source).
- **Rendu** : composant `Photo` (`components/ui.tsx`, next/image `fill` + object-cover, `sizes` adaptes par emplacement, `priority` sur les hero). Meme enveloppe (ratio + className) que `PhotoAvenir`, qui reste le FALLBACK des emplacements sans image assignee. **Portraits des chefs** (« Audrey et Victorien », accueil + histoire) : `PhotoAvenir` maintenu (jamais de visage genere presente comme un vrai chef).
- **Plats par la DONNEE** (jamais une galerie en dur) : migration 0033 `produit.image_url` (additif, nullable ; `site_lecteur` le lit via le grant de table, comme 0020). `carteDuCanal` renvoie `image` ; la boutique affiche « Nos recettes signatures » = produits portant une image (fallback etat vide propre). 3 produits boutique pourvus (Parmentier de boeuf, Cordon bleu, Lasagnes bolognaise).
- **Ecartes** : logo sur fond noir (detourage sale — demander a CD un vectoriel fond transparent), image « plan d'acces » (figee, mail @yahoo d'artefact) — a la place, le lien « Voir le plan d'acces » (pied de page + Contact + boutique) ouvre Google Maps ITINERAIRE sur l'adresse reelle (`COORDONNEES.plan`).
- **En attente** : bowl + tartines (signatures truck), blanquette + paella (aucun produit correspondant au catalogue) — a associer plus tard ; upload d'images produit par les chefs depuis l'Atelier (Vague 4).

## Vague 4 — refonte RLS + espace client (EN PRODUCTION, merge `0223acd`, 2026-07-20)

LE document de reference du modele de securite RLS. **EN PRODUCTION sur `main` (merge `--no-ff` `0223acd`, 2026-07-20 ; les 2 projets Vercel rebuildes ; test prod E2E Arnaud OK).** Migrations **0034-0040** (chacune prouvee par requetes sous role, appliquees en prod). Write-path client (0039), correctif securite trigger (0040), infra auth site (@supabase/ssr), 4 ecrans espace client + fiche client Atelier (Phase B) : LIVRES. Conformite : `CONFORMITE_VAGUE_4.md`.

### Identite : chef vs client (fail-closed)
- **Chef = un JWT portant le claim `app_role=equipe`.** Pose a l'emission du jeton par un **Custom Access Token Hook** (`public.custom_access_token_hook`, SECURITY DEFINER, ACTIVE dans la config Auth), dont la SOURCE DE VERITE est la table `profil` (l'equipe) : `exists profil where id = user_id`. Un utilisateur sans profil -> event inchange -> **pas de claim**.
- **`public.est_chef()`** = `coalesce((auth.jwt() ->> 'app_role') = 'equipe', false)` : **fail-closed** (jeton sans claim => jamais equipe).
- **Trigger `handle_new_user` FAIL-CLOSED (0040)** : un profil (= appartenance equipe) n'est cree QUE pour le TOUT PREMIER compte (bootstrap owner). Toute autre inscription, quel que soit `user_metadata`, n'obtient AUCUN profil -> reste un compte auth sans acces interne. Les membres d'equipe suivants sont provisionnes EXPLICITEMENT (insert `profil` par un chef : futur ecran `/users`, ou insert SQL), jamais par auto-inscription. (Remplace 0034, qui etait fail-open : cf. faille corrigee ci-dessous.)
- **Client = un compte auth SANS claim**, rattache a un `client` par `client.auth_user_id` (0036). `public.mon_client_id()` (SECURITY DEFINER) = le `client.id` du JWT courant (NULL si pas un client).

#### Faille corrigee : self-provision chef (0040, 2026-07-19)
- **Cause racine** : le trigger `handle_new_user` de 0034 etait **fail-OPEN** : il creait un profil equipe PAR DEFAUT et ne l'evitait que si `raw_user_meta_data.kind='client'`. Or `kind` vit dans `user_metadata`, **editable par l'utilisateur**. Une fois les signups actives (espace client Vague 4) + cle anon publique (bundle Atelier), une inscription publique SANS le marqueur obtenait un profil equipe -> `app_role=equipe` -> `est_chef()` -> **acces chef complet**. Prouve en prod (dry-run annule : inscription nue -> profil role=equipe).
- **Correctif (0040)** : trigger **fail-closed** (profil pour le bootstrap owner UNIQUEMENT ; provisioning equipe explicite via `/users`). Sequence de bascule appliquee : signups coupes (`disable_signup=true`) -> 0040 applique + prouve live (nue -> 0 profil, `hook.app_role=null` ; provisioning explicite -> profil equipe) -> signups re-actives (desormais sains : inscription nue -> 0 profil). Etat final : trigger fail-closed + signups ON.
- **REGLE PERMANENTE : jamais d'autorisation fondee sur `user_metadata`** (`raw_user_meta_data`, editable par l'utilisateur, present dans `auth.jwt()`). L'appartenance/le role se decident sur une source NON editable : la table `profil` (via le hook) ou `raw_app_meta_data`/`app_metadata` (cote serveur). Le `kind='client'` pose a l'inscription reste une COMMODITE d'UX, plus jamais un critere de securite. Corollaire Atelier : action `signUp` de `/login` supprimee (elle aurait provisionne un chef).

#### Garde applicative Atelier : exiger le claim (constat C, hotfixe 2026-07-19)
- **Cause racine** : la garde de l'Atelier (`updateSession` proxy + `(app)/layout`) verifiait seulement « connecte » (`getUser()`), PAS le claim. Signups ON -> un compte client (sans profil, sans claim) pouvait s'authentifier et atteindre l'UI complete de l'Atelier. La RLS tenait (`est_chef()=false` -> 0 donnee) : AUCUNE fuite, l'exposition etait le shell UI.
- **Correctif (3 couches, code Atelier seul, HOTFIXE sur main `1ba235a` en `--no-ff` scope hotfix)** : (1) `updateSession` lit `getClaims()` et exige `app_role='equipe'`, sinon `signOut()` + efface les cookies `sb-*` + `/login` ; (2) `signIn` rejette immediatement un non-equipe (message clair) ; (3) `(app)/layout` redirige un compte sans profil (defense en profondeur). Prouve : owner passe, comptes client rejetes.
- **REGLE** : toute app qui partage cette instance Auth AUTORISE sur le claim/profil, pas seulement « authentifie ». Le hotfix a rebuilde l'Atelier ; le site a saute (Ignored Build Step).

#### Provisioning d'un membre d'equipe (manuel ; /users = backlog)
Pas de recrutement prevu (seuls les deux chefs). L'ecran d'invitation `/users` est REPORTE ; on provisionne par le SEUL chemin legitime (0040 fail-closed) :
1. **Invitation Supabase** : Dashboard > Authentication > Users > « Add user » > « Send invitation » (email). La ligne `auth.users` est creee -> `handle_new_user` s'execute -> `premier=false` (l'owner existe) -> **AUCUN profil**. Le compte peut s'authentifier mais la garde Fix C le rejette (« Acces reserve a l'equipe ») et la RLS renvoie 0 ligne : acces ZERO tant que l'etape 2 n'est pas faite (fail-closed, voulu).
2. **Insertion `profil`** (par un proprietaire, via management API / SQL cible) : `insert into profil (id, nom, role) values (<uid>, <nom>, <role>)`. Au PROCHAIN jeton, le hook stampe `app_role=equipe` -> `est_chef()` -> acces.
3. Le membre se (re)connecte sur `atelier.aleonmange.app` : le claim arrive au premier jeton.

**PIEGE `site_url`** : depuis Fix B, l'Auth Site URL = `https://aleonmange.app` (pour que les confirmations CLIENT ne partent plus vers l'Atelier). Consequence : **toute invitation EQUIPE atterrit desormais cote SITE** (aleonmange.app), pas l'Atelier. Le membre invite doit ensuite aller manuellement sur `atelier.aleonmange.app` pour se connecter. A prevoir si on recable un vrai flux d'invitation equipe : un redirect explicite vers l'Atelier.

**Etat (2026-07-20)** : compte d'equipe **PARTAGE** `aleonmange@yahoo.com` (uid `4aaef25d`), nom d'affichage « Audrey et Victorien », role `owner` (choix des chefs pour la simplicite ; comptes individuels possibles plus tard). NB : cet email est AUSSI le contact public affiche du site ; aucune fiche client auto-creee (l'invitation a atterri sur la racine du site, pas `/compte`).

### Policies (0035, 0036) — RESTREINT ou MAINTIENT, jamais n'elargit
- **Tables internes** : les 55 policies `authenticated using(true)` sont passees en `using(est_chef())` (+ 5 scoped durcies en `est_chef() and auth.uid()=...`). Chef (claim) = acces INCHANGE ; client (sans claim) = RIEN. Prouve : chef == baseline sur 28 tables, client/bidon = 0 partout.
- **Client** : policies ADDITIVES (permissives, OR avec les policies equipe) — le client lit SES ventes / lignes / reglements / son client (`= mon_client_id()`) et gere ses `client_preference`. Prouve : un client voit 9 ventes (0 des autres), 1 client, 0 table interne.
- **INTOUCHES** : `site_lecteur` (5 policies + la config fidelite), `site_ecrivain` + les 4 RPC SECURITY DEFINER (bypass RLS), `service_role`, `anon`.

### Fidelite (0037) — compteur DERIVE, jamais stocke
- Opt-in : `client.fidelite_opt_in` + `fidelite_opt_in_le` (les passages comptent a partir de cette date).
- Config : `parametre_fidelite` (singleton, `seuil`/`recompense` editables en Reglages ; seed 10 / « 1 plat offert »).
- Vue `v_fidelite_client` (security_invoker) : `passages` = ventes `fulfillment='remis'`, canal boutique+truck, depuis l'opt-in (web/traiteur exclus) ; `recompenses_utilisees` = `fidelite_redemption`. Disponibles = `floor(passages/seuil) - rachats`. Prouve : vue == compte direct. Le client lit SA ligne (RLS) ; le chef toutes (fiche client).

### Write-path client (0039) — RPC SECURITY DEFINER self-scope
Le backend 0036/0037 donne au client la LECTURE de ses donnees (policies SELECT) mais AUCUN write-path : les policies `client` sont SELECT only, et `mon_client_id()` reste NULL tant que `auth_user_id` n'est pas pose (oeuf-et-poule). 0039 ajoute le write-path MINIMAL, `EXECUTE` reserve a `authenticated` (revoque anon/public), garde `est_chef()` (un jeton equipe est refuse), self-scope strict :
- **`web_rattacher_compte_client()`** (param-free) : lie le compte au `client` par l'`auth.jwt()->>'email'` (email VERIFIE du compte, JAMAIS un email saisi librement). Idempotent. Cree un `client` `particulier` si l'email ne matche personne (comportement defini). Prouve : rattachement -> `mon_client_id()` non nul -> isolation (9 ventes/738, 0 des autres).
- **`web_maj_profil_client(nom, telephone, opt_in)`** : maj self-scope (`auth.uid()`) du profil (nom, telephone E.164) + opt-in fidelite DATE (non retroactif : date posee a la bascule false->true, conservee ensuite). N'ecrit JAMAIS l'email (identite = compte auth). Prouve : opt-in date correct, passages 0 juste apres opt-in vs 5 si date reculee.
- **Jamais de `service_role` cote site, jamais de policy UPDATE `client` relachee** : le rattachement et l'edition passent par ces RPC (definer, self-scope), pas par un acces table direct. Le split en 2 fonctions (rattachement PUR sans input vs maj profil) maximise l'auditabilite.

### Infra auth site (Etage 2a) — EN PRODUCTION (E2E prod valide le 2026-07-20)
- `@supabase/ssr` cote site, **server-only** (RSC + Server Actions + Route Handler + proxy) : reutilise `SUPABASE_URL` + `SUPABASE_ANON_KEY` (deja presentes), **aucun nouveau secret, jamais NEXT_PUBLIC**. La cle anon = ticket de passerelle ; le role effectif est le jeton du client (cookies). `site/src/lib/supabase/session.ts` (client de session) + `middleware.ts` (rafraichissement + garde).
- `site/src/proxy.ts` (Next 16 : ex-middleware) cadre STRICTEMENT `/compte` (matcher) : rafraichit la session (`getUser()`, **jamais `getSession()`** cote serveur) et garde `/compte` -> la vitrine publique (Vagues 1-3) n'est jamais interceptee. Defense en profondeur : chaque RPC self-scope `auth.uid()` (ne depend pas de la seule garde proxy).
- Parcours : `/compte/connexion` (Server Actions inscription `kind='client'` / connexion / deconnexion) ; `/compte/auth/callback` (confirmation e-mail : gere PKCE `?code=` ET `verifyOtp ?token_hash=`) -> session -> rattachement 0039 (+ opt-in si coche) ; `/compte` (RSC, self-heal rattachement idempotent). Ecrans SOCLE sobres (la maquette CD d-login/d-compte = Phase B). Statut client verrouille : commande web non confirmee = « En attente de confirmation par l'atelier ».
- **Confirmation e-mail ON** (`mailer_autoconfirm=false`). **Config Auth POSEE (Fix B, constat B)** : `site_url = https://aleonmange.app` (les inscriptions viennent du site ; le fallback ne part plus vers l'Atelier) + redirect URLs `.../compte/**` (localhost:3002 + aleonmange.app) ; `emailRedirectTo` EXACT sans query (matche l'allow-list, flux PKCE). Les URLs Atelier restent dans l'allow-list (login chef inchange). Constat B : sans ca, la confirmation client (emailRedirectTo avec `?next=`) retombait sur `site_url`=Atelier.
- **Build + lint verts des deux apps.** **E2E complet (inscription -> mail -> lien -> rattachement -> isolation) = A VALIDER AU SOCLE** (test humain d'Arnaud : necessite les redirect URLs + une vraie adresse). Les RPC sous-jacentes sont deja prouvees en prod.

### TTL + REVOCATION immediate
- Le claim vit DANS le jeton (pose a l'emission). TTL access token = defaut Supabase (court, ~1 h) : le conserver court.
- **Revoquer un acces equipe** : supprimer la ligne `profil` PUIS forcer la re-emission (`auth.admin.signOut(<uid>)` cote admin, ou attendre le refresh) — le prochain jeton n'aura plus le claim. Au pire, le claim survit le temps du TTL apres le retrait du profil.
- **Verifier un claim** (chef reconnecte) : DevTools > Console, decoder le cookie `sb-<ref>-auth-token` (payload JWT) -> `app_role` doit valoir `equipe`.

### Storage
- Aucun bucket aujourd'hui. **Convention** : tout bucket futur recoit, des sa creation, des policies `est_chef()` (+ cadrage client si besoin), **fail-closed** (jamais de policy publique par defaut).

## Pieges connus

### Enum ADD VALUE : dry-run partiel, dependance de commit
- **Symptome** : impossible de dry-runner une migration qui UTILISE une nouvelle valeur d'enum (vue, contrainte) dans la meme transaction annulee.
- **Cause racine** : `ALTER TYPE ... ADD VALUE` est acceptee en transaction (PG12+) mais la valeur n'est UTILISABLE qu'apres commit ; et une valeur d'enum ne se DROP pas (rollback = valeur inerte, ou recreation lourde du type).
- **Regle** : les enums (0027/0028) se dry-runnent en DDL seul ; la vue dependante (0029) et les fonctions qui castent la valeur (0030, via `check_function_bodies=off` au dry-run) se verifient APRES le commit des enums. Ordonner : enum -> commit -> vue/fonctions.

### Management API Supabase : User-Agent Python bloque (403)
- **Symptome** : `urllib.request` vers `api.supabase.com/.../database/query` renvoie 403 (curl passe).
- **Fix** : ajouter un en-tete `User-Agent` (ex. `curl/8.4`) a la requete urllib, sinon le WAF bloque l'agent Python par defaut.

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

## GA4 et consentement CNIL (livre sur `site-ga4-consent`)
Google Analytics 4 (`NEXT_PUBLIC_GA_ID`, sur Vercel Production ; 1re var `NEXT_PUBLIC` du projet, un Measurement ID etant public par nature) via `@next/third-parties` (`<GoogleAnalytics>`), soumis a un consentement explicite (RGPD/CNIL) :
- **Consent Mode v2, defaut DENIED** : un `<Script strategy="beforeInteractive">` (layout) pose `gtag('consent','default',{...,'analytics_storage':'denied'})` — script INLINE, AUCUNE requete reseau, gtag.js PAS charge.
- **Chargement sur acceptation seulement** : `site/src/components/Consentement.tsx` (client, monte au layout apres `<LettreInfo/>`) ne rend `<GoogleAnalytics>` que si le choix = accepte, puis `gtag('consent','update',{analytics_storage:'granted'})`. Refus = GA jamais monte, zero cookie `_ga`, site pleinement fonctionnel.
- **Memorisation 13 mois** : `localStorage['alm-consent'] = {v,t}` (horodate) ; au-dela de 13 mois la cle expire, la banniere revient (reco CNIL). Cle technique de consentement = exemptee.
- **Banniere MAISON** (tokens du site, pas de CMP externe), sobre, bas d'ecran, non bloquante, « Accepter »/« Refuser » au MEME niveau visuel. Re-ouvrable via « Gerer les cookies » (barre legale du footer) -> `CustomEvent("alm:cookies")` (meme pattern que `ouvrirLettre`/`"alm:lettre"`).
- **Vercel Analytics** (`<Analytics/>` + `<SpeedInsights/>`) RESTE, non gate (cookieless), coexiste.
- **Evenements de conversion** (`site/src/lib/analytics.ts::trackEvent`) : client only, envoyes UNIQUEMENT si consentement, snake_case, ZERO PII en parametre. Les 5 : `precommande_envoyee` (canal), `devis_envoye`, `newsletter_inscription`, `compte_cree` (garde anti-double ; = inscription soumise, pas activation), `recommande_1_geste` (canal), cables au succes client de chaque action (useEffect). Noms alignes sur les evenements crees dans l'interface GA4.
- **Mentions legales** : section « Cookies et mesure d'audience » (GA4 consenti, 13 mois, re-modifiable, Vercel cookieless).
- **REGLE** : aucune conversion ne porte d'email/nom/telephone/reference client. GA ne se charge jamais avant « Accepter » (verifiable : aucune requete `googletagmanager.com` sans consentement).

## Decisions business ouvertes (ne jamais trancher seul)

Creneaux click & collect (delai, cutoff, horizon) · horaires definitifs boutique · carte boutique reelle · affichage des conditions de reglement traiteur au prospect (le « Comment ca marche » affiche une etape « facturation » au libelle volontairement sobre) · contenus reels (photos — brief photo CD existant —, textes histoire, mentions legales : raison sociale, SIRET, hebergeur).
