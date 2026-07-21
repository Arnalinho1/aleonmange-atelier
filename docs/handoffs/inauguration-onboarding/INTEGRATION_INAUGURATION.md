# ALM — Inauguration & Onboarding : guide d'intégration (Claude Code)

Deux expériences liées, sur DEUX sites distincts :
1. **Site public** (aleonmange.app) : la cérémonie d'inauguration.
2. **Atelier** (atelier.aleonmange.app) : le guide d'onboarding rejouable.

Maquettes de référence jointes (autonomes, jouables hors-ligne) :
- `A Leon Mange - Inauguration (HTML autonome).html`
- `A Leon Mange - Atelier Onboarding (HTML autonome).html`

Les deux embarquent une barre de contrôle (chips mono) pour sauter entre
les états — c'est un outil de démo, à NE PAS implémenter en prod.

---

## PARTIE 1 — Cérémonie d'inauguration (site public)

### Déclenchement
- Overlay plein écran posé sur la vraie homepage quand l'URL contient le
  param `?inauguration`. Zéro impact sans le param. Stateless, rejouable.
- Purement front-end : aucun appel réseau, aucune donnée collectée.

### Séquence
1. **Accueil cérémonie** : overlay crème, mark de Léon, « Audrey, Victorien,
   votre site vous attend. », CTA + transition auto après 3 s.
2. **Ruban** : ruban Rouge Léon `#B0342C` satiné (reflet animé, nœud SVG à
   droite), ciseaux draggables (pointer events, `touch-action:none`),
   découpe progressive à bord dentelé (clip-path), % coupé affiché.
   Fallback accessibilité : bouton « Couper le ruban » (coupe auto 1,1 s,
   easing smoothstep). À la coupe : chute des pans 1,2 s
   `cubic-bezier(.34,.05,.6,1)`, pan droit décalé de 120 ms, rotation
   inverse ; 90 confettis canard/crème/rouge/doré (2,2-4 s, délais 0-0,7 s) ;
   fondu overlay 0,9 s déclenché à 1,4 s.
3. **Révélation** : feux d'artifice canvas (4 bursts à 0/0,5/1,1/1,8 s,
   ~70 particules, gravité +0,05/frame, friction 0,985, extinction 3,6 s),
   puis visite en 4 chapitres spotlight (voir grammaire commune §3).
   Textes des 4 chapitres : figés dans la maquette, à reprendre verbatim.
4. **Bandeau horodaté** après la visite : « Site ouvert par Audrey Depouilly
   et Victorien Thebault, le [date] à [heure] » (horodatage client,
   décoratif), disparaît après 10 s ou au premier scroll. Deux actions :
   - « Garder un souvenir » → certificat portrait 3/4 imprimable
     (`window.print`, chrome masqué via `@media print`).
   - **« Découvrir votre Atelier »** → deeplink `atelier.aleonmange.app/?guide=1`
     (dans la maquette : lien relatif vers le fichier onboarding).

### Cibles spotlight de la Révélation (à câbler sur la vraie homepage)
Tableau `TOUR_TARGETS` (sélecteurs CSS) : ch1 module commande C&C, ch2
bouton compte/fidélité, ch3 header (lien Atelier), ch4 `null` = plein écran.
Fallback : cible introuvable → spotlight plein écran, jamais d'erreur.

---

## PARTIE 2 — Guide d'onboarding (Atelier)

### Architecture
- **Hub « Guide »** : 7 chapitres (titre, durée, état à_faire/fait/à_revoir,
  bouton Commencer/Reprendre/Rejouer), barre de progression, mention
  « Progression enregistrée sur cet appareil ». Entrée de menu permanente
  « Guide · X% » en pied de sidebar.
- **B1-B6** : chapitres spotlight sur les écrans réels de l'Atelier
  (la maquette utilise des répliques ; en prod, câbler les sélecteurs sur
  les vrais écrans). Chaque chapitre : 2-4 étapes max, un concept par carte.
