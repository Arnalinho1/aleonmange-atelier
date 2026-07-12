# Handoff — Atelier ALM (À Léon Mange)

Back-office de gestion pour un traiteur / food truck / boutique. Réimplémentation cible : **Next.js + Supabase**.

---

## Vue d'ensemble

L'**Atelier ALM** est l'application interne de pilotage d'À Léon Mange : saisie de vente multi-canal, production, stocks, HACCP, finances, analytique et marketing. Une cheffe (Audrey) et l'équipe l'utilisent au quotidien sur desktop. La maquette compte **17 écrans** dans un shell à sidebar persistante.

Trois canaux de vente structurent tout le produit : **food truck** (3 emplacements réels : Marché du Bois d'Oingt le mardi / Tassin-la-Demi-Lune le mercredi / La Tour-de-Salvagny le jeudi), **boutique** (comptoir + click & collect), **traiteur** (précommande). Deux modes de tarification : **unité** (bowls truck en format unique, plats préparés, produits à la pièce) et **poids** (prix/kg × grammes). Le bowl reste **composé** (déplié en composants pour le gaspi) mais se **vend à l'unité**.

### Emplacements truck — modèle (point d'architecture critique)

Les 3 emplacements réels à seeder : **Marché du Bois d'Oingt** (mardi, `oingt`), **Tassin-la-Demi-Lune** (mercredi, `tassin`), **La Tour-de-Salvagny** (jeudi, `salvagny`).

- **PAS un enum.** C'est une **table de référentiel éditable**, gérée depuis Réglages (ajouter / renommer / désactiver), comme le catalogue. Les emplacements changent presque tous les ans — un enum en dur imposerait un redéploiement.
- **On ne supprime jamais un emplacement, on le désactive** (`actif=false`) : il quitte les choix de saisie mais reste en base. Raison critique : les ventes passées gardent leur emplacement d'origine même s'il ferme, sinon la saisonnalité historique est corrompue (les ventes de Tassin 2026 restent « Tassin » même si le truck part en 2027).
- La vente porte une **FK** (`emplacement_id`) vers l'emplacement, jamais une chaîne libre.

---

## À propos des fichiers de design

Les fichiers de ce paquet sont des **références de design réalisées en HTML** — des prototypes qui montrent l'aspect et le comportement voulus, **pas du code de production à copier tel quel**. La tâche est de **recréer ces designs dans l'environnement cible** (Next.js + Supabase) avec ses patterns et librairies établis.

La maquette est écrite comme un « Design Component » (fichier `.dc.html` à styles inline, rendu par `support.js`). Ne porte pas ce runtime : lis-le comme la spec visuelle et comportementale.

---

## Fidélité : **Hi-fi**

Couleurs, typographie, espacements et interactions sont finaux. Recrée l'UI au pixel près avec les librairies du codebase. Les valeurs exactes sont dans **Design Tokens** ci-dessous et lisibles dans les styles inline de la maquette.

---

## ⚠ Nature des données — à lire avant d'implémenter

**Toutes les données de la maquette sont de la démonstration.** Voir `HANDOFF.md` (Guide d'intégration complet) pour le détail. En résumé, trois natures :

- **STRUCTURE du référentiel** → **à conserver** (schéma produit, enums, emplacements truck réels). C'est le modèle. Note : les emplacements sont une **table éditable** (FK depuis la vente), pas un enum — voir plus bas.
- **CONTENU du référentiel** → **à refaire** (les 58 produits/prix/recettes sont inventés). Catalogue **vide au départ**, rempli via les formulaires de saisie réels validés chefs + marketing.
- **TRANSACTIONNEL** (ventes, commandes, stock, insights) → **naît vide**, aucun seed.

**Tu portes le modèle, pas les exemples.** Chaque écran doit gérer proprement son **état vide** (jamais de `NaN`, de `0/0`, ni de graphe cassé).

---

## Écrans / Vues

Les 17 écrans, leur rôle, sources, CTA réels et états vides sont documentés **exhaustivement dans `HANDOFF.md`** (§02). Résumé de la navigation (sidebar, groupée) :

**Accueil** — `dashboard` (Tableau de bord : verdict tricolore + 3 key insights + 7 blocs), `notifs` (Notifications).
**Activité** — `sale` (Saisie de vente multi-mode), `orders` (Commandes du jour / file de production), `history` (Historique des ventes), `import` (Import caisse CSV).
**Cuisine** — `catalog` (Catalogue produits), `recipes` (Fiches techniques de production), `prod` (Production / prévision), `haccp` (Traçabilité), `stock` (Stocks + lots + DLC).
**Pilotage** — `insight` (Insight stratégique : CONSTAT + CHIFFRE + ACTION), `finance` (Finances), `sales` (Ventes & tendances), `productivity` (Productivité), `clients` (Clients).
**Marketing** — `commu` (Réseaux sociaux).
**Réglages** — `users` (Utilisateurs & rôles).

### Shell (commun à tous les écrans)

- **Sidebar** `flex:0 0 250px`, fond `#0E3947`, sticky pleine hauteur, scrollable. En-tête : logo rond (`assets/alm-mark.png`, 42px) + « A Léon Mange » (Bricolage 800, 18px, `#F6F1E7`) + « Atelier » (mono, 9.5px, tracking .18em, `#8FCFE2`). Nav groupée : titres de groupe en mono uppercase `#5C8593` ; items = boutons à icône (20px) + label, badge optionnel (pill `#D81020`). Pied : avatar `#3FA8CE` + nom/rôle.
- **Topbar** sticky, `rgba(237,231,218,.86)` + `backdrop-filter:blur(10px)`, bordure basse `#DFD4BF`, padding `14px clamp(18px,3vw,34px)`. Champ de recherche (max 420px, fond `#F6F1E7`, radius 11px).
- **Zone principale** fond `#EDE7DA`.

---

## Interactions & comportement

- **Navigation** : clic item sidebar → change d'écran (état `A` = écran actif). Les CTA de navigation ne mutent pas de données.
- **CTA réels attendus** (pas des toasts de démo) — détaillés par écran dans `HANDOFF.md` :
  - `sale` « Encaisser » → écrit une vente (`occurred_at` = maintenant Europe/Paris, `fulfillment` = `remis` si comptoir instantané sinon `a_produire`).
  - `orders` → fait avancer le `fulfillment` (`a_produire → en_prod → pret → remis`), répercuté partout.
  - `import` → injecte les ventes valides dans l'historique (lignes inconnues bloquées jusqu'à mapping).
  - `catalog` / `recipes` / `stock` / `clients` / `commu` → formulaires de création/édition réels (entrée du vrai contenu).
- **ChanFilter** (composant partagé, voir `ChanFilter.dc.html`) : barre de filtre canal + emplacement réutilisée sur 7 écrans (production, historique, finances, insight, ventes, réseaux, commandes). Recalcule les KPI en live. Sur `prod`/`prévision`, agit comme « prisme » : `part de canal × part d'emplacement` met la prévision à l'échelle.
- **Transitions** : hover boutons/pills `transition:all .15s`.
- **Responsive** : desktop-first. Breakpoints à 1080px (`.fz-stock-grid`, `.fz-fin-grid` → 1 colonne) et 900px (`.fz-stock-kpi`, `.fz-fin-kpi` → 2 colonnes).

---

## Cohérence des sources uniques (règles métier critiques)

À préserver en base — un calcul, plusieurs vues :

- **CA compté une fois** sur `fulfillment=remis`. Une précommande non remise n'est pas du CA.
- **Finances et Historique** dérivent de la **même source** de ventes remises.
- **Key insights du dashboard = même source** qu'`insight` (`.slice(0,3)`, même tri urgence→impact). Zéro logique parallèle.
- **Marges nommées distinctement** : brute matière (prix − coût matière) vs nette (après charges).
- **Composant compté une fois** même s'il apparaît sur plusieurs canaux (recouvrement catalogue intentionnel). Lecture par `id`, jamais par canal.
- **`occurred_at`** capturé à l'encaissement, Europe/Paris, jamais dérivé de `created_at` (un import de 21 h peut porter des ventes de midi).

---

## State management

État principal (une classe logique dans la maquette, à décomposer en state/serveur côté Next.js) :

- `A` — écran actif (routing).
- **Référentiel** : catalogue produits (canal, mode `unite`/`poids`, prix, composants/recette), enums, **table emplacements truck éditable** (FK, jamais enum).
- **Transactionnel** : ventes + lignes, commandes (fulfillment), mouvements de stock + lots/DLC, relevés HACCP, insights, notifications + préférences.
- **UI par écran** : sélections ChanFilter (`<screen>Chan` / `<screen>Place`), périodes, filtres, panier de saisie en cours, mapping d'import.

Data fetching : lecture catalogue (référentiel), écriture/lecture ventes (Supabase), règles serveur pour notifications, insights et seuils d'alerte.

---

## Design Tokens

### Couleurs

**Fonds** — `#EDE7DA` (fond app), `#F6F1E7` (cartes / crème), `#0E3947` (sidebar / blocs sombres, deep teal).
**Texte** — `#0E3947` (principal, deep teal), `#6B7469` (secondaire), `#9A927F` (labels / muted), sidebar : `#BFDCE7` / `#8FCFE2` / `#5C8593`.
**Rouge signature** — `#D81020` (badge/accent vif), `#B00D1A` (rouge foncé texte/liens).
**Teal accents** — `#1493BE` (primaire action / info), `#3FA8CE` (avatar/clair), `#0E3947` (foncé).
**Bordures** — `#DFD4BF`, `#D8CDB6`, `#E4DAC6` (docs).
**Placeholder** — `#9A927F`.

**Sémantique (sévérité)**
- Critique : texte `#C0442E`, fond `rgba(192,68,46,.12)`, badge `rgba(192,68,46,.14)`.
- Alerte : texte `#A9761E`, fond `rgba(233,162,59,.20)`, badge `rgba(233,162,59,.24)`.
- Info : texte `#1493BE`, fond `rgba(63,168,206,.16)`.
- Succès (validé) : `#1F7A50` / `#1F8A5B`.

**Verdict tricolore (dashboard)**
- Vert : `#1F8A5B` sur `#E9F3EC` « Bonne journée ».
- Ambre : `#B07A2E` sur `#F6EEDD` « Journée dans le rythme ».
- Rouge : `#B00D1A` sur `#F7E7E4` « Journée sous tension ».
- Bandeau : `border:1px solid <c>40; border-left:5px solid <c>; border-radius:16px; padding:16px 20px`.

### Typographie

- **Display** : `Bricolage Grotesque` (400–800). Titres, chiffres clés, logo. Poids 700–800, letter-spacing ~ −.01em sur les gros titres.
- **Corps** : `Hanken Grotesk` (400–700). Texte courant, 11–14px, line-height ~1.5.
- **Mono** : `Spline Sans Mono` (400–600). Labels uppercase (letter-spacing .06–.18em), codes, tags, valeurs techniques.

Échelle observée : labels mono 9–10.5px · corps 11–14px · titres de carte 15–20px · titres d'écran ~21–33px.

### Rayons & ombres

- Radius : pills `100px` · champs/petits blocs `11px` · cartes `13–18px` · badges pill `100px`.
- Bordures cartes : `1px solid #DFD4BF` (ou `#E4DAC6` sur les docs).
- Scrollbar custom (`.fz-scroll`) : thumb `#D8CDB6`, largeur 10px.
- `::selection` : fond `#D81020`, texte `#F6F1E7`.

---

## Assets

Dossier `assets/` inclus (logos, marque ronde, photos de plats/bowls, packaging, QR, portraits chefs). `alm-mark.png` = logo rond de la sidebar ; `alm-logo.png` = logo complet. Les photos produits sont des placeholders de démo — à remplacer par les vrais visuels ALM.

---

## Fichiers de ce paquet

- **`ALM - Atelier.dc.html`** — la maquette complète, 17 écrans. Référence visuelle + comportementale principale.
- **`ChanFilter.dc.html`** — composant de filtre canal/emplacement partagé (importé par 7 écrans).
- **`support.js`** — runtime du format `.dc.html` (pour ouvrir la maquette dans un navigateur ; **ne pas porter**).
- **`assets/`** — images et logos.
- **`HANDOFF.md`** — **guide d'intégration complet** : 3 natures de données, les 17 écrans (affiche / sources / CTA / état vide), sources uniques, `occurred_at`, import caisse, points ouverts. **À lire en premier.**
- **`ALM - Handoff CC - Guide d'intégration.dc.html`** — même guide, version imprimable (HTML).
- **`ALM - Handoff CC - Contrat de données Vente.dc.html`** — contrat de données de la Vente (schéma, enums, nullabilité, consommateurs). **v1 — révisable sur deux fronts : l'export caisse boutique réel ET les corrections de conformité actées** (emplacement = référentiel éditable à FK, modèle à 2 modes `unite`/`poids`). Le contrat fige les **champs**, pas le schéma physique des tables.

### Comment ouvrir la maquette

Ouvre `ALM - Atelier.dc.html` dans un navigateur (le dossier doit contenir `support.js`, `ChanFilter.dc.html` et `assets/` à côté). Clique dans la sidebar pour parcourir les 17 écrans — c'est le comportement de référence à reproduire.

---

## Points ouverts — à trancher (voir `HANDOFF.md` §06)

1. Format d'export caisse boutique → fige mapping d'import + déduction de mode + révision du contrat v1.
2. Structure des tables Supabase (le contrat fige les champs, pas le schéma physique).
3. Règles exactes des insights et seuils d'alerte (stock, DLC) — valider avec Arnaud.
4. Périmètre du référentiel social — cadrage marketing.
5. Modèle de rôles/permissions par écran.
