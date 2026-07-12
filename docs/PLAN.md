# Plan d'exécution — Atelier ALM (Next.js + Supabase)

Statut : **soumis pour validation, aucun code métier écrit.** Établi après lecture
intégrale de README.md, HANDOFF.md (§00–06), Contrat de données Vente (§01–06),
ChanFilter.dc.html. Ces documents font autorité ; ce plan s'y conforme.

---

## 1. Schéma de base de données

### 1.1 Enums natifs Postgres (clés stables, jamais traduites — Contrat §04)
Décision prise (Contrat §06 « appel base ») : **`create type` natif** pour les
jeux de valeurs figés ; l'affichage FR reste côté front.

- `canal` : `truck` · `boutique` · `traiteur`
- `mode_vente` : `instantane` · `precommande`
- `fulfillment` : `a_produire` · `en_prod` · `pret` · `remis`
- `paiement` : `especes` · `cb` · `ticket` · `virement`
- `origine` : `spontane` · `insta` · `tiktok` · `facebook` · `code`
- `ligne_type` : `bowl` · `produit` · `formule`
- `ligne_mode` : `unite` · `poids`  ← **exactement 2 modes** (portion + S/M/L retirés)
- `categorie_composant` : `proteine` · `feculent` · `legume` · `sauce`
- `source_vente` : `manuel` · `import`

**`emplacement` n'est PAS un enum** → table de référentiel éditable (§1.2).

### 1.2 Référentiel (éditable ; SOFT DELETE `actif=false`, jamais de suppression)
- **`emplacement`** (`id`, `code`, `libelle`, `jour_semaine`, `actif`, `created_at`)
  → seed des 3 réels : `oingt`/`tassin`/`salvagny`. La vente porte une FK.
- **`composant`** (`id`, `nom`, `categorie`, `cout_matiere_kg?`, `actif`)
  → **couche commune** sous les 3 catalogues, lue par `id` (jamais par canal).
- **`produit`** (catalogue) (`id`, `nom`, `categorie`, `canal`, `mode`,
  `prix_unitaire?`, `prix_kg?`, `is_bowl`, `recette_id?`, `actif`)
  → **vide au départ**, rempli via formulaire réel.
