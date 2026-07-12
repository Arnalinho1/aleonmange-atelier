# Atelier ALM — Digest d'implémentation (maquette → Next.js/React/Tailwind)

Source : `ALM - Atelier.dc.html` (~5276 l., format `.dc.html`, runtime `support.js`).
Ne PAS porter le runtime. Templating `sc-for`/`sc-if`/`{{ }}` = boucles/conditions React.
Tous les chiffres/produits (« Le Signature », « 428 € »…) sont de la **démo** : garder la FORME,
ne pas recopier les valeurs. Les tags « Calculé » (bleu) vs « Démo »/« Proxy » (ambre) sont
un motif récurrent — les conserver comme badges.

---

## 0. Tokens globaux (rappel synthétique)

**Couleurs**
- Fond page : `#EDE7DA` (sable). Carte claire : `#F6F1E7` (crème), bord `#E1D7C3` / `#DFD4BF`.
- Panneau/KPI foncé : `#0E3947` (canard) ; texte `#F6F1E7`, sous-texte `#8FCFE2`/`#BFDCE7`.
- Fonds internes : `#F1EAD9` (en-têtes de section, chips inactives), `#FBF8F1` (inputs/mini-cartes), `#EFE9DC`.
- Pistes de barres : `#E4DAC6` / `#E7DECB`. Séparateurs : `#EFE7D6`, `#E9E0CE`, `#E4DAC6`.
- Rouge action (Vente, CTA primaire, export) : `#D81020`, hover `#B00D1A`.
- Bleu (CTA secondaire, liens, « Calculé ») : `#1493BE` / `#0E6E8F` ; certains hover virent vert `#245539`.
- Cyan clair : `#3FA8CE` / `#8FCFE2`. Ambre/or (Démo, traiteur, alertes douces, emplacements) : `#E9A23B` / `#B07A2E` / `#F0C173`.
- Vert positif : `#2E7D46` / `#1F8A5B`. Textes gris : `#6B7469`, `#9A927F`, `#8A7F6A`, labels mono `#A79B84`.
- **Couleurs catégories** (composants) : protéine `#D81020`, féculent `#E9A23B`, légume `#3FA8CE`, sauce `#1493BE`.
- **Couleurs canaux** : truck `#D81020`, boutique `#1493BE`, traiteur `#E9A23B`.

**Typos** — Bricolage Grotesque (display : titres, gros chiffres, poids 700/800) · Hanken Grotesk (corps 400-700) · Spline Sans Mono (labels UPPERCASE `letter-spacing:.06–.14em`, chiffres tabulaires).

**Radius** — cartes 16-18px · KPI 14px · mini-cartes 11-13px · pills `100px` · inputs 10-11px · boutons 11px.
**Sélection texte** : `::selection{background:#D81020;color:#F6F1E7}`. Scrollbars custom `.fz-scroll` (thumb `#D8CDB6`).

---

## 1. SHELL commun (`display:flex;min-height:100vh`)

### Sidebar (`<aside>`)
- `flex:0 0 250px`, `background:#0E3947`, `color:#BFDCE7`, `position:sticky;top:0;height:100vh`, scroll interne `.fz-scroll`.
- **En-tête logo** : padding `20px 20px 16px`, bord bas `rgba(255,255,255,.08)`. Avatar rond 42px (`assets/alm-mark.png`, fond `#F6F1E7`, halo `0 0 0 2px rgba(255,255,255,.12)`) + à droite : « A Léon Mange » (Bricolage 800/18px, `#F6F1E7`) et « Atelier » (mono 9.5px, `letter-spacing:.18em`, upper, `#8FCFE2`).
- **Nav** : padding `14px 12px`, `flex:1`. Groupes = titre mono 9.5px upper `#5C8593` (`margin:10px 10px 4px`) puis items.
  - Item = `<button>` pleine largeur, `padding:9px 12px`, radius 10px, gap 11px : `<span 20px>`icône SVG (stroke, 20px)`</span>` + label (Hanken 600/14px) + badge optionnel (pill `#D81020` blanc, mono 10px, `margin-left:auto`).
  - Actif : `background:#1493BE;color:#F6F1E7`. Inactif : transparent, `#BFDCE7`.
  - **Groupes & items EXACTS** (id · label · badge) :
    - **Accueil** : `dashboard` Tableau de bord · `notifs` Notifications (badge = nb non-lues).
    - **Activité** : `sale` Saisie de vente · `orders` Commandes du jour (badge `4`) · `history` Historique des ventes · `import` Import caisse.
    - **Cuisine** : `catalog` Catalogue · `recipes` Recettes & plats · `prod` Production · `haccp` HACCP · `stock` Stocks.
    - **Pilotage** : `insight` Insight stratégique · `finance` Finances · `sales` Ventes & tendances · `productivity` Productivité · `clients` Clients.
    - **Marketing** : `commu` Réseaux sociaux.
    - **Réglages** : `users` Utilisateurs & rôles.
