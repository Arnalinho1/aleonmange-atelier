# Guide d'intégration — Profil & Stock (liste d'achat)

**Complément de passation · destiné à Claude Code**
Projet : l'Atelier ALM (À Léon Mange) · cible **Next.js + Supabase**
Portée : les **deux dernières features livrées** — `profile` (Mon profil) et l'onglet **À racheter** de `stock`.

> À lire **après** `HANDOFF.md` (le guide maître). Les mêmes règles s'appliquent : on porte la **structure** et le **comportement**, pas le **contenu** de démo. Ce document ne fait que **compléter** les fiches `stock` et Réglages du guide maître avec ce qui a été ajouté depuis.

---

## 00 · Le fil rouge des deux features — CONFIG PERSO vs CONFIG PARTAGÉE

C'est **le** point d'architecture à retenir, et il traverse les deux écrans. Une donnée de configuration tombe dans l'une de deux catégories, qui décident **où** elle vit et **qui** elle affecte :

| | **Préférence personnelle** | **Config métier partagée (référentiel)** |
|---|---|---|
| Portée | Un utilisateur, sa session | Tout l'établissement, toute l'équipe |
| Exemples | canal par défaut à la Saisie, écran d'accueil, alertes perso | **seuil d'alerte d'un composant**, emplacements truck, catalogue |
| En base | table `profiles` (ou `user_preferences` liée à `auth.users`) | attribut **sur l'entité du référentiel** (ici : le composant) |
| RLS | l'utilisateur ne lit/écrit **que les siennes** | lecture équipe, écriture selon rôle |