- **`recette`** (`id`, `nom`, `rendement?`, `etapes jsonb?`) +
  **`recette_composant`** (`recette_id`, `composant_id`, `quantite`, `categorie`)
  → fiche technique ; bowl = recette **virtuelle** (voir point ouvert #5).
- **`client`** (`id`, `nom`, `type`, coordonnées, `actif`) → CRM léger, soft delete.
- **`profil`** (`id`=auth.uid, `nom`, `role`, `actif`) → au moins le proprio.

### 1.3 Transactionnel (naît VIDE, aucun seed)
- **`vente`** (Contrat §01, champs figés) :
  `id`, `occurred_at timestamptz NOT NULL`, `canal`, `emplacement_id` (FK,
  `NOT NULL si canal=truck` via contrainte CHECK, sinon NULL), `montant_total
  numeric(8,2)`, `couverts int?` (traiteur), `client_id?`, `moyen_paiement`,
  `origine`, `mode_vente`, `fulfillment`, `source_vente` (`manuel`/`import`),
  `created_at`.
- **`vente_ligne`** (Contrat §02) : `id`, `vente_id`, `type`, `mode`,
  `recette_id?`, `poids_g?`, `prix_kg?`, `qte?`, `prix_unitaire?`, `montant`.
- **`vente_ligne_composant`** (Contrat §02) : `ligne_id`, `composant_id`,
  `categorie` → dépliage du bowl (coût matière + gaspi C2).
- **`mouvement_stock`** (`id`, `composant_id`, `type`, `quantite`, `lot_id?`,
  `occurred_at`) + **`lot`** (`id`, `composant_id`, `dlc`, `quantite`, `recu_le`).
- **`releve_haccp`** (`id`, `type`, `valeur`, `lot_id?`, `occurred_at`, `operateur`).
- **`insight`** (`id`, `urgence`, `impact`, `constat`, `chiffre`, `action`,
  `statut`, `origine_calcul`) → **source unique** ; dashboard lit `.slice(0,3)`.
- **`notification`** + **`notification_preference`** (par canal, in-app/email).
- **`social_post`** (`id`, `reseau`, `emplacement_id?`, `statut`, `contenu`,
  `programme_le`) → périmètre à cadrer (point ouvert #4).
- **`import_batch`** + **`import_mapping`** (mapping colonne→champ, **configurable**).

### 1.4 Sources uniques — matérialisées en base (une logique, plusieurs vues)
- **Vue `v_vente_remise`** = ventes `fulfillment='remis'`. **Finances ET
  Historique lisent cette même vue.** Le CA n'est compté qu'ici.
- **`orders`** lit `mode_vente='precommande' AND fulfillment<>'remis'`.
- **Insights** : une seule table `insight` ; dashboard = même jeu trié
  urgence→impact `.slice(0,3)`. Zéro logique parallèle.
- **Marges** nommées distinctement : `marge_brute_matiere` (prix − coût matière)
  vs `marge_nette` (après charges). Jamais le même libellé.
- `montant_total` **stocké**, figé à l'encaissement (Contrat §06 : décision base).
- Index `(occurred_at, canal)` pour la saisonnalité.

### 1.5 Sécurité — RLS dès la création
- **RLS activé sur CHAQUE table à la création** (dans la même migration).
- Politique bootstrap : membres authentifiés de l'équipe (lecture/écriture).
  Le modèle fin de permissions par écran est un **point ouvert** (#3 ci-dessous).
- `service_role` uniquement en serveur (`.env.local`, jamais commitée).

### 1.6 Seed minimal (autorisé ET requis — rien d'autre)
1. Les enums (via migration).
2. Les 3 emplacements truck réels (`oingt`, `tassin`, `salvagny`).
3. Un compte **propriétaire** (profil + rôle owner).
> Aucun produit, aucune vente, aucun stock, aucun insight. Tout le reste naît vide.

---

## 2. Ordre des écrans (dépendances d'abord)

**Phase 0 — Fondations**
Supabase (client/SSR + auth), migration schéma + RLS + seed, shell (sidebar +
topbar + routing), thème Tailwind (design tokens README), composants partagés
`EmptyState` et `ChanFilter`.

**Phase 1 — Référentiel** (entrée du vrai contenu ; tout l'aval en dépend)
1. `catalog` (+ formulaire « Nouveau produit » réel)
2. `recipes` (fiches techniques + composants)
3. Réglages : **emplacements éditables** · `users` (au moins proprio)
4. `clients`

**Phase 2 — Cœur transactionnel** (source de vérité)
5. `sale` (écrit vente+lignes ; `occurred_at` Europe/Paris ; dérive `fulfillment`)
6. `orders` (file de prod ; avance `fulfillment` a_produire→en_prod→pret→remis)
7. `history` (ventes remises ; ChanFilter)

**Phase 3 — Dérivés analytiques** (lisent les sources uniques)
8. `dashboard` (verdict tricolore + 3 key insights + 7 blocs)
9. `insight` · 10. `finance` · 11. `sales` · 12. `productivity`

**Phase 4 — Cuisine & conformité**
13. `stock` (lots + DLC) · 14. `haccp` · 15. `prod` (prévision, requiert historique)

**Phase 5 — Périphérie**
16. `notifs` (règles) · 17. `import` (mapping **provisoire configurable**) ·
18. `commu` (social — périmètre ouvert)

Chaque écran livré avec son **état vide** explicite (spec HANDOFF §02) : jamais de
`NaN`, `0/0`, ni graphe cassé. Chaque CTA écrit **vraiment** en base.

---

## 3. Vérification contre les règles non négociables

- [x] **Modèle, pas contenu** — zéro seed démo ; seed = enums + 3 emplacements + proprio.
- [x] **Emplacements** = table éditable à FK, soft delete `actif=false`.
- [x] **2 modes** `unite`/`poids` seulement ; bowl vendu à l'unité mais déplié en composants.
- [x] **Sources uniques** — vue `v_vente_remise` partagée (CA sur `remis`) ; insights table unique ; marges nommées distinctement ; composant lu par `id`.
- [x] **`occurred_at`** capturé à l'encaissement, Europe/Paris, jamais dérivé de `created_at`.
- [x] **États vides** gérés écran par écran (HANDOFF §02).
- [x] **CTA réels** écrivant en base.
- [x] **RLS** activé dès la création des tables.
- [x] **Points ouverts non tranchés seul** — voir §4.

---

## 4. Points ouverts — signalés, NON tranchés seul (HANDOFF §05–06)

1. **Import caisse** : mapping CSV + déduction de mode **provisoires**. Je construis
   l'écran avec mapping **configurable**, lignes au mode déduit marquées « à
   confirmer », lignes inconnues **exclues**. Aucun parseur figé.
2. **Règles insights + seuils d'alerte (stock, DLC)** : je pose la structure et
   l'état vide ; **je ne fige pas les règles** — à valider avec toi.
3. **Modèle de rôles/permissions par écran** : bootstrap (owner + équipe) ;
   modèle fin à préciser.
4. **Périmètre du référentiel social** : squelette create/schedule ; cadrage à venir.
5. **Matérialisation de la recette virtuelle du bowl** : le contrat **recommande**
   une recette virtuelle par bowl signature (compositions libres dépliées sans
   parent). J'adopte cette reco **par défaut**, à confirmer.

## 5. Décisions base prises (Contrat §06 « appel base CC »)
Enums natifs Postgres (sauf emplacement) · `montant_total` stocké · normalisation
vente/ligne/ligne_composant conforme au contrat · index `(occurred_at, canal)`.
