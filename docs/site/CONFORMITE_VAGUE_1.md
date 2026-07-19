# Site public — Conformite maquette ↔ code · Vague 1 (2026-07-18)

> Grille : carte des ecrans d'INTEGRATION.md §03. Legende : ✅ present · 🟡 volontairement absent ou differe (raison) · 🔴 oubli.
> Rien n'est simplifie en silence : tout ecart est liste ici.
> Derniere verification : 2026-07-18, E2E complet avec les VRAIES lectures Supabase (cle service_role active). Resultats en bas de page.

| Ecran maquette | Route | Etat | Detail |
|---|---|---|---|
| `d-acc` Accueil | `/` | ✅ | Hero canard + 3 cartes canaux BOUTIQUE EN TETE (badge accent « Le plus simple »), bandeau truck CALCULE (aujourd'hui / prochain jour / etat vide), bloc « Notre maison », statut boutique ouverte. Photos = placeholders identifies |
| `d-lettre` / `d-lettre-ok` Lettre d'info | modale globale | 🟡 partiel | Modale presente (en-tete, menu mobile, pied de page) ; l'INSCRIPTION (ecriture + opt-in RGPD) = Vague 2 → etat « Ouverture prochainement » au lieu du formulaire. Pas de bouton mort |
| `d-btq` La Boutique | `/boutique` | ✅ | Hero « Passez quand vous voulez », infos pratiques + horaires REELS §06, carte VITRINE sans prix (2 colonnes, lue du catalogue Atelier, etat vide propre), CTA click & collect. Signatures : section presente en ETAT VIDE (contenu reel a venir — le carrousel demo n'est pas porte) |
| `d-cc` Click & collect | `/boutique/commander` | 🟡 | Route reelle, etat « Ouverture prochainement » + telephone reel + annonce de la confirmation atelier. Panier/creneaux/commande = Vague 2 (ecritures) |
| `d-trait` Le Traiteur | `/traiteur` | ✅ | Hero, galerie « Quelques receptions » (4 cartes, photos a venir), carte traiteur (catalogue Atelier, badge « 6 personnes minimum · devis sans engagement »), « Comment ca marche » en 4 etapes + « pas de total ferme en ligne ». Etape « facturation » au libelle sobre (conditions de reglement au prospect = decision ouverte, signale) |
| `d-devis` Demande de devis | `/traiteur/devis` | 🟡 | Route reelle, « demande ≠ engagement » + reponse sous 48h annonces, etat « Ouverture prochainement ». Formulaire = Vague 2 ; l'echeance J+30 n'apparait NULLE PART cote prospect |
| `d-truck` Le Food truck | `/food-truck` | ✅ | Emplacements de la semaine (table Atelier, « Aujourd'hui » CALCULE mis en avant, CTA precommande contextualise par jour), carte du truck avec prix (catalogue Atelier), badge « Paiement au retrait · sur place », etats vides |
| `d-precmd` Precommande truck | `/food-truck/precommander` | 🟡 | Route reelle, etat « Ouverture prochainement ». Panier contextualise = Vague 2 |
| `d-hist` Notre histoire | `/histoire` | ✅ | Audrey & Victorien, le laboratoire, 3 piliers (Local / Fait maison / De saison). Textes longs definitifs = contenu reel a venir (balise a l'ecran) |
| `d-contact` Contact | `/contact` | ✅ | Coordonnees REELLES §06 (adresse, tel, email, reseaux, plan d'acces), horaires. Formulaire « Un message ? » = ecriture → etat « Ouverture prochainement » + mailto |
| `d-login` Creation de compte | — | 🟡 ABSENT | Espace client INTERDIT avant la refonte RLS (relais §5) : ni route, ni bouton « Mon compte » dans la nav (present dans la maquette, retire volontairement pour ne rien promettre d'authentifie) |
| `d-compte` Tableau de bord client | — | 🟡 ABSENT | Idem (fidelite comprise — compteur derive, plus tard) |
| `d-cmd` Detail commande | — | 🟡 ABSENT | Idem |
| `d-profil` Profil client | — | 🟡 ABSENT | Idem |
| `d-mentions` Mentions legales | `/mentions-legales` | ✅ | 5 sections de la maquette, placeholders juridiques IDENTIFIES (badge « contenu a fournir » : raison sociale, SIRET, hebergeur, RGPD definitif) |

## Transverse

- ✅ Design system §02 : polices Bricolage/Hanken/Spline Mono (next/font), tokens creme/canard/vert/terracotta, `--accent` reglable (#D81020 par defaut), boutons pilule, badges mono, cartes 16-18px, stepper (composant pret pour la Vague 2).
- ✅ Mobile d'abord : nav plein ecran, empilement, cibles 42px+ ; chaque route verifiee a 390 px ET 1440 px (E2E, 20 rendus). Le menu mobile plein ecran a du etre sorti du `<header>` (piege backdrop-filter, cf. ARCHITECTURE.md).
- ✅ Etats vides partout (zero NaN, zero moyenne sur zero) ; lectures desactivees sans cle = message serveur clair + etats vides.
- ✅ Zero tiret cadratin dans les textes visibles (verifie par E2E sur les 10 routes — la maquette en contenait, reecrits).
- ✅ Zero photo IA, zero visuel Foodizy, zero asset maquette : placeholders neutres « Photo a venir ».
- ✅ Acces donnees : role `site_lecteur` (lecture seule garantie par la base) via `apikey` anon + `Bearer` JWT depuis le 2026-07-18 — la service_role est sortie du site. Zero occurrence dans le bundle client (`service_role`, `site_lecteur`, valeurs des cles : grep = 0).
- 🟡 « Annonces » : aucune surface dans la maquette → rien a porter (signale ; social_post disponible si besoin).
- 🟡 Sitemap/robots avances : metadata + OG de base seulement en Vague 1 (a completer au deploiement).

## Verification avec donnees reelles (2026-07-18, cle service_role active)

E2E Playwright (Chrome systeme) : 10 routes x 390 px et 1440 px, 23 captures, assertions de contenu.

- ✅ Carte truck reelle : 3 familles (Bowls, Complementaires, Plats prepares), 15 produits, prix affiches, sans description (colonne absente : comportement attendu).
- ✅ Carte traiteur reelle : 3 familles (Pieces salees chaudes/froides, Pieces sucrees), 35 produits, badge « 6 personnes minimum · devis sans engagement ».
- ✅ Vitrine boutique : PAS l'etat vide attendu — le catalogue Atelier contient 50 produits boutique actifs (Charcuterie & aperitif, Libre-service, Plats composes, Plats prepares). Rendu SANS prix, correct. Certains libelles produits sont sans accents (« Carottes rapees ») : donnee du catalogue Atelier, editable par les chefs, pas un defaut du site.
- ✅ Emplacements truck reels : Mardi (Marche du Bois d'Oingt), Mercredi (Tassin-la-Demi-Lune), Jeudi (La Tour-de-Salvagny), horaire provisoire « 11h30 à 14h ». Badge « Aujourd'hui » CALCULE verifie un samedi : aucun badge, CTA contextuel « Le truck ne sort pas aujourd'hui · prochains rendez-vous ci-dessus ». Accueil : bandeau « De retour mardi : Marche du Bois d'Oingt ».
- ✅ Zero NaN, zero tiret cadratin, zero erreur console applicative sur les 20 rendus ; menu mobile plein ecran et modale lettre d'info verifies apres correctif EnTete.
- ✅ Coordonnees reelles : 1923 route de la vallee, 69620 Letra · 06 75 36 23 26 · contact@aleonmange.com · Mar-Ven 9h-13h / 15h-19h, Sam 9h-14h. La pastille accueil « Boutique ouverte · Mardi a vendredi 9h a 19h » reprend la maquette CD a l'identique (simplification de la coupure meridienne voulue par la maquette).
- ✅ Preuve zero fuite : `service_role` et la VALEUR de la cle absents de `site/.next/static/` (0 fichier), valeur absente de tout `.next/` et de tout fichier suivi par git ; `site/.env.local` ignore.
- ✅ Builds + lint + tsc verts pour `site/` ET l'Atelier (isolation maintenue).
- 🟡 Favicon absente (`/favicon.ico` et `/icon.svg` en 404, une erreur console par premiere visite) : choix d'asset a valider (alm-mark.png ?), a traiter avant deploiement.