- **Pied avatar** : padding 14px, bord haut `rgba(255,255,255,.08)`, gap 10px. Pastille ronde 34px `#3FA8CE` texte `#0E3947` initiale « A » (Bricolage 800) + « Audrey Depouilly » (600/13.5px `#F6F1E7`) / « Cheffe · A Léon Mange » (11px `#8FCFE2`).

### Topbar (`<header>`)
- `position:sticky;top:0;z-index:20`, fond `rgba(237,231,218,.86)` + `backdrop-filter:blur(10px)`, bord bas `#DFD4BF`, padding `14px clamp(18px,3vw,34px)`, flex gap 16.
- **Recherche** : boîte `flex:1;max-width:420px`, fond `#F6F1E7`, bord `#DFD4BF`, radius 11px, padding `9px 13px` : loupe SVG (`#9A927F`) + input placeholder « Rechercher un composant, une commande, un lot… ».
- À droite (`margin-left:auto`, gap 10) : bouton **Vente** (rouge `#D81020`, Bricolage 700/14px, icône +, ouvre la saisie) · cloche 40×40 (carte `#F6F1E7` bord `#DFD4BF`, pastille rouge non-lu) · avatar rond 40px.

### Zone contenu (`<main>`)
- `flex:1;overflow-y:auto`, padding `clamp(20px,3vw,34px)`, conteneur interne `max-width:1240px;margin:0 auto`.
- Chaque écran = un `sc-if` (`isDash`, `isSale`…). Un seul actif à la fois (routing par `state.active`).
- **En-tête d'écran** récurrent : sur-titre mono upper `#B07A2E` (rubrique : Accueil/Activité/Cuisine/Pilotage/Marque & marketing/Réglages) + `<h1>` Bricolage 800 `clamp(26px,3.4vw,34px)` `letter-spacing:-.02em` + paragraphe descriptif `#6B7469` ; souvent un bouton d'action à droite.

### Toast (`flash`)
Message transitoire (~2.6 s) déclenché par la plupart des actions de démo. Prévoir un toast global bas/centre.

---

## 2. ChanFilter (composant partagé)

Barre de filtre canal (+ emplacement truck). Rendu via `<dc-import name="ChanFilter">`.
**Présent sur 6 écrans** : Production, Historique, Productivité, Insight, Ventes & tendances, Réseaux sociaux.
(Un `ordChanFilter` existe aussi côté logique mais Commandes affiche des onglets de jour à la place.)

Structure : rangée de **pills canaux** `Tous · Food truck · Boutique · Traiteur` (pill `padding:7px 13px`, radius 100px, Hanken 600/12.5px ; pastille couleur 8px sauf « Tous »). Actif = `background:#0E3947;color:#F6F1E7` ; inactif = `#FBF8F1`, `#6B7469`, bord `#DFD4BF`.
Si canal = **truck**, seconde rangée **emplacements** : `Tous emplacements` + les 3 marchés (`Mar · Bois d'Oingt`, `Mer · Tassin`, `Jeu · La Tour-de-Salvagny`). Pills ambre actif `#B07A2E`/blanc. Sélectionner un canal ≠ truck réinitialise l'emplacement. Le filtre recalcule KPIs/tableaux de l'écran.
Référentiels : `CHANNELS` (3 canaux) et `PLACES` (3 marchés fixes, pas de géoloc).

---

## 3. Écrans (17)

