# Guide d'intégration — du design au produit

**Dossier de passation · destiné à Claude Code**
Projet : l'Atelier ALM (À Léon Mange)
Cible : réimplémentation **Next.js + Supabase**

---

## ⚠ À lire avant tout — nature de la maquette

La maquette et **toutes ses données** sont un **artefact de démonstration**. Elle illustre l'expérience et valide la forme des écrans avec l'équipe. **Aucune** donnée n'est destinée à la production — ni les ventes, ni les stocks, **ni le catalogue**.

Les **58 produits** du catalogue sont des exemples plausibles **inventés**, pas les vrais plats d'ALM. En base, tout le contenu sera **refait proprement** avec des données validées par les chefs (catalogue, recettes, coûts) et l'équipe marketing (social).

**CC ne porte pas le contenu de la maquette en base. Tu portes le _modèle_, pas les exemples.**

---

## 00 · Les trois pièces de la passation

1. **`ALM - Atelier.dc.html`** — la maquette complète (17 écrans). Référence **visuelle et comportementale** de forme, **pas de contenu**. Ouvre-la, clique tout : c'est le geste attendu à reproduire.
2. **Contrat de données — la Vente** (`ALM - Handoff CC - Contrat de données Vente.dc.html`) — référence **structurelle** (schéma, enums, nullabilité, consommateurs). Marqué **v1 — révisable sur deux fronts : l'export caisse réel ET les corrections de conformité actées** (emplacement = référentiel éditable à FK, modèle à 2 modes).
3. **Ce guide d'intégration** — écran par écran, les 3 natures de données, la cohérence des sources uniques, les états vides et les points ouverts.

---

## 01 · Trois natures de données, trois traitements

La distinction structurante du projet. Range chaque donnée dans l'une des trois — elle décide de ce qui entre en base et de ce qui reste dans la maquette.

### A · STRUCTURE du référentiel — **À CONSERVER (c'est le modèle)**

Le **contenant**. Il définit la forme, pas les exemples. À porter tel quel :

- Le schéma **produit** : `canal`, `mode`, prix, composants (recette).
- Les **enums** :
  - canal : `truck` · `boutique` · `traiteur`
  - mode : `unite` · `poids` **(2 modes — `portion` et taille S/M/L retirés)**
  - paiement : `especes` · `cb` · `virement` · `ticket`
  - origine
  - fulfillment : `a_produire` · `en_prod` · `pret` · `remis`