- **`profile`** livre le premier versant : les **préférences personnelles**.
- **`stock` → seuil par composant** livre le second : une config qui **ressemblait** à un réglage global (l'ancien `notifSeuil = 20`) mais qui est en réalité un **attribut partagé du composant**.

⚠ **Ne mélange pas les deux.** Le seuil n'est **pas** une préférence de l'utilisateur qui l'a saisi : si Audrey descend le seuil du saumon à 15, Victorien voit 15 aussi. À l'inverse, le canal par défaut d'Audrey ne doit **jamais** changer l'écran de Victorien. Même famille de bug évitée deux fois (déjà signalé sur les notifs).

---

## 01 · `profile` — Mon profil (Réglages)

Écran **personnel** de l'utilisateur connecté. **Distinct** de `users` (Utilisateurs & rôles), qui gère l'**équipe et les accès partagés** — les deux ne se recouvrent pas et se renvoient l'un à l'autre par un lien.

### Affiche
- **Mon compte** : nom affiché, adresse e-mail, initiale d'avatar (placeholder), actions **Changer le mot de passe** et **Se déconnecter**.
- **Mes préférences de travail** (bandeau explicite : *« n'affectent que votre session »*) :
  - **Canal par défaut à l'ouverture de la Saisie** — `ask` (Demander) · `truck` · `boutique` · `traiteur`. `ask` = pas de présélection.
  - **Écran d'accueil par défaut** — `dashboard` · `sale` · `orders`. C'est l'écran ouvert à la connexion.
  - **Apparence (clair / sombre)** — **placeholder désactivé**, marqué *« Optionnel · à confirmer »*. Non maquetté. À activer seulement si l'équipe le demande (utile plein soleil au marché / tablette comptoir). Ne pas implémenter sans validation.
  - **Gérer mes alertes** → **lien** vers `notifs` (onglet préférences). **Pas de doublon** : les préférences de notification vivent dans Notifications, le profil y renvoie.

### Sources
- Table **`profiles`** (déjà prévue dans le schéma back-office : FK `auth.users`, rôle) — étendue avec les préférences perso, OU une table `user_preferences` séparée liée à `auth.users`. À ton appréciation ; l'important est le **rattachement à l'utilisateur** et la **RLS “owner-only”**.
- Le nom/e-mail sont ceux du compte **auth Supabase**.

### CTA réels (pas des toasts)
- **Changer le mot de passe** → flux **auth Supabase** (lien sécurisé par e-mail). Dans la maquette : `flash` explicatif — en prod, vraie action auth.
- **Se déconnecter** → `signOut()` auth, retour écran de connexion.
- **Enregistrer** (nom, e-mail, préférences) → persistance sur `profiles`/`user_preferences`.
- Sélection canal/accueil → **persistée immédiatement** et **relue au chargement** : le canal par défaut présélectionne la Saisie, l'accueil route la connexion.

### Consommateurs des préférences
- `sale` lit **canal par défaut** pour présélectionner le sélecteur de canal (si ≠ `ask`).
- Le **routeur post-login** lit **écran d'accueil** pour la redirection initiale.
- Ne recalcule ni ne duplique ces valeurs ailleurs : **une source, plusieurs lecteurs**.

### État vide / défauts
- Un profil existe toujours pour un utilisateur connecté (au moins le compte). Pas d'état « vide ».
- Défauts si non renseigné : canal `ask`, accueil `dashboard`. Fonctionnel sans configuration.
- Nom/e-mail de démo (`Audrey Depouilly`, `audrey@aleonmange.fr`) = **placeholder** — viennent du compte auth réel en prod.

---

## 02 · `stock` — onglet « À racheter » (liste de réapprovisionnement)

Ajouté **dans** l'écran Stocks comme **onglet** (`Niveaux | À racheter`), pas un écran séparé : même donnée (niveaux + seuils), même espace mental, adjacent à la réception.

### 2.1 — Le seuil devient un ATTRIBUT DU COMPOSANT ⚠ (changement de modèle)

**Le point le plus important pour l'intégration.** Avant : un seuil **global unique** (`notifSeuil`, 20). Désormais :

- Le seuil est un **attribut du composant** dans le **référentiel** — `component.seuil_alerte` (portions). Config **partagée** (cf. §00), pas une préférence perso, pas une constante en dur.
- **Éditable** par composant depuis le tiroir déplié d'un composant (onglet Niveaux). Écriture = mutation du référentiel, soumise au rôle.
- **Fallback pour rester fonctionnel out-of-the-box** (ne pas exiger de configurer 40 composants à la main) :

  ```
  seuil effectif  =  override composant  ??  défaut par catégorie  ??  seuil global (20)
  ```

  Dans la maquette, le défaut par catégorie est : protéine 24 · féculent 40 · légume 30 · sauce 20. En base : soit tu stockes une valeur par défaut par catégorie, soit tu initialises `seuil_alerte` de chaque composant à ce défaut à la création. **L'important** : la colonne existe **sur le composant**, avec une valeur **sensée dès le seeding**.
- Un bouton **↺ défaut** remet le seuil à sa valeur héritée (efface l'override).

**Répercussions transverses** — le seuil pilote le **statut** (`ok`/`sous seuil`/`rupture`) partout : KPIs Stocks, alertes Notifications, key insights du dashboard. Tous doivent lire le **même** `seuil_alerte` du composant. Ne recalcule pas de seuil ailleurs.

### 2.2 — La liste d'achat

Une ligne par composant **sous son seuil** (statut `sous seuil` ou `rupture`), triée rupture → sous-seuil → montant.

Par ligne :

| Champ | Nature | Calcul / source |
|---|---|---|
| **Manque** | **CALCULÉ** (réel) | `max(0, seuil − stock)` |
| **Quantité suggérée** | **DÉMO** (estimation) | `cible − stock`, cible = `2 × seuil` (palier de réassort) |
| **Quantité retenue** | saisie | override manuel `??` quantité suggérée |
| Équivalent kg | dérivé | `qté × grammage_portion / 1000` (indicatif) |
| **Coût estimé** | dérivé | `qté × coût matière/portion` |
| **Fournisseur** | saisie **optionnelle** | texte libre par ligne — **pas de référentiel fournisseurs** |
| **Commandé** | flag | case à cocher (voir 2.3) |

⚠ **Honnêteté des données à préserver en prod** — la distinction est **affichée** à l'utilisateur (bandeau + tags) et ne doit pas se perdre :
- Le **manque** est **calculable dès aujourd'hui** (seuil − stock) → réel.
- La **quantité suggérée** repose sur une **cible de réassort forfaitaire** (`2 × seuil`), faute de conso réelle → **estimation**. Quand l'historique de consommation existera, **remplace la cible par une conso prévisionnelle** (moyenne mobile / prévision) **sans changer l'UI** : la formule reste `cible − stock`, seule la façon de calculer `cible` évolue. C'est la raison de cette abstraction.
- L'override manuel est **toujours** prioritaire.

**Choix produit assumés (périmètre bootstrap, 2–3 personnes) :**
- **Fournisseurs** : version légère. Champ texte optionnel par ligne, **aucun référentiel fournisseurs** (qui vend quoi, délais, prix négociés). Évolution possible, pas pour ce sprint.
- Prix d'achat = le **prix matière déjà porté par le composant** (`prix d'achat au kg` du composant prépa). Pas de nouveau champ prix.

### 2.3 — Où la feature s'arrête (périmètre)

- **Commandé** = un simple **flag de suivi** par ligne. Cocher grise la ligne et bascule son montant de *« À commander »* vers *« Déjà commandé »* (KPIs en tête d'onglet). C'est une **liste de courses**, pas un module d'achat.
- La feature **ne gère PAS la réception**. L'**entrée réelle en stock** reste l'action **« Ajuster »** existante de l'onglet Niveaux (saisie d'inventaire / réception). Un bandeau le rappelle à l'utilisateur.
- Donc **pas** de bon de commande fournisseur, pas de workflow d'approbation, pas de réception partielle. Si le besoin monte un jour → c'est là qu'un vrai référentiel fournisseurs + PO entrerait (évolution).

### 2.4 — Sources & modèle
- **Univers stock** = composants prépa (`cat ∈ {proteine, feculent, legume, sauce}`). Les **produits finis n'ont pas de niveau de stock ici** et n'apparaissent **jamais** dans la liste (voir correctif 2.5).
- Niveaux = mouvements de stock (transactionnel, déduits ventes/production + réceptions). **Naît vide.**
- Le flag « commandé » et le fournisseur/qté saisis : à décider selon ton schéma. Deux options :
  1. **Éphémère** (état de session/écran) — cohérent avec « liste de courses » jetable, remise à zéro après réception.
  2. **Persisté** — une table légère `reappro_ligne` (composant, qté, fournisseur, commandé, horodatage) si Arnaud veut retrouver la liste d'un jour à l'autre.
  Défaut recommandé : **éphémère**, tant qu'il n'y a pas de vrai flux d'achat. À confirmer avec Arnaud.

### 2.5 — Correctif de conformité livré au passage (à répercuter)
En livrant, un défaut préexistant a été corrigé : les **KPIs et la liste Niveaux comptaient tout le catalogue** (produits finis inclus, tous à niveau 0 → faussement « rupture » → **44 ruptures affichées**, filtre « Tous · 59 »). **L'univers stock est désormais scopé aux composants prépa** → Ruptures **2**, « Tous · 17 », cohérent avec les 7 références à racheter (5 sous seuil + 2 ruptures). **En base : ne calcule le statut de stock que sur les entités qui ont réellement un niveau** (composants), jamais sur les produits finis vendus.

### 2.6 — État vide
- Aucun composant sous son seuil → **« Tout est au-dessus du seuil »** (état vide soigné, pas une liste vide muette).
- Référentiel vide au lancement → aucune ligne, aucune alerte fantôme.

---

## 03 · Rappel des sources uniques (ces deux features)

- **Un seul `seuil_alerte` par composant**, lu par : statut Stocks, alertes Notifications, key insights dashboard, liste d'achat. Zéro recalcul parallèle.
- **Préférences perso lues, pas dupliquées** : `sale` lit le canal par défaut, le routeur lit l'accueil — la valeur vit dans `profiles`/`user_preferences`.
- **Manque = calculé, quantité = estimée** : garde le tag visible. Le jour où la conso réelle alimente la cible, ne change que le calcul de `cible`, pas l'UI ni le contrat.

---

## 04 · Points ouverts — à trancher par CC / Arnaud

1. **Persistance de la liste d'achat** : éphémère (recommandé) vs table `reappro_ligne` persistée. → §2.4.
2. **Défaut de seuil** : valeur par défaut par catégorie stockée en table, ou `seuil_alerte` initialisé par composant au seeding. → §2.1.
3. **Cible de réassort** : forfait `2 × seuil` aujourd'hui → **remplacer par conso prévisionnelle** quand l'historique existe. Valider la formule cible avec Arnaud. → §2.2.
4. **Référentiel fournisseurs** : hors périmètre bootstrap. À rouvrir si un vrai flux d'achat / PO devient nécessaire. → §2.3.
5. **Thème clair/sombre** (profil) : placeholder — n'implémenter que sur demande explicite. → §01.

---

**En résumé :** deux faces d'une même règle. `profile` = **config personnelle** (par utilisateur, RLS owner-only). `stock`/seuil = **config partagée** (attribut du composant, lu partout). La liste d'achat sépare le **calculé** (manque) de l'**estimé** (quantité) et **s'arrête au flag « commandé »** — la réception reste l'ajustement existant. Et quand un doute subsiste — **signale-le** au lieu de deviner.