### 3.1 `dashboard` — Tableau de bord
Layout vertical, pleine largeur (1240).
1. **Title row** : date mono `#B07A2E` + H1 « Tableau de bord » ; à droite pill statut (« Atelier ouvert · Beaujolais », pastille `#3FA8CE`).
2. **Verdict tricolore** — bandeau « État du jour » : pastille + label (Bricolage 800/20px, couleur dynamique) à gauche ; à droite liste de *facts* clé/valeur (mono label + valeur 700). C'est un constat (pas d'action).
3. **Key insights** — « Les 3 points chauds du jour · lus depuis Insight », lien « Ouvrir Insight → ». Grille `repeat(auto-fit,minmax(255px,1fr))` de 3 boutons-cartes : ligne urgence (mono, couleur) + tag ; constat 13.5px ; chiffre mono. Hover translateY(-1px).
4. **Bandeau fiabilité données** : fond `#F1EAD9`, jauge fine + « vue de démonstration ».
5. **Bloc CA du jour par canal** (carte crème) : à droite total (Bricolage 800/30px) + delta pill. Liste de canaux = label+pastille (92px) · barre (`#E4DAC6` track) · valeur mono · delta pill.
6. **Grille business** `repeat(auto-fit,minmax(230px,1fr))` : *Objectif du jour* (gros % vert + barre + reste), *Ventes du jour* (gros nombre + delta ; séparateur → panier moyen mono), *Plat qui performe* (mini-classement rang/nom/barre/ventes).
7. **Grille opérationnelle** `1.3fr 1fr` : gauche *Charge à produire* (en-tête + lien « Plan complet → » ; 2 gros chiffres portions restantes / prochain créneau ; liste composants pastille+nom+cat+barre+label). Droite colonne : *Commandes traiteur à honorer* (liste when-badge/montant/client/couverts) + *Alertes vitales* (grille 3 colonnes de compteurs Bricolage 800/28px colorés).

### 3.2 `sale` — Saisie de vente
En-tête « Activité » + description.
- **Onglets canal** (`saleChanTabs`) : pills avec pastille couleur.
- **Mode de vente** (`saleModeChips`) : chips à 2 lignes (label + sous-libellé) ; ligne `→ destination`.
- Si **truck** : encart ambre `#F1EAD9` « Session truck · emplacement » = chips emplacements (badge « AUJ. »).
- **Grille `1.5fr 1fr`** :
  - **Colonne composition** (carte crème) — contenu conditionnel selon canal :
    - *Truck* : catégories (`saleCats`, pastille 18px + titre + « 1 au choix »), boutons options (sélection unique, `disabled` possible) ; puis « Produits à emporter » (extras qty ± ).
    - *Boutique* : groupes de produits en grille `minmax(240px,1fr)`, cartes avec stepper qty (− valeur +).
    - *Traiteur* : inputs Convives (numérique) + Date événement (date) ; groupes formules/produits en liste avec stepper.
    - Bloc **Client** partagé : `<select>` + bouton « Nouveau client » (outline bleu).
    - Bloc **Origine de la vente** (badge « Proxy · démo ») : chips sources ; note « alimente l'attribution social → ventes ».
  - **Colonne récap** (`position:sticky;top:16px`) :
    - Panneau **foncé** `#0E3947` : canal (pastille+label mono) ; si truck emplacement ; résumé bowl composé (pastilles) ; lignes panier (qty/nom/sous/total) ; client ; **Total** Bricolage 800/32px + meta.
    - Carte **paiement** crème : chips moyen de paiement (`salePayChips`, « stat ») ; gros bouton enregistrer ; hint.

