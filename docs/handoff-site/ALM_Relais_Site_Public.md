# Relais - Integration du site public A Leon Mange (ALM)

> A coller en ouverture d'une nouvelle conversation. Objectif : cadrer avec Claude Code (CC) l'integration du site public ALM, en garantissant que les commandes passees sur le site (devis traiteur, precommandes boutique et truck) atterrissent proprement dans le back-office Atelier deja en production.

---

## 1. Qui je suis, comment je travaille

Je suis Arnaud, fondateur. Je pilote le projet ALM (A Leon Mange), activite artisanale de restauration du Beaujolais portee par deux chefs, Audrey Depouilly et Victorien Thebault. Trois canaux : boutique physique, food truck (emplacements de marche tournants), traiteur pour evenements.

Je travaille avec trois instances Claude en parallele :
- Claude (coordination, cadrage, strategie, navette entre les instances) ;
- Claude Design (CD, maquettes HTML) : a livre le site public, handoff termine ;
- Claude Code (CC, developpement Next.js + Supabase, deploiement) : c'est avec lui que je vais integrer le site.

Mes preferences de travail :
- Vouvoiement chaleureux.
- Jamais de tirets cadratins dans les textes visibles.
- Noms de dossiers et fichiers en ASCII uniquement.
- Poser des questions ciblees avant de produire, plutot que d'avancer sur des suppositions. Regrouper les corrections en un seul document plutot que d'enchainer des messages.
- CC ne pousse JAMAIS sur main sans mon feu vert explicite. Sur ALM, main = deploiement direct en production. git pull avant tout travail. Build + typecheck + lint verts avant tout commit.
- A chaque livraison, tableau de conformite ecran par ecran (present / volontairement absent / oubli). Les sessions auto de CC produisent parfois une premiere passe qui simplifie sans le signaler : exiger l'audit de conformite systematique.

---

## 2. L'etat des lieux : ce qui existe deja en production

L'Atelier (le back-office interne des chefs) est **deja developpe et en production** sur https://aleonmange-atelier.vercel.app. Il gere la saisie de ventes, la production, les stocks, les finances, les clients, sur les trois canaux. Il vient de recevoir un gros chantier facturation (voir section 4).

Le site public, lui, **n'existe pas encore en code**. Les maquettes CD sont pretes, le handoff est fait (fichiers joints, voir section 6). C'est le chantier a lancer.

Point d'architecture DECIDE : le site public sera un **monorepo** avec l'Atelier. Un dossier `site/` a la racine du repo, un nouveau projet Vercel distinct dont le Root Directory est `site/`, sa production sur main. Le site et l'Atelier partagent donc le meme repo et la meme base Supabase, mais sont deux applications deployees separement.

---

## 3. LE POINT CENTRAL : comment les commandes du site arrivent dans l'Atelier

C'est la dependance critique. Le site public n'est pas une vitrine isolee : c'est une **source d'entree** pour le pipeline de vente que l'Atelier gere deja. Trois flux d'ecriture partent du site vers la base commune.

### 3.1 Precommande boutique (click & collect) et precommande truck
- Le click & collect boutique EXISTE deja comme concept metier chez ALM (commande anticipee, retrait en boutique). La precommande truck est ouverte aussi cote site.
- Ces commandes ecrivent dans le **pipeline de vente existant** de l'Atelier : une `vente` avec `source = 'web'` et un etat de production `fulfillment = 'a_produire'`. Elles n'inventent PAS un nouvel objet ni un nouvel ecran cote Atelier : elles alimentent l'ecran "Commandes du jour" que les chefs utilisent deja.
- Etat a la creation : **`web_a_confirmer`**. Une commande web n'entre jamais directement en production : elle attend la **confirmation manuelle du chef** dans l'Atelier. C'est le garde-fou anti-abus (il n'y a pas de plafond de quantite ni de capacite de creneau en V1 : le seul rempart est que le chef valide ou refuse).
- Cote client sur le site, le statut affiche est TOUJOURS "En attente de confirmation par l'atelier". JAMAIS "validee" ni "confirmee".
- Paiement AU RETRAIT en V1. Aucun paiement en ligne. Le site affiche un "Total indicatif" + "a regler au retrait", jamais un prix ferme ni un "a payer". Le montant est recalcule cote serveur (le prix envoye par le client est ignore).
- IMPORTANT (piege a eviter) : une precommande boutique ou truck (B2C, payee au retrait) devient `statut_paiement = 'regle'` avec un reglement AU MOMENT DU RETRAIT. Elle ne doit JAMAIS naitre ni rester `'du'`. Le `'du'` est reserve au traiteur B2B facture a J+30 (voir 4). Le critere de distinction est le CANAL (traiteur), pas le fait d'etre une precommande.