- **B7 Clôture** : badge « Atelier apprivoisé », récap 7 étapes, confettis
  ~3 s (canard/crème/Rouge Léon, même physique que la cérémonie), message
  « Ce guide reste là. Rejouez n'importe quel chapitre quand vous voulez. »

### Micro-actions (1 par chapitre, jamais 2)
Chaque chapitre se termine par une étape « À vous de jouer » : le bouton
Suivant disparaît, remplacé par la pill « Cliquez sur la zone en
surbrillance » ; le guide attend le clic RÉEL sur la cible :
- B1 : cliquer « Commandes du jour » dans le menu (le guide ne navigue pas
  à la place du chef)
- B2 : confirmer la commande fondatrice de l'inauguration
- B3 : ouvrir la ligne de la commande confirmée en production
- B4 : saisir la vente préremplie (Lasagnes, 6,50 €)
- B5 : cliquer la marge du magret sauce miel
- B6 : ouvrir la fiche client Marie L.
Réussite → coche verte animée + « C'est fait. » + bouton Continuer →
chapitre marqué `fait`. « Passer » en cours → `a_revoir` (si pas déjà fait).
IMPORTANT (bug corrigé en maquette) : rejouer B2 doit REMETTRE la commande
fondatrice en attente, sinon la cible de l'action n'existe plus.

### Aide contextuelle « ? »
Icône sobre (34 px, contour canard) en haut à droite de chaque module,
TOUJOURS visible (y compris à 100%). Clic → rejoue le chapitre du module,
et à la fin retourne AU MODULE (pas au hub).
Mapping : tableau de bord→B1, commandes→B2, production→B3, saisie→B4,
analytics→B5, clients/finances→B6.

### Comportement d'ouverture (3 contextes)
- `?guide=1` (deeplink cérémonie) : hub ouvert automatiquement.
- Sans param + progression vide : PAS de hub imposé — toast discret en bas
  « Envie d'une visite guidée de votre Atelier ? » avec Oui / Plus tard.
  « Plus tard » : le toast ne réapparaît pas dans la session.
- Progression existante : rien d'automatique (menu Guide + icônes « ? »).

### Persistance (contrat)
Toute la progression passe par UNE interface :
`loadProgress()` / `saveProgress(chapitre, etat)` — états
`a_faire | fait | a_revoir` (+ flag toast vu). La maquette simule en
mémoire ; en prod, brancher sur localStorage (clé suggérée
`alm_guide_progress`). AUCUN appel localStorage direct ailleurs.

### Libellés verrouillés
- Statut commande web : « En attente de confirmation par l'atelier »,
  forme complète. Jamais « validée ».
- Fidélité : boutique + camion, traiteur exclu ; récompenses non monétaires.
- Aucun em-dash dans les textes visibles.

---

## Commun aux deux

### Grammaire spotlight (composant à partager si possible)
Assombrissement `box-shadow: 0 0 0 9999px rgba(9,38,48,.72)` autour de la
cible (padding 10 px, radius 16 px), transition 0,5 s
`cubic-bezier(.4,0,.2,1)` entre cibles, carte texte fixe en bas
(min(440px, 92vw), mobile-first), lien « Passer » permanent en haut à
droite, re-mesure au resize. Cibles = tableaux de sélecteurs CSS
paramétrables, fallback plein écran si cible introuvable.

### Tokens
Canard `#0E3947`, Rouge Léon `#B0342C`, crème `#F3ECDD`/`#FBF8F1`, doré
`#F0C173`, terracotta `#B0704C`, vert `#2E6B4A`. Bricolage Grotesque
(titres 800), Hanken Grotesk (corps), Spline Sans Mono (données chiffrées,
labels uppercase). Pills/CTA radius 100px, cartes 14-22px.

### Points ouverts
- URL exacte du deeplink (`?guide=1` proposé) à confirmer côté routing.
- Les sélecteurs réels des cibles spotlight (2 sites) sont à fournir par CC
  d'après son DOM — la maquette documente l'intention de chaque cible.
- Le certificat imprimable : version PNG téléchargeable (génération canvas)
  possible en évolution, non maquettée.
