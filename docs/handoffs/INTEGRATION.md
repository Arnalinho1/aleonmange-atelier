# ALM — Page « Notre Histoire » : guide d'intégration (Claude Code)

Refonte de la page `/histoire` du site public aleonmange.app. La maquette
`A Leon Mange - Notre Histoire.html` (autonome, ouvrable hors-ligne) est la
référence de FORME. Régime de travail : remplacement de la page Histoire
existante + remplacement du footer GLOBAL (toutes pages) — rien d'autre.

## 1. Structure de la page (ordre des sections)

1. **Header** — inchangé vs le site en prod (nav sticky beige `#EFE6D2`,
   logo complet, CTA « Mon compte » + « Restez informé »). Ne pas dupliquer :
   réutiliser le composant header existant, avec l'état actif sur « Notre
   histoire » (couleur accent `#D81020`, weight 700).
2. **Hero** — grille 2 colonnes (1.02fr / 1fr). Gauche : eyebrow mono
   « Notre histoire », H1 Bricolage 60px « Deux chefs, un camion, et le nom
   de Léon. », paragraphe d'intro (voix « nous »), 3 pills Cuisine / Cœur /
   Convivialité. Droite : photo `truck-hero.jpg` ratio 4/4.6, radius 22px,
   `object-position:76% 50%` (cadre sur les deux chefs + camion), badge
   flottant « Depuis / le Beaujolais » ancré en bas-gauche.
3. **Manifeste** (bande pleine largeur canard `#0E3947`) — pastille crème
   96px avec le mark de Léon (`alm-mark.png`, compensation de centrage
   `transform:translate(7%,6%)`), eyebrow doré `#F0C173` « Pourquoi À Léon
   Mange », citation 27px avec la dernière proposition en doré.
4. **Récit labo** — 2 colonnes : photo `histoire-labo.jpg` 16/11 / texte
   « Une seule cuisine, trois façons d'en profiter ».
5. **Les 3 C** — 3 cartes crème `#FBF8F1` centrées, icônes SVG inline
   (toque terracotta / cœur rouge / groupe vert `#2E6B4A`).
6. **Parcours** — 4 cartes numérotées 01→04 (Bocuse → camion J9 → boutique
   de Létra → trois canaux). La 4e est inversée (fond canard, numéro doré).
7. **Pont canaux** — 3 cartes cliquables (Boutique / Traiteur / Truck),
   image 16/10 + titre + phrase + lien rouge avec flèche. Liens à brancher
   sur les vraies routes (`/boutique`, `/traiteur`, `/truck`).
8. **Footer** — NOUVEAU, voir §3.

## 2. Contenus figés (validés Arnaud — ne pas réécrire)

- Voix « NOUS » sur toute la page (cohérence avec le reste du site).
- Aucun tiret cadratin « — » dans les textes (consigne éditoriale).
- Hero : « Nous, c'est Audrey et Victorien, formés chez Bocuse : Audrey en
  cuisine, Victorien en pâtisserie. Un jour, nous avons troqué les grandes
  maisons pour un vieux camion J9… »
- Manifeste : « Léon, c'est le grand-père de Victorien. […] Notre camion,
  notre labo, notre marque : tout est fait maison, et tout nous ressemble. »
- Email de contact : **aleonmange@yahoo.com** (PAS contact@aleonmange.com).
- Téléphone : 06 75 36 23 26. Adresse : 1923 route de la vallée, 69620 Létra.
- Horaires : mar–ven 9h–13h · 15h–19h ; samedi 9h–14h ; dim/lun fermé.

## 3. Nouveau footer (à déployer sur TOUTES les pages)

Remplace l'ancien footer (logo mal rendu). Bande beige `#EFE6D2` identique
au header, bordure haute `#E1D7C3` :
- **Bandeau marque** : logo complet `alm-logo-full.png` hauteur 72px posé
  directement sur le beige (pas de pastille), baseline mono « Cuisine ·
  Cœur · Convivialité », CTA rouge « Restez informé » à droite (ouvre la
  modale newsletter existante).
- **4 colonnes** : pitch + icônes sociales (icônes SEULES, pas de liens
  texte doublons — Instagram https://www.instagram.com/aleonmange/ et
  Facebook https://www.facebook.com/aleonmange) / Nous trouver (adresse +
  lien plan d'accès) / Horaires boutique / Nous contacter (tel + email).
- **Barre légale** : © 2026 À Léon Mange · Mentions légales, et à droite la
  mention mono « BEAUJOLAIS · FAIT MAISON ».

## 4. Assets

Extraire de la maquette (ou reprendre du repo si déjà présents) :
`alm-logo-full.png` (header + footer), `alm-mark.png` (manifeste),
`alm-favicon.png`, `truck-hero.jpg`, `histoire-labo.jpg`,
`accueil-boutique.jpg`, `accueil-traiteur.jpg`, `accueil-truck.jpg`.
Note : `chefs-portrait.png` est EXCLU (brandé Foodizy — séparation de
marque stricte). Toute photo des chefs doit être une photo ALM neutre.

## 5. Design tokens (rappel)

- Fond page `#EDE7DA` ; surfaces `#FBF8F1` ; bordures `#ECE3D2`/`#E4DAC6` ;
  bande header/footer `#EFE6D2`.
- Canard `#0E3947` (texte + bande manifeste) ; accent rouge `#D81020` ;
  terracotta `#B0704C` (eyebrows) ; doré `#F0C173` (accents sur canard) ;
  texte courant `#3A4A44` ; secondaire `#6B7469`.
- Typo : Bricolage Grotesque (display 800), Hanken Grotesk (corps),
  Spline Sans Mono (eyebrows/labels uppercase).
- Radius : cartes 18–22px ; pills/CTA 100px.

## 6. Points ouverts / navette

- Cette maquette est DESKTOP. La déclinaison mobile (empilement 1 colonne,
  hero photo sous le texte, parcours en 2×2 ou vertical) est à produire à
  l'intégration en suivant les patterns responsive du site existant —
  signaler à Arnaud si un arbitrage de mise en page mobile est nécessaire.
- Les liens du pont canaux et du header pointent sur `#` dans la maquette :
  brancher sur les routes réelles.
- « Voir le plan d'accès » : cible à définir (ancre contact ou Google Maps).