### 3.2 Demande de devis traiteur
- Le devis est une **DEMANDE**, pas une commande ferme. Pas de total ferme, pas de paiement, pas d'acompte en V1.
- Il ecrit dans une table dediee (`demande_devis` ou equivalent, a caler avec CC), PAS dans le pipeline de vente. Une demande de devis n'est pas une vente tant que le chef ne l'a pas transformee.
- Cote client : "Demande envoyee, aucun paiement maintenant", avec une timeline demande -> validation atelier -> prestation -> facturation. Delai de reponse annonce "sous 48h".
- L'echeance de reglement (J+30 apres prestation) n'est JAMAIS montree au prospect : elle vit cote Atelier.
- Quand le devis devient une vraie prestation, cote Atelier c'est une vente traiteur qui nait `statut_paiement = 'du'`, facturee a J+30 (voir section 4).

### 3.3 Newsletter
- Le footer capte des inscriptions newsletter (email + consentement RGPD). Ecrit dans une table `newsletter_abonne` (ou equivalent).

### 3.4 Regle de securite d'acces (a respecter absolument)
- Aujourd'hui, l'acces public anonyme (`anon`) a la base est INTEGRALEMENT BLOQUE. Il doit le rester.
- Les lectures publiques du site (carte, emplacements, annonces) passent par du **code serveur** (lib de data cote serveur), jamais par un acces anon direct a la base.
- Les trois ecritures ci-dessus passent par des routes serveur dediees (par ex. `/api/commande`, `/api/devis`, `/api/newsletter`), qui valident et ecrivent cote serveur. Le client n'ecrit jamais directement en base.

---

## 4. Le socle client et la facturation (contexte indispensable, deja en prod)

Un gros chantier vient d'etre deploye en production sur l'Atelier, et il conditionne le site. Le comprendre evite de reconstruire ce qui existe.

### 4.1 Le socle client
Une seule entite `client`, enrichie, est le **socle commun** de plusieurs sujets : la facturation, la future fidelite, le futur espace client, et le rapprochement des commandes web. Ne PAS creer de table client parallele. Ce qui existe deja en base :
- Identite fiabilisee : email normalise (minuscules), telephone au format E.164, avec des **index uniques partiels** (unique sur lower(email), unique sur telephone). C'est la fondation du rapprochement "commande web -> client".
- Champs de consentement date (RGPD), adresse et SIRET (pour la facturation B2B).

Rapprochement commande web -> client : cle **email prioritaire, telephone en secours**. La politique "create-or-match" (rapprocher a un client existant ou en creer un) est a implementer cote site, en s'appuyant sur ces index uniques (jamais une recherche floue).