- Les **emplacements truck** — **réels et à seeder** : `oingt` (Mar · Marché du Bois d'Oingt), `tassin` (Mer · Tassin-la-Demi-Lune), `salvagny` (Jeu · La Tour-de-Salvagny). **⚠ PAS un enum** — c'est une **table de référentiel éditable** (voir ci-dessous).

#### Emplacements truck — modèle (point d'architecture critique)

Les emplacements changent presque tous les ans (un marché ferme, un autre ouvre). Donc :

- **Table de référentiel éditable**, gérée par l'équipe depuis **Réglages** (ajouter / renommer / désactiver), comme le catalogue produits. **Pas un enum en dur** — sinon changer d'emplacement exigerait un redéploiement.
- **On ne SUPPRIME jamais — on DÉSACTIVE** (`actif=false`) : l'emplacement quitte les choix de saisie mais reste en base. **Raison critique** : les ventes passées doivent garder leur emplacement d'origine même s'il ferme, sinon la saisonnalité historique est corrompue (les ventes de Tassin 2026 restent « Tassin » même si le truck quitte Tassin en 2027).
- La vente stocke une **référence (FK)** vers l'emplacement, jamais une chaîne libre — intégrité garantie, liste éditable.

### B · CONTENU du référentiel — **À REFAIRE (ne pas porter)**

Le catalogue des **58 produits**, leurs prix, recettes et coûts : **démo inventée**. En base :

- **Catalogue vide au départ.** Rempli ensuite à la main avec les vraies données validées chefs + marketing.
- Donc les **écrans/formulaires de saisie du référentiel** (créer un produit, une recette, un composant) sont des **fonctionnalités réelles**, pas des maquettes : c'est par là qu'entre le vrai contenu. **À implémenter en priorité.**

### C · TRANSACTIONNEL — **NAÎT VIDE (se remplit par l'usage)**

Ventes, commandes, mouvements de stock, insights, historique, agrégats. **Aucun seed de démo.** Ces tables partent vides et se remplissent par l'exploitation réelle.

---

## 02 · Écran par écran

Pour chaque écran : ce qu'il affiche, ses sources, ses CTA et leur **état réel attendu** (fonctionnels — pas des toasts de démo), et son **état vide** au lancement (catalogue vide ET transactionnel vide). Aucun écran ne doit casser, afficher `NaN` ou un graphe vide non géré.

### Accueil

#### `dashboard` — Tableau de bord
- **Affiche** : Verdict d'état tricolore (constats, sans verbe) · **3 key insights** (teaser) · bandeau « X/7 blocs en réel » · 7 blocs : CA/canal vs J-7, objectif du jour, ventes + panier moyen, top plat, charge à produire + prochain créneau, commandes traiteur J/J+1/J+2, alertes vitales.
- **Sources** : Agrège les autres écrans. Key insights = **même source que Insight stratégique** (ne pas recalculer). CA = ventes `fulfillment=remis` du jour.
- **CTA réels** : Clic key insight → ouvre Insight. Clic bloc → écran source (charge→Production, alertes→Stocks, traiteur→Commandes). Boutons de navigation, pas d'action mutante.
- **État vide** : Verdict « Journée pas encore démarrée » ; 0 vente → panier moyen masqué (pas `0/0`) ; blocs affichent « aucune donnée aujourd'hui » ; bandeau « 0/7 ».

#### `notifs` — Notifications
- **Affiche** : Fil d'alertes (rupture stock, DLC, seuil, commande traiteur à confirmer) + préférences par canal (in-app / e-mail).
- **Sources** : Générées par des **règles** sur le transactionnel + référentiel (seuils stock, DLC lots). Préférences = table de config utilisateur.
- **CTA réels** : Marquer lu / tout lire (persisté) · toggle préférence (persisté) · clic notif → écran concerné.
- **État vide** : « Aucune notification » — rien à traiter. Le badge de nav disparaît (pas `0`).

### Activité

#### `sale` — Saisie de vente
- **Affiche** : Sélecteur canal (+ emplacement si truck) · panier par mode : **unité** (bowls truck en format unique, plats préparés, produits à la pièce), **poids** (prix/kg × grammes, pas 50 g) · mode de paiement · mode de vente (instantané / précommande) · total live. Le bowl reste **composé** (déplié en composants pour le gaspi) mais se **vend à l'unité**.
- **Sources** : Lit le **catalogue** (référentiel) filtré par canal. **Écrit** une `vente` + lignes — c'est LA source de vérité transactionnelle.
- **CTA réels** : « Encaisser » → écrit la vente (`occurred_at` = maintenant, Europe/Paris), fixe `fulfillment` (`remis` si comptoir instantané, sinon `a_produire`). Pas de toast : vraie écriture.
- **État vide** : **Catalogue vide → « Aucun produit sur ce canal — ajoutez-en au Catalogue »** avec lien. Panier vide → « Encaisser » désactivé. Jamais de total `NaN`.

#### `orders` — Commandes du jour
- **Affiche** : File de production des **précommandes** par jour → créneau → commande dépliable, + charge par composant. C&C boutique et traiteur. (Le comptoir instantané n'apparaît pas ici — il est déjà `remis`.)
- **Sources** : Ventes avec `mode_vente=precommande` et `fulfillment ≠ remis`, groupées par `due` (jour/créneau).
- **CTA réels** : Faire avancer le `fulfillment` (a_produire → en_prod → pret → remis) — **vraie mutation d'état**, se répercute partout (dashboard, historique quand remis).
- **État vide** : « Aucune commande à produire » par jour ; charge composant masquée si 0.

#### `history` — Historique des ventes
- **Affiche** : Ventes remises par jour, KPI (CA, nb ventes, panier), filtre canal + emplacement (ChanFilter partagé). Marque **Import** les ventes issues de l'import caisse.
- **Sources** : Ventes `fulfillment=remis`. **Même source que Finances** — dérivations, pas de calcul parallèle.
- **CTA réels** : Filtrer (recalcul live des KPI) · ouvrir le détail d'une vente. Lecture seule sur le passé.
- **État vide** : « Aucune vente enregistrée » ; KPI à `0 €` proprement, panier moyen masqué si 0 vente.

#### `import` — Import caisse
- **Affiche** : Dépôt CSV → mapping colonnes → prévisualisation (lignes valides / à mapper) → validation batch. Déduit le `mode` quand absent (marqué « mode déduit · à confirmer »).
- **Sources** : Fichier caisse boutique en fin de journée. **Écrit** des ventes dans l'historique (source transactionnelle).
- **CTA réels** : Valider → injecte les ventes valides (comme Saisie). Lignes à désignation inconnue → bloquées jusqu'à mapping produit.
- **État vide** : Avant fichier : zone de dépôt seule. **Mapping PROVISOIRE** — voir §05, à caler sur un vrai export.

### Cuisine

#### `catalog` — Catalogue
- **Affiche** : Les produits par canal, avec mode/prix/format. Un même composant peut apparaître sur plusieurs canaux (recouvrement intentionnel) — **un seul objet**, compté une fois.
- **Sources** : Le **référentiel produit** (STRUCTURE à conserver, CONTENU à refaire).
- **CTA réels** : **« Nouveau produit » → formulaire de création réel** (canal, mode, prix, composants). Éditer / retirer d'un canal. C'est l'entrée du vrai contenu.
- **État vide** : **Catalogue vide au lancement** → « Aucun produit — créez le premier » avec CTA proéminent. Tous les écrans en aval en dépendent : soigner cet état.

#### `recipes` — Fiches techniques de production
- **Affiche** : La **fiche technique** de chaque plat : composants, quantités, étapes, rendement. Rôle production (pas commercial — plus de mini-cartes prix/marge, doublon supprimé).
- **Sources** : La recette du référentiel produit (STRUCTURE conservée, CONTENU refait avec les chefs).
- **CTA réels** : Créer / éditer une fiche (composants + étapes) — formulaire de saisie réel du référentiel.
- **État vide** : « Aucune fiche technique — créez-en une » ; suit le catalogue vide.

#### `prod` — Production
- **Affiche** : Prévision de demande + plan de production, avec le ChanFilter comme « prisme » (part de canal × emplacement met la prévision à l'échelle).
- **Sources** : Historique des ventes (tendance) + commandes fermes du jour. Transactionnel.
- **CTA réels** : Ajuster le plan · filtrer par canal (recalcul). Lecture + planification.
- **État vide** : Sans historique : « Pas encore d'historique pour prévoir » — proposer une saisie manuelle du plan plutôt qu'un graphe vide.

#### `haccp` — HACCP
- **Affiche** : Relevés de traçabilité (températures, DLC lots, contrôles). Registre réglementaire.
- **Sources** : Saisies opérateur (transactionnel) + lots stock.
- **CTA réels** : Enregistrer un relevé (horodaté) — vraie écriture, traçabilité.
- **État vide** : « Aucun relevé aujourd'hui » + rappel des contrôles dus.

#### `stock` — Stocks
- **Affiche** : Inventaire par composant/ingrédient, seuils, lots + DLC, alertes rupture.
- **Sources** : Mouvements de stock (transactionnel) déduits des ventes/production + réceptions. Seuils = config référentiel.
- **CTA réels** : Saisir une réception / un ajustement · définir un seuil — vraies mutations.
- **État vide** : « Aucun article en stock » ; pas d'alerte fantôme sans référentiel.

### Pilotage

#### `insight` — Insight stratégique
- **Affiche** : Synthèse décisionnelle : cartes **CONSTAT + CHIFFRE + ACTION**, triées urgence (aujourd'hui / semaine / structurel) → impact. Tags Calculé / Démo.
- **Sources** : **Source unique des insights** (règles sur le transactionnel). Le dashboard lit ce même jeu — ne pas dupliquer la logique.
- **CTA réels** : Chaque « action » → écran d'exécution concerné. Marquer traité / reporter.
- **État vide** : « Rien à arbitrer — pas assez de données ». Les insights naissent avec l'activité.

#### `finance` — Finances
- **Affiche** : CA, marges, coûts, ventilation canal (ChanFilter). Distingue explicitement **marge brute matière** et **marge nette** — noms distincts, jamais confondus.
- **Sources** : Ventes `fulfillment=remis` — **même source que Historique**. Coûts = référentiel (coût matière composant).
- **CTA réels** : Filtrer période + canal (recalcul). Export. Lecture analytique.
- **État vide** : Tous les montants à `0 €` proprement ; ratios/marges masqués si dénominateur 0 (jamais `NaN%`) ; graphes « pas de données sur la période ».

#### `sales` — Ventes & tendances
- **Affiche** : Courbes de ventes, top produits, saisonnalité, comparaisons période/période/canal.
- **Sources** : Historique des ventes agrégé. Dérivation, pas source parallèle.
- **CTA réels** : Changer période / granularité / canal (recalcul).
- **État vide** : « Pas encore de tendance — revenez après quelques ventes » ; axes vides gérés, pas de graphe cassé.

#### `productivity` — Productivité
- **Affiche** : Cadence de production, temps par plat, débit par créneau/emplacement.
- **Sources** : Transitions de `fulfillment` horodatées + fiches techniques (temps théoriques).
- **CTA réels** : Filtrer période / poste. Lecture.
- **État vide** : « Aucune production mesurée » ; pas de moyenne sur 0.

#### `clients` — Clients
- **Affiche** : Fiches clients (surtout traiteur / C&C), historique de commandes, récurrence.
- **Sources** : Clients rattachés aux ventes/commandes (transactionnel). Le comptoir anonyme n'en crée pas.
- **CTA réels** : Créer / éditer une fiche client · ouvrir son historique.
- **État vide** : « Aucun client enregistré » + CTA de création.

### Marketing

#### `commu` — Réseaux sociaux
- **Affiche** : Planning/feed de publications par réseau, calées sur les vrais emplacements truck.
- **Sources** : Contenu marketing (référentiel social) — **à refaire** avec l'équipe marketing, la démo est inventée.
- **CTA réels** : Créer / programmer / éditer un post — saisie réelle du contenu social.
- **État vide** : « Aucune publication programmée » + CTA de création.

### Réglages

#### `users` — Utilisateurs & rôles
- **Affiche** : Comptes de l'équipe, rôles/permissions par écran.
- **Sources** : Auth Supabase + table rôles. Non-démo dès le départ (au moins Arnaud + chefs).
- **CTA réels** : Inviter / éditer un rôle / désactiver — vraies mutations sécurisées.
- **État vide** : Au minimum le compte propriétaire ; jamais 0 utilisateur.

---

## 03 · Cohérence des sources uniques

À préserver en base. Ces règles évitent les chiffres divergents entre écrans. **Un calcul, plusieurs vues — jamais l'inverse.**

- **CA compté une seule fois** sur `fulfillment=remis`. Une commande précommandée non remise n'est pas du CA.
- **Finances et Historique** dérivent de la **même source** de ventes remises. Pas de recompte indépendant.
- **Key insights du dashboard = même source** que Insight stratégique (même tri urgence→impact, `.slice(0,3)`). Zéro logique parallèle.
- **Marges nommées distinctement** : **brute matière** (prix − coût matière) vs **nette** (après charges). Jamais le même libellé pour deux calculs.
- **Composant compté une fois** même s'il apparaît sur plusieurs canaux (recouvrement catalogue intentionnel). Coût matière / gaspi lit le composant par son `id`, jamais par canal.

---

## 04 · `occurred_at`

`occurred_at` est capturé **à l'encaissement**, fuseau **Europe/Paris**, et **jamais dérivé de `created_at`**. Un import de fin de journée peut être créé à 21 h pour des ventes survenues à midi : `occurred_at` porte l'heure réelle de la vente, `created_at` l'heure d'insertion. Toute l'analytique temporelle (jour, créneau, tendance) lit `occurred_at`.

---

## 05 · Import caisse — point ouvert

**⚑ Non figé — à caler avec CC + Arnaud**

Le **mapping CSV est provisoire** et la **déduction de mode** (quand la colonne manque) est une hypothèse. Ils doivent être calés sur un **vrai export de la caisse boutique**, non disponible à ce stade.

N'implémente pas le parseur comme spec finale : garde le mapping **configurable** (l'écran le prévoit déjà) et signale toute ligne au mode déduit comme « à confirmer ». La spec définitive suit la réception d'un export réel — ce qui déclenchera aussi la révision du contrat de données v1.

---

## 06 · Points ouverts — à trancher par CC / Arnaud

Signalés plutôt que tranchés à ta place.

1. **Format d'export caisse boutique** → fige mapping d'import + déduction de mode + révision du contrat v1.
2. **Structure des tables Supabase** (normalisation vente/lignes, stock, insights) — laissée à ton appréciation ; le contrat fige les champs, pas le schéma physique.
3. **Règles exactes des insights et seuils d'alerte** (stock, DLC) — à valider avec Arnaud avant de figer.
4. **Périmètre du référentiel social** et outillage de programmation — cadrage marketing.
5. **Modèle de rôles/permissions** par écran — à préciser (qui saisit, qui pilote, qui encaisse).

---

**En résumé :** porte la **structure** et le **comportement**, pas le **contenu**. Catalogue et transactionnel partent **vides**. Chaque écran gère son **état vide**. Les **sources uniques** ne se dupliquent pas. Et quand un doute subsiste — **signale-le** au lieu de deviner.