### 3.3 `orders` — Commandes du jour
File de production : uniquement commandes promises non remises (traiteur + Click&Collect), par créneau.
- En-tête + bouton « Nouvelle vente » (rouge). Encart info (les ventes comptoir/boutique n'apparaissent pas ici).
- **Onglets jour** (`queueDayTabs`).
- **4 KPI foncés** (`repeat(4,1fr)`, carte `#0E3947`, label mono cyan + valeur Bricolage 800 + sous mono).
- Alerte optionnelle (fond rouge translucide).
- **Grille `1.7fr 1fr`** : gauche = sections par créneau (`queueGroups`) — en-tête `#F1EAD9` (label+sub+compteur), lignes commande cliquables (badge heure/mode foncé 52px, chevron, client + pill canal, réf/nb plats/portions mono, statut pill à droite) ; **expand** → chips composants « À produire ». Droite = *Charge à produire* (liste composant + barre par composant).

### 3.4 `import` — Import caisse (fin de journée)
Wizard 3 étapes, dépôt CSV → mapping → preview.
- En-tête « Activité · boutique » + description. Encart d'avertissement ambre « Format à caler sur un vrai export ».
- **Grille `1fr 1fr`** :
  - Étape **1 Déposer** : badge n° `#0E3947`, zone drag&drop `border:2px dashed`, boutons « Charger l'exemple » / « Vider », bloc « Détecté · séparateur » (header line mono).
  - Étape **2 Mapping** : lignes « colonne fichier → champ modèle » avec badge + `<select>` (148px). Placeholder si non chargé.
- **Étape 3 Prévisualisation** (carte pleine largeur) : en-tête + 3 compteurs (Importables ambre / À corriger rouge / Total valide). Encart ambre « Mode déduit ». **Tableau** header grille `1.4fr 1.3fr .7fr .7fr .7fr 1.5fr` (Désignation CSV / Produit rapproché / Mode / Qté-poids / Montant / Statut) + lignes (statut = pastille + libellé). Pied : note horodatage (`occurred_at`) + bouton « Valider & créer N ventes » (ou état confirmé vert).

### 3.5 `catalog` — Catalogue produits
En-tête « Cuisine » + bouton « Nouveau produit » (bleu, `np.open`).
- Barre : recherche (`catSearch`) + onglets canaux (`catChannelTabs`, avec pastille).
- État vide (dashed) possible.
- **Groupes par catégorie** (`catGroups`) empilés : titre H2 + count mono + sous-titre. Chaque groupe = **table** (carte crème) : header mono `Produit / Catégorie / Canaux / Prix / Coût / Marge / Statut` (largeurs flex fixes 100/80/74/66/56/60). Lignes cliquables (`c.open` → drawer détail) : nom + format vente ; catégorie pastille+label ; badges canaux (lettres F/B/T) ; prix mono 600 ; coût gris ; marge bleue ; statut pill. Hover `#F1EAD9`.

### 3.6 `recipes` — Fiches techniques
En-tête « Cuisine » + bouton « Nouveau plat » (bleu). Légende Calculé/Démo (`#F1EAD9`).
- **Section « Recettes candidates »** foncée `#0E3947` (halo radial ambre) : cartes candidates `flex 1 1 240px` (nom + votes or ; auteur ; pastilles composants ; bouton « Formaliser en fiche » outline).
- **Grille fiches** `repeat(auto-fill,minmax(330px,1fr))` : carte plat = en-tête (vignette 64px arrondie + nom Bricolage 800/18px + chip santé + badges nutri/eco) ; **Recette** (badge « Démo », lignes composant pastille/nom/cat/grammage/coût ligne) ; encart **Coût & marge** `#F1EAD9` (badge « Calculé » : coût matière / prix / marge brute) ; **Allergènes** optionnels. Note de bas « marge nette calculée dans Finances ».

### 3.7 `prod` — Production du jour
En-tête « Cuisine » + bouton « Enregistrer un lot » (bleu, ouvre drawer). **ChanFilter**.
- **Section « Prévision — demain »** foncée `#0E3947` : badge « Aide à la décision » + explication + bouton « Appliquer au plan ». En-tête colonnes mono (Composant / Ventes/j (7j) / Signal communauté / Suggéré). Lignes `forecast` : composant pastille · moyenne mono + trend pill · signal communauté (étoile+boost) · suggéré Bricolage 800/20px. Pied : buffer +10 % + total suggéré.
- **Grille `repeat(auto-fit,minmax(320px,1fr))`** : *Plan de production* (barres par composant done/total) + *Lots enregistrés* (cartes `#FBF8F1` : nom+lot bleu ; ligne mono Qté/Prod/DLC ambre/T°).

### 3.8 `history` — Historique des ventes
En-tête « Activité ». Barre : onglets période (`histTabs`) + recherche (pill arrondie). **ChanFilter**.
- **3 KPI foncés** (`repeat(3,1fr)`). État vide possible.
- **Groupes par jour** (`histGroups`) : en-tête `#F1EAD9` (jour + count/total bleu). Lignes vente : heure mono (46px) · pastilles composants · nom (+ taille, + badge « Import » si importé) · pill canal · pill paiement · prix Bricolage 700/15px à droite.

### 3.9 `haccp` — HACCP & traçabilité
En-tête « Cuisine ». **3 KPI foncés** (label accent variable).
- **Relevés de température** (carte, en-tête `#F1EAD9` « Matin · Soir ») : lignes enceinte = nom + cible mono ; groupe Matin (label + valeur Bricolage 700 + badge conformité) ; groupe Soir idem + bouton « Relever » (ouvre drawer).
- **Grille `1.15fr 1fr`** : *Plan de nettoyage* (checkbox custom `t.toggle` + zone/fréquence ; compteur done/total) + *Historique de conformité* (timeline : pastille dot + date mono + badge + événement ; « Action : » si non-conformité).

### 3.10 `stock` — Stocks & traçabilité
En-tête « Cuisine ». **4 KPI foncés** (`fz-stock-kpi`, responsive 2 col <900px).
- Alerte gaspillage optionnelle (rouge translucide).
- Barre : onglets (`stockTabs`, pastille optionnelle) + recherche.
- **Grille `1.5fr 1fr`** (`fz-stock-grid`, 1 col <1080px) :
  - *Tableau composants* : header mono `Composant / Stock / Statut / Inventaire`. Lignes = pastille cat · chevron+nom+cat/seuil/lots (cliquable expand) · stock (valeur mono + barre) · badge statut · bouton « Ajuster » (ouvre drawer). **Expand** → encart `#F1EAD9` rotation **FEFO** + mini-table lots (N° lot / Produit le / Qté / DLC / Reste jrs badge).
  - *Lots en cours · DLC* : liste lots (pastille + nom + lot/qty mono ; DLC + badge jours restants).

### 3.11 `finance` — Finances
En-tête « Pilotage » + onglets période (`finPeriodTabs`). Barre canal (`finChanTabs` + note). **4 KPI foncés** (avec sous-libellé).
- **Grille `1.6fr 1fr`** (`fz-fin-grid`) :
  - *CA & marge nette par plat* : header mono `Plat / Ventes / CA / Coût / Nette / %` ; lignes (nom + pastilles composants ; valeurs mono ; % pill).
  - Colonne droite (stack) :
    - *Paramètres de rentabilité* : 2 champs auto (Main-d'œuvre/portion, Transport/portion, badge « auto », bleu) ; explication ; encart **Tournées de livraison** (liste tournées + form Coût/Heure + « Ajouter ») ; breakdown coûts (−valeurs) → **Marge nette** (Bricolage 800/18px bleu + %).
    - *CA par canal* : lignes canal (pastille + nom + hint ; valeur + % ; barre ; ventes/panier/marge mono).
    - *Export comptable* (carte **foncée** `#0E3947`) : période ; lignes TVA (`finVat`) ; gros bouton rouge « Exporter le CSV compta ».

### 3.12 `productivity` — Productivité
En-tête « Pilotage » + 2 pills légende (Calculé bleu / Démo ambre). **ChanFilter**.
- **4 KPI clairs** (`#F6F1E7`, label + tag + valeur Bricolage 800/26px + sub).
- **Bloc « Temps & rendement »** (badge Calculé) : grille `1.35fr 1fr` — gauche lignes lots (grille `1.7fr .8fr .9fr .7fr` : Lot / Cadence bleue / Temps-portion / Équipe + barre) ; droite carte `#FBF8F1` « Prévu / réalisé » (badge Démo, barres par composant).
- **Bloc « Économie par recette »** (Calculé) : header mono `Recette / Portions / Cadence / Coût MO-port. / MO total` ; lignes cartes `#FBF8F1` + barre ; encart note ambre.
- **Bloc « Main-d'œuvre »** : grille `1fr 1fr` — *Coût MO par canal* (barres + total MO + poids MO/CA ambre) + *Productivité par personne* (avatar initiale + cadence bleue + rôle/heures + barre).
- **Bloc « Pertes & gaspillage »** (badges Volumes démo / Coût calculé) : header mono `Composant·origine / Produit / Vendu / Invendu / Taux / Coût perte` ; lignes cartes ; encart note rouge ; bandeau **foncé** récap (Invendus / Taux / Coût or).

### 3.13 `insight` — Insight stratégique
En-tête « Pilotage ».
- **Jauge de fiabilité** (carte **foncée** `#0E3947`, halo bleu) : label + % (Bricolage 800/26px) + barre ; à droite 3 compteurs (Calculé / Démo or / Enjeu total).
- **ChanFilter** + rangée onglets « Objectif » (`siObjTabs`).
- **Blocs par urgence** (`siBlocks`) : titre H2 + pastille + sub + count. Cartes reco = badge objectif + stamp Calculé/Démo + bouton source « → » ; **constat** (Hanken 700/15.5px) ; **chiffre** (chip rouge translucide) ; **action** (flèche verte + texte 600). À droite : rang + **impact** (Bricolage 800/22px) + sous-libellé. Boutons « Voir plus / Réduire ».
- Note de bas Calculé vs Démo.

### 3.14 `sales` — Ventes & tendances
En-tête « Pilotage » + 2 pills légende. **ChanFilter**.
- Rangée période (`salPeriodTabs`) + bouton reset jour actif (si sélection).
- **4 KPI clairs** (label+tag+valeur+sub).
- **Bloc « Matrice plat × canal »** (Calculé) : grille `1.9fr repeat(3,.72fr) .6fr` — header (Plat + 3 canaux pastille + Total), lignes cartes `#FBF8F1` (nom + 3 cellules heat + total 800) ; encart note ambre (pic).
- **Bloc « Saisonnalité »** (Calculé 7j) : grille `1.4fr 1fr` — **bar chart** 7 jours (`grid-template-columns:repeat(7,1fr)`, barres cliquables `d.pick` pour filtrer, labels dessous) + carte latérale (CA par emplacement OU détail par jour, selon truck).
- **Bloc « Invendus par canal »** (Volumes démo / Coût calculé) : header mono `Canal / Produit / Vendu / Invendu / Taux / Coût perte` ; lignes cartes + bandeau **foncé** récap (Invendus/Taux/Coût or).

### 3.15 `clients` — Clients
En-tête « Pilotage » + boutons « Exporter CSV » (outline) et « Nouveau client » (rouge).
- **5 KPI clairs** (`repeat(5,1fr)`).
- **Entonnoir communauté → client** (carte **foncée**) : gauche barres funnel (`funnel`, label + valeur + barre) ; droite encart ambre gros chiffre `convGap` + « Créer une campagne de relance ».
- **Chips segment** (`clientChips`, pastille + label + count).
- **Table clients** : header grille `3fr 1fr .8fr .6fr 1fr .9fr 1.2fr .9fr 24px` (Client / Segment / Source / Cmd / Dernière / CA / Plat favori / Marge / chevron). Lignes cliquables → **fiche dépliable** : 4 mini-KPI + « Dernières commandes » (liste) + « Préférences & communauté » (régime, CP, ancienneté, votes, propositions) + boutons Relancer/Offrir un bon.
- **Grille `1.6fr 1fr`** : *À relancer* (en-tête ambre + liste dormants avec bouton Relancer) + carte comptoir (`#EFE9DC` dashed).

### 3.16 `commu` — Réseaux sociaux
En-tête « Marque & marketing » + onglets période. **4 KPI foncés**. **ChanFilter**.
- **B1 « Annoncer l'emplacement du jour »** (carte **foncée**, halo ambre, grille `1.25fr 1fr`) :
  - *Composer* (gauche, bord droit) : chips Emplacement (badge « Auj. ») ; chips Réseau (icône) ; chips Plats tagués (badge « Pont ventes ») ; `<textarea>` texte (bouton « Régénérer ») ; compteur caractères + bouton **Publier** rouge.
  - *Aperçu + journal* (droite) : carte preview de post (header réseau/date, bandeau image dégradé, texte, plats tagués) ; « Annonces publiées » (badge Démo, log ou état vide).
- **B2 « Attribution — post → plat → ventes »** (carte crème, badge Démo) : en-tête + total attribué ; lignes post (texte + badge réseau + plat pastille + proxy + canal ; à droite ventes 800 + CA) + barre ; encart note bleu.
- **Grille `1.6fr 1fr`** : *Vos réseaux* (`socNets` : icône + nom/handle + abonnés 800 + croissance pill + posts/likes/comments + barre engagement) + colonne (*Répartition audience* barres de part + *Meilleures publications* liste posts + bouton export).

### 3.17 `users` — Utilisateurs & rôles
En-tête « Réglages » + bouton « Inviter un utilisateur » (bleu, pill).
- **3 KPI foncés**.
- **Grille `1.5fr 1fr`** :
  - *Membres de l'équipe* : liste (avatar initiale `#E4DAC6` bleu + nom + badge statut + email mono + pill rôle + dernière connexion mono + bouton edit crayon).
  - Colonne : *Accès par rôle* (matrice grille `1.5fr repeat(3,42px)` : lignes fonctionnalités × colonnes rôles, cellules ✓/– ; légende) + *Journal d'audit* (badge « Bientôt · V2 », `opacity:.6`, lignes qui/action/quand).

### 3.18 `notifs` — Notifications
En-tête « Accueil » + bouton « Tout marquer comme lu » (outline pill). **3 KPI foncés**.
- **Tabs pill segmentés** (`notifTabs`, conteneur `#EDE7DA` radius 100px) : *Centre d'alertes* / *Préférences*.
- **Tab Centre d'alertes** : chips filtre catégorie (`notifChips`, avec count) ; liste (carte crème) : icône sévérité + titre + badge sévérité + catégorie mono ; description ; boutons « Aller à → » / « Marquer comme lu » ; à droite heure mono + point rouge si non-lu. État vide possible.
- **Tab Préférences** : grille `1.6fr 1fr` — *Par type d'alerte* (table `1fr 74px 74px` : Événement / Dans l'app / Email, lignes avec **toggles** switch custom app+email + ligne « Résumé quotidien ») + colonne (*Seuils de déclenchement* : inputs stock bas & jours DLC ; *Horaires* : heures calmes from/to + envoi résumé, inputs `type=time`).

---

## 4. Drawers & modales (overlays)

Tous : overlay `position:fixed;inset:0;background:rgba(15,24,19,.5);z-index:60-70`. Panneaux latéraux droite `width:min(420-460px,92vw)`, `#FBF8F1`/`#EDE7DA`, ombre `-20px 0 …`. Header foncé ou crème avec sur-titre mono + titre Bricolage 800.

- **`haccpOpen`** — Relevé de température : header unité + cible ; input gros (Bricolage 700/24px) ; preview conformité live ; footer Annuler / Enregistrer.
- **`stockAdjustOpen`** — Ajuster stock : header cat+nom+stock actuel ; input comptage ; encart « Écart d'inventaire · calculé » ; footer Annuler / Valider.
- **`prodOpen`** — Enregistrer un lot : header foncé ; sélection composant par catégories (boutons) ; inputs Quantité / T° à cœur / Temps prod / Nb chefs (steppers Bricolage 700/18px). (N° lot & DLC auto.)
- **`recipeEditOpen`** — Éditeur de plat (nouveau plat / candidat).
- **`compOpen`** — Détail composant/produit du catalogue (édition prix d'achat → recalcul coût).
- **`np.isOpen`** (`npOpen`) — Nouveau produit : form (nom, type, catégorie, canal, mode unité/poids, format, prix).
- **`clientAddOpen`** — Nouveau client.
- **`saleOpen`** — Saisie de vente rapide (modale, déclenchée par bouton Vente topbar / `openSale`).
- **`orderAttachOpen`** — Rattacher une commande.

---

## 5. Notes d'implémentation

- **Responsive** : classes `fz-*` (media queries) — `fz-stock-grid`/`fz-fin-grid` passent 1 colonne <1080px ; `fz-stock-kpi`/`fz-fin-kpi` passent 2 colonnes <900px. Reproduire avec `lg:`/`md:` Tailwind.
- **Motif « Calculé vs Démo »** : badge pill mono 9px upper — Calculé `rgba(20,147,190,.16)`/`#1493BE`, Démo/Proxy `rgba(176,122,46,.18)`/`#B07A2E`. Omniprésent, à composantiser.
- **KPI cards** : 2 variantes — foncée (`#0E3947`, label mono cyan) et claire (`#F6F1E7`, label gris + tag). Choix selon écran (voir ci-dessus).
- **Barres/jauges** : track `#E4DAC6`/`#E7DECB`, hauteur 6-9px, radius 100px, remplissage couleur canal/catégorie.
- **En-têtes de section** de tableaux : bande `#F1EAD9`, titre Bricolage 700/16px, souvent compteur mono à droite.
- **Graphes** : un seul vrai graphe = bar chart Saisonnalité (Ventes & tendances). Le reste = barres de progression / heatmap-cellules / listes — pas de lib de charting nécessaire.
- **Icônes** : SVG stroke (style Lucide/Feather), inline. Réutiliser une lib d'icônes équivalente.
- Toutes les données = démo statique (`CATALOG`, `DASH_BEST`, etc.) : structurer en données mockées, garder les formes de tableaux/listes.