### 4.2 Le modele a trois dates et deux CA (deja en prod)
Chaque vente porte trois dates : `commande_le` (prise de commande), `occurred_at` qui porte desormais la semantique `livre_le` (remise/prestation), et `encaisse_le` (entree d'argent, NULL tant que non solde). L'Atelier distingue deux chiffres d'affaires : CA facture (a la livraison) et CA encaisse (au reglement). Une table `reglement` enregistre les encaissements. Un `statut_paiement` (regle / du / partiel) distinct de l'etat de production (`fulfillment`).

Ce que le site doit en retenir : le site s'arrete a `commande_le` (il cree la commande). Toute la suite (livraison, facturation, encaissement) est geree par l'Atelier. Le site ne duplique jamais cette logique.

### 4.3 Le futur paiement en ligne
Prevu mais NON ACTIF en V1. Le champ `vente.statut_paiement` est deja pose pour l'accueillir. Cote site, prevoir l'emplacement (dans l'espace client, un statut de paiement, un futur bouton "payer") mais ne cabler AUCUN encaissement en ligne. Marquer visuellement "V2 non actif".

---

## 5. L'espace client et la fidelite (concus cote design, PAS encore developpes)

Le handoff CD inclut un espace client complet et une fidelite. ATTENTION au sequencement : ils ne sont PAS a developper dans la premiere vague du site, pour une raison bloquante.

### 5.1 Le prerequis bloquant : la refonte RLS
Aujourd'hui, toutes les policies de la base Atelier sont en `authenticated using(true)` : tout utilisateur connecte voit tout. C'est acceptable pour une equipe interne. Mais un **compte client authentifie** (qui ne doit voir QUE ses propres donnees) ne peut PAS exister en securite sans une refonte prealable des policies. Cette refonte RLS est un **chantier a part entiere**, avec son propre plan a valider, sequence AVANT l'espace client. Le site ne doit rien promettre d'authentifie tant que ce chantier n'est pas fait.

### 5.2 La fidelite (V1, mais apres le socle)
Decisions actees : paliers calcules automatiquement (compteur DERIVE des ventes remises, jamais stocke en dur), recompense NON-monetaire, comptee au retrait reel (`fulfillment = remis`), canaux boutique + truck uniquement (traiteur exclu), identite email prioritaire, opt-in explicite RGPD, digital seule source de verite. Seuil et recompense = parametres configurables. Une commande web non confirmee ne credite jamais de points.

### 5.3 L'espace client (V1 complet, mais dependant de la refonte RLS)
Concu complet : login, points/recompense, historique de commandes, re-commande 1-tap, profil, preferences declaratives (gouts, emplacement, frequence de communication). Les preferences sont STOCKEES mais NON exploitees en V1 (aucune personnalisation active ; ne rien promettre de tel dans l'UX). Le paiement en ligne y a sa place mais reste V2 non actif.

---

## 6. Les fichiers du handoff CD (joints)

1. **PLAN D'INTEGRATION - ALM Atelier (2026-07-12).md** : l'ordre de travail, les dependances, les principes non negociables (sources uniques, etats vides propres, honnetete des chiffres via tags Calcule/Estime/Demo, le CA est un denominateur pas un objectif, signaler plutot que deviner), et les points ouverts a trancher. A lire en premier.
2. **ALM - Handoff CC - Guide d'integration.html** : le guide de reference ecran par ecran (comportement attendu, etats vides, tags). Document bundle (a ouvrir dans un navigateur).
3. **A Leon Mange - Site public V2 (2026-07-12) (2).html** : la maquette visuelle complete du site (11 ecrans, mobile-first). Reference visuelle et comportementale. Fichier lourd (images embarquees), a ouvrir dans un navigateur.

Rappel du plan d'integration : la maquette est un artefact de DEMONSTRATION. On porte le MODELE et le COMPORTEMENT, pas les exemples. Le catalogue de demonstration (produits, prix, textes) est invente et sera refait avec les chefs et le marketing. Le transactionnel part vide.

---

## 7. Ce qui reste a trancher avec moi (decisions business, ne pas deviner)

Points ouverts a me poser plutot qu'a supposer :
- **Modele de creneaux click & collect** : delai minimum de preparation, cutoff (heure limite de commande pour le jour meme), horizon de reservation (aujourd'hui, J+1 ?). Pas de capacite bloquante en V1 (garde-fou = confirmation chef).
- **Horaires reels de la boutique** (la maquette a des horaires provisoires).
- **Carte boutique reelle** (familles, produits, prix : la maquette est illustrative).
- **Affichage ou non des conditions de reglement traiteur** au prospect.
- **Format d'export caisse boutique** (mapping d'import a valider sur un vrai export) : dependance recurrente, cote Atelier.
- **Contenus reels** : vraies photos (REELLES, jamais IA, aucune marque Foodizy), textes histoire, mentions legales (raison sociale, SIRET, hebergeur), coordonnees et reseaux.

Note de separation de marque STRICTE : ALM et Foodizy sont deux marques distinctes. Aucun element, visuel ou photo brande Foodizy ne doit apparaitre sur le site ALM. Les photos chefs/packaging existantes portent le logo Foodizy et sont donc inutilisables ici.

---

## 8. Sequencement recommande pour le site

Ordre valide (le site peut avancer en parallele des autres chantiers tant qu'il reste "ajouts seulement", sans toucher aux policies existantes) :
1. Les pages publiques en lecture (accueil reequilibre 3 canaux avec boutique en tete, boutique, truck, traiteur, histoire, contact, mentions legales) + les lectures serveur (carte, emplacements, annonces).
2. Les trois ecritures : precommande (boutique + truck) vers le pipeline vente en `web_a_confirmer`, demande de devis vers sa table dediee, newsletter. Avec le rapprochement client create-or-match.
3. La confirmation cote Atelier (l'ecran "Commandes du jour" doit pouvoir accueillir et laisser le chef confirmer une commande web) : verifier que le flux web -> confirmation chef -> production fonctionne de bout en bout.
4. PLUS TARD, apres la refonte RLS : l'espace client authentifie et la fidelite.

Ne PAS lancer l'espace client authentifie avant la refonte RLS. Le signaler si le besoin apparait, plutot que de contourner la securite.

---

## 9. Ce que j'attends de cette conversation

M'aider a cadrer et lancer l'integration du site avec CC, en gardant la navette avec l'Atelier a chaque decision qui touche les donnees. Concretement : commencer par me poser les questions business ouvertes (section 7) que CC ne peut pas deviner, puis produire le premier prompt CC pour la premiere vague (pages publiques + lectures serveur), en local, sans deploiement, avec la discipline habituelle (audit de conformite, build vert, STOP avant push). On avancera vague par vague, avec mon feu vert a chaque etape.
