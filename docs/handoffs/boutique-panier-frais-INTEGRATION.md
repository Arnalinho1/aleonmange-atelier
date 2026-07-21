# ALM — Bloc « Panier frais » (teasing) : guide d'intégration

Nouveau bloc sur la page Boutique du site public. Maquette de référence :
`ALM - Boutique Panier frais (teasing).html` (autonome — vues desktop et
mobile côte à côte, interactions fonctionnelles : vote + inscription).

## 1. Objet

Phase TEASING du futur produit « Panier frais du Beaujolais » (fruits &
légumes sur réservation). Le bloc collecte des intentions (email + vote de
préférences), il ne vend rien. Wording verrouillé : « Prévenez-moi du
lancement », mention « ce n'est pas une réservation ». Jamais « réserver »
ni « commander ».

## 2. Emplacement

`src/app/boutique/page.tsx` — section insérée entre « Nos recettes
signatures » et la grille infos pratiques / carte vitrine. Pleine largeur
du conteneur (max-w-[1280px]), carte canard `bg-canard` radius 22px.

## 3. Structure du bloc

- **Desktop** : grille 2 colonnes (1.15fr texte / 1fr photo pleine hauteur).
- **Mobile** : photo 16/9 en tête (badge « Bientôt » superposé), contenu
  dessous, formulaire empilé.
- Gauche : badge doré « Bientôt » + surtitre doré « Uniquement sur
  réservation » ; H2 « Le Panier frais du Beaujolais » ; paragraphe ;
  mini-vote 3 questions ; champ email + CTA rouge.
- Photo : `assets/panier-frais.png` (fournie), badge flottant
  « Producteurs / 100% Beaujolais » en bas-gauche (desktop).

## 4. Mini-vote (3 questions, choix unique par question, optionnel)

| Question | Options | Valeurs |
|---|---|---|
| Quelle taille ? | Petit · 2 pers. / Grand · 4-5 pers. | `petit` \| `grand` |
| À quel rythme ? | Chaque semaine / Tous les 15 jours | `hebdo` \| `quinzaine` |
| Quel contenu ? | Légumes / Fruits / Les deux | `legumes` \| `fruits` \| `mixte` |

Pills : inactif = contour crème translucide sur canard ; actif = fond doré
`#F0C173`, texte canard. Le vote est facultatif : l'email seul suffit.
Pas de question de retrait (exclusivement boutique pour l'instant).

## 5. Inscription email

- Réutilise le flux newsletter existant (`/api/newsletter`, double opt-in,
  composant `LettreInfo` comme référence de comportement) avec un tag de
  source distinct, ex. `source: "panier_frais"`, pour segmenter la liste.
- Payload à stocker avec l'intention : email + les 3 réponses du vote
  (nullables) + consentement horodaté.
- État succès : encart doré « Presque terminé » (vérifiez votre boîte mail),
  remplace le formulaire. Le vote reste affiché.

## 6. Données (navette)

- Nouvelle table d'intentions (ou extension de la table newsletter) :
  `email`, `taille`, `rythme`, `contenu`, `consent_at`, `source`.
- Le bloc est PILOTABLE : prévoir un flag côté Atelier pour l'afficher /
  le masquer, et à terme basculer le badge « Bientôt » vers le vrai
  parcours de réservation (V2 — hors périmètre ici).
- Agrégat des votes consultable côté Atelier (simple comptage par option)
  pour éclairer le lancement.

## 7. Tokens

Identiques au site : canard `#0E3947`, accent `#D81020`, doré `#F0C173`,
crème `#F3ECDD`/`#FBF8F1`, sous-texte sur canard `#CDDCE0`, mono-label
`#7FA3AD`. Typo Bricolage Grotesque / Hanken Grotesk / Spline Sans Mono.
Pills et CTA radius 100px, hauteur CTA 48px.
