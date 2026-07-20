# Audit maquette CD vs production — Site public A Leon Mange

> Livrable Mission 1 (2026-07-19). Audit ecran par ecran : maquette CD (`docs/handoff-site/A_Leon_Mange_-_Site_desktop.html`, ecrans `d-*`) vs code implemente (prod `main` + branche `site-vague-4`).
> **Cadrage** : Arnaud AIME la version prod et la GARDE. Cet audit sert a COMPRENDRE les ecarts et leur rationnel, pas a tout refaire. Pour chaque ecart : (a) maquette, (b) implemente, (c) rationnel documente (cite) ou « non documente » (aucune invention retroactive), statut.
> **Methode** : 10 agents en lecture seule (un par ecran), extraction de la section maquette + lecture de la page + recherche du rationnel dans CLAUDE.md, ARCHITECTURE.md, CONFORMITE_VAGUE_1/2/3/4.md et les messages de commit.
> **Legende statut** : `garde tel quel` (ecart assume/documente, rien a faire) · `a trancher` (choix a valider par Arnaud) · `a corriger` (defaut). **Aucun defaut technique (`a corriger`) trouve.**
> Espace client (d-login/d-compte/d-cmd/d-profil) : deja audite dans `CONFORMITE_VAGUE_4.md` (Phase B), hors de ce document.

## Constat global

La prod est **fidele a l'INTENTION** de la maquette (memes ecrans, memes sections, memes parcours) avec un parti pris CONSTANT et coherent :
- **Contenu par la donnee** (carte, emplacements, horaires lus de l'Atelier) au lieu des exemples de demo figes.
- **Textes reecrits** : zero tiret cadratin (regle Arnaud) + contenu de demo non porte (« le transactionnel part vide ») ; les textes narratifs longs restent a ecrire avec le marketing.
- **Design system maison** (composants `Carte`, `BadgeMono`, etc.) au lieu du HTML inline de la maquette : d'ou des heros en aplat couleur (au lieu de heros photo), des sections en cartes claires, des selecteurs deroulants (au lieu de grilles de boutons).
- **Etats vides propres** partout (la maquette n'en a pas).
- **Ecritures reportees** proprement (formulaire contact = mailto ; newsletter = modale double opt-in).

## Synthese — points a TRANCHER par Arnaud (le reste = garde tel quel)

| # | Ecran | Point | Enjeu |
|---|---|---|---|
| 1 | Accueil + Traiteur | **CTA « Demander un devis » a deux destinations** : le hero accueil et la page traiteur pointent `/traiteur/devis` ; la carte traiteur de l'accueil pointe `/traiteur` (page). Meme libelle, deux cibles. | Coherence de navigation. Uniformiser vers `/traiteur/devis` ? |
| 2 | Devis + Boutique/CC + Truck/precmd | **Ecran de confirmation sobre** : ni numero de reference mis en avant facon badge, ni recap detaille des lignes/total, ni boutons « Nouvelle commande / Retour ». La reference EST affichee (commande/precmd) mais discrete ; le devis ne remonte PAS son id. | UX post-envoi. Enrichir la confirmation (recap + reference devis + bouton reprise) ? |
| 3 | Food truck | **Hero sans photo plein cadre** : la maquette a un hero photo truck + overlay ; la prod a un hero en aplat canard, les 2 photos truck etant a cote de la carte. | Esthetique. Remettre une photo en fond de hero ? (les 2 photos truck existent deja). |
| 4 | Boutique/CC | **Titre de colonne « La carte a emporter » + badge « Carte de la semaine »** absents (la colonne empile directement les familles). | Detail editorial mineur. |
| 5 | Contact | **Formulaire « Un message ? » = etat « Ouverture prochainement » + mailto** (jamais cable). Documente « report Vague 2 » mais Vague 2 ne l'a pas livre (3 ecritures seulement). | Trancher : cabler un vrai `/api/contact`, ou assumer le mailto en permanence ? |
| 6 | Traiteur | **Etape « La facturation » au libelle sobre** (« Apres la prestation »), sans conditions de reglement. | DEJA documente comme decision ouverte (ARCHITECTURE.md) : afficher ou non les conditions J+30 au prospect. |
| 7 | Mentions legales | **Textes juridiques reformules** + mention « Responsable de publication » disparue + « consentement newsletter revocable » retire du bloc RGPD. | A valider avec le contenu juridique reel (deja balise placeholder). |

## Arbitrages Arnaud (2026-07-20, go-live Vague 4)

Decisions prises sur les 7 points a trancher. **Aucun n'est bloquant pour le merge de la Vague 4.**

- **Points 1 a 6 : garde tel quel**, consignes au backlog (evolutions post-ouverture, pas de correctif avant merge).
  - Point 5 (formulaire Contact = mailto) : le mailto est **assume en V1** et pointe desormais vers **aleonmange@yahoo.com** (adresse reelle du camion), comme tous les emails affiches du site.
- **Point 7 (mentions legales) : backlog pre-ouverture, NON bloquant** pour le merge. A reprendre avec le contenu juridique reel (raison sociale, SIRET, responsable de publication, clause RGPD revocable) avant l'ouverture.

## Points RESOLUS dans cette session (Mission 2, meme branche)

- **Logo** : la maquette utilise une image logo (~50px) ; la prod avait une pastille ronde + wordmark tape, car le logo du handoff etait ecarte (fond noir, detourage sale — ARCHITECTURE.md/CLAUDE.md). **Mission 2 pose le vrai logo `Logo ALeonMange Site.png`** (header + pied de page). Ecart logo -> resolu.
- **Boutique — image devanture** : remplacee par les deux vraies photos (facade verte + interieur) en Mission 2. L'ecart « hero boutique en aplat au lieu de photo » reste (choix de structure) mais les visuels boutique sont desormais reels.

---

## Detail par ecran

### Accueil (`/`, d-acc)
Structure fidele (hero, « Par ou commencer ? » 3 canaux boutique-en-tete, « Notre maison »), traitement reoriente.

| Element | Maquette | Implemente | Rationnel | Statut |
|---|---|---|---|---|
| Hero, fond | Sur creme, texte fonce, image a droite | Fond canard fonce, texte clair | CONFORMITE_V1 « Hero canard + 3 cartes » (acte, motif non explicite) | garde |
| Hero, 1er CTA | « Restez informe » (newsletter) | « Decouvrir la boutique » -> /boutique | « Boutique en tete, reequilibrage acte » (page.tsx, CONFORMITE_V1) ; newsletter etait inactive en V1 | garde |
| Hero, paragraphe | Long (4 lignes, 3 canaux detailles) | Court (2 lignes) | Zero-cadratin documente ; raccourci = non documente | garde |
| Hero, image + badge | « Plats boutique » + badge « ★ Le fait-maison » | truck-vignes.webp, sans badge | Visuels handoff CD (commit cce78c6) ; choix truck + absence badge = non documente | garde |
| « Notre maison » | Section canard foncee, photo chefs REELLE a droite, CTA or | Carte claire, PhotoAvenir placeholder a gauche, CTA accent | Placeholder chefs VOLONTAIRE (shooting) ; inversion couleur/cote = non documente | garde |
| Cartes canaux, badges | Overlay sur image, « ★ », bordure accent sur boutique | Dans le corps, sans « ★ », pas de bordure accent, badge « Evenements » ajoute (traiteur) | Badge « Le plus simple » documente ; le reste non documente | garde |
| Carte traiteur, CTA cible | « Demander un devis » -> #d-devis | -> /traiteur (page) ; le hero du meme libelle -> /traiteur/devis | non documente | **a trancher** |
| Carte truck, texte | Fixe/conditionnel code en dur | Calcule depuis emplacementsTruck() | Documente (bandeau calcule) | garde |
| Textes hero | Cadratins, « & », pastille verte | Deux-points, « et », pastille or | Zero-cadratin documente ; couleur or = non documente (trivial) | garde |

### La Boutique (`/boutique`, d-btq)
Fidele a l'intention, restructure (hero aplat, signatures par la donnee sans prix).

| Element | Maquette | Implemente | Rationnel | Statut |
|---|---|---|---|---|
| Hero | Photo devanture + overlay canard, h1 sur photo | Aplat canard, sans photo ; devanture releguee en carte plus bas | Visuels arrives apres V1, glisses sans restructurer (ARCHITECTURE Visuels) ; hero aplat = V1 | garde |
| CTA « Click & collect », place | En bas de carte | Dans le hero -> /boutique/commander | non documente (route correcte) | garde |
| Encart « Click & collect » dedie (carte sombre) | Present | Absent (entree via CTA hero) | non documente | garde |
| Encart « Le marche du moment » (demo) | Present | Absent | contenu.ts « aucun contenu de demo repris » | garde |
| Recettes signatures | Carrousel + PRIX + fleches | Grille sans prix, pilotee par image_url (0033), etat vide | CONFORMITE_V1 « carrousel demo non porte, carte vitrine sans prix » | garde |
| Horaires, badge « PROVISOIRES » | Present | Absent (horaires reels 0023) | Horaires reels pilotes Atelier | garde |
| Horaires, statut « Ouvert aujourd'hui » | Present | Absent sur Boutique (present sur Accueil) | non documente pour la boutique | garde |
| Carte « Nous trouver » + plan | Absente (adresse en footer only) | Ajoutee, lien Google Maps itineraire | Image plan ecartee (artefact @yahoo) -> lien Maps | garde |
| Image devanture | cc352c6a « La devanture » | boutique-devanture.webp -> **remplacee Mission 2 (facade + interieur)** | Visuels handoff ; Mission 2 pose les vraies photos | garde (resolu M2) |

### Boutique / Click & collect (`/boutique/commander`, d-cc)
Meme flux (panier + retrait + coordonnees, precommande a confirmer, sans paiement), UI simplifiee.

| Element | Maquette | Implemente | Rationnel | Statut |
|---|---|---|---|---|
| Titre colonne « La carte a emporter » + badge « Carte de la semaine » | Present | Absent (familles empilees) | non documente | **a trancher** |
| Selecteur de poids | Stepper seul | Select 250/500/1000 g pour articles au poids | CONFORMITE_V2 « articles au poids » | garde |
| Panier, titre + compteur + banniere « a regler » | « Votre panier » + compteur + banniere iconographiee | « Votre precommande », sans compteur, mono simple | « precommande » = framing a-confirmer ; reste non documente | garde |
| Choix creneau | Boutons jour + grille horaire | Liste deroulante (creneaux formates) | Creneaux DERIVES des horaires (source unique) ; forme liste = non documente | garde |
| Champs coordonnees | Placeholder seul, tel 2e sans « optionnel » | Labels explicites, email avant tel, « Telephone (optionnel) » | Email prioritaire, tel secours (0038) ; ordre/labels = non documente | garde |
| CTA + mention | « Envoyer ma commande » + icone avion | « Envoyer ma demande », sans icone | « demande » = framing a-confirmer ; icone = non documente | garde |
| Ecran confirmation | Icone check + recap lignes + total + bouton « Nouvelle commande » | Sobre : badge + reference + retrait, sans recap ni bouton | Reference/retrait du serveur ; total non re-affiche (indicatif) ; omissions = non documente | **a trancher** |
| Etats vides (carte/creneaux) | Aucun | Ajoutes | « Etats vides propres » documente | garde |

### Le Traiteur (`/traiteur`, d-trait)
Globalement fidele, ecarts surtout cosmetiques/editoriaux.

| Element | Maquette | Implemente | Rationnel | Statut |
|---|---|---|---|---|
| En-tete, CTA droite | Pilule « Demander un devis » | « Mon compte » + « Restez informe » (EnTete partage) | non documente | garde |
| En-tete, logo | Image logo 50px | Pastille ronde + wordmark tape -> **logo reel pose en Mission 2** | Logo handoff ecarte (detourage sale) ; M2 corrige | garde (resolu M2) |
| Hero, paragraphe | Nomme les chefs | Reformule, cite les canaux, « sans engagement », ne nomme plus les chefs | non documente | garde |
| CTA devis, fleche + occurrences | 3 occurrences avec fleche + ligne « 6 pers min » | 1 seul (hero), sans fleche, ligne « 6 pers » dans un badge | non documente | garde |
| « Quelques receptions », structure | 4 cartes texte + galerie 4 images carrees separees | 4 cartes image+texte fusionnees | CONFORMITE_V1 « design fusionne assume » | garde |
| « Comment ca marche », conteneur | Carte sombre, pastilles numerotees colorees, note a fleche | 4 cartes claires, badges carres uniformes, note en texte simple | non documente | garde |
| Etape 4 « Facturation » | « Reglement apres la prestation, a reception de facture » | « Apres la prestation » (sobre) | Decision ouverte documentee (conditions reglement au prospect) | **a trancher** |
| Libelles « & » -> « et » | Esperluette | « et » | non documente (coherent zero-cadratin) | garde |

### Traiteur / Devis (`/traiteur/devis`, d-devis)
Fidele dans l'intention (demande != commande, 48h, aucun paiement), nettement simplifie.

| Element | Maquette | Implemente | Rationnel | Statut |
|---|---|---|---|---|
| Sidebar « Comment ca marche » (4 etapes detaillees) | Carte sombre laterale | Timeline neutre en tete, libelles seuls | « Timeline NEUTRE, J+30 cote Atelier » (page.tsx, CONFORMITE_V1, ARCHITECTURE) | garde |
| Etape 4, conditions de reglement | « a reception de facture » + note | Aucune condition affichee | Decision ouverte (J+30 jamais au prospect) | garde |
| Ecran confirmation | Riche (check, « La suite », boutons) | Sobre (badge + 1 paragraphe) | non documente | garde |
| Numero de reference | Badge « Demande recue · ref » | Non affiche (l'id RPC n'est pas remonte) | non documente | **a trancher** |
| Type d'evenement | Pilules predefinies | Champ texte libre | non documente | garde |
| Budget indicatif | Menu deroulant 5 choix | Champ texte libre | non documente | garde |
| Carte « Une question ? » (tel/email) | Presente sur la page | Absente (coordonnees en footer) | non documente | garde |
| Titre / sur-titre / icone bouton | « Parlez-nous... » / « Le Traiteur · ... » / avion | « Decrivez-nous... » / « Demande de devis » / sans icone | non documente | garde |

### Le Food truck (`/food-truck`, d-truck)
Tres bonne fidelite contenu (textes, carte, emplacements calcules) ; mise en page divergente.

| Element | Maquette | Implemente | Rationnel | Statut |
|---|---|---|---|---|
| Hero, image de fond | Photo truck plein cadre + overlay | Aplat canard, sans photo (2 photos truck a cote de la carte) | Placement des visuels documente ; l'ABSENCE de fond photo = non documente | **a trancher** |
| Hero, CTA + badge | En bas de carte | Dans le hero | Badge documente ; emplacement = non documente | garde |
| Carte, disposition | Masonry 3 colonnes pleine largeur | Liste 1 colonne dans un encart + colonne photos | non documente | garde |
| Carte, 2 photos ajoutees | Aucune | truck-service + truck-vignes | Visuels handoff documentes | garde |
| Cartes emplacements | Ville en titre + recap | Libelle Atelier en titre + ligne « Chaque {jour} » ajoutee | Source unique Atelier documentee ; ligne recap = non documente | garde |
| Etats vides + « truck absent » | Aucun | Ajoutes | « Etats vides propres » documente | garde |

### Food truck / Precommande (`/food-truck/precommander`, d-precmd)
Fonctionnellement fidele, refonte de structure assumee (panier partage boutique/truck).

| Element | Maquette | Implemente | Rationnel | Statut |
|---|---|---|---|---|
| Layout 3 etapes numerotees | « 1 Vos plats / 2 Creneau / 3 Coordonnees » | 2 colonnes, panier partage, sans numerotation | commit 4baa219 « panier partage boutique/truck » | garde |
| Selecteur de creneau HORAIRE | Grille 5 creneaux horaires | Aucun (date derivee, debut de service 11h30) | creneaux.ts (due_at = debut de service) ; hotfix date complete | garde |
| Choix emplacement | Fixe/contextuel | Deroulant + pre-remplissage ?emplacement= | commit 4baa219, CONFORMITE_V2 | garde |
| Champs coordonnees | Tel courant | Email requis, tel optionnel | Email prioritaire (0038) | garde |
| CTA « Envoyer ma commande » | avec icone | « Envoyer ma demande », sans icone | framing a-confirmer (commit 34dcb11) | garde |
| Encadre « A regler au retrait » | Encadre + icone CB | Ligne mono simple | non documente | garde |
| Ecran succes | Check + recap + 2 boutons nav | Sobre (badge + ref + retrait), sans boutons | Statut/ref documentes ; omissions = non documente | **a trancher** |

### Histoire (`/histoire`, d-hist)
Trame fidele, mise en page reorganisee, textes condenses volontairement.

| Element | Maquette | Implemente | Rationnel | Statut |
|---|---|---|---|---|
| Photo des chefs | Vraie photo « Audrey & Victorien » | PhotoAvenir placeholder | VOLONTAIRE documente (shooting a venir) | garde |
| Structure du hero | Grille 2 col (texte + photo) | Texte seul, puis section 2 col (placeholder + labo) | non documente | garde |
| H1 | « Audrey & Victorien » | « Audrey et Victorien : tout part du laboratoire » | non documente | garde |
| Textes narratifs | 2 paragraphes riches (recit, beret) | 1 paragraphe sobre | Documente « contenu reel a venir avec le marketing » | garde |
| 3 piliers (Local/Fait maison/De saison) | Cartes horizontales avec icones, a cote du labo | Cartes verticales sans icone, section separee | non documente (contenu conforme) | garde |
| Legende « contenus reels a venir » | Aucune | Ajoutee (balise etat) | Documente (balise a l'ecran) | garde |
| Bloc Contact rattache | Dans le meme ecran | Extrait en page /contact dediee | Documente (CONFORMITE_V1) | garde |

### Contact (`/contact`, d-contact)
Fidele sur le fond, restructure ; formulaire en fallback.

| Element | Maquette | Implemente | Rationnel | Statut |
|---|---|---|---|---|
| Formulaire « Un message ? » | Vrai formulaire (nom/email/message + Envoyer) | Etat « Ouverture prochainement » + mailto | Report « Vague 2 » documente, MAIS jamais livre (pas de /api/contact) | **a trancher** |
| Image « Plan d'acces » (16/9) | Bloc image | Lien pilule Google Maps itineraire | Image ecartee (artefact @yahoo) documente | garde |
| Structure grille | 2 colonnes (infos + formulaire), bande beige | 3 cartes egales, sans bande | non documente | garde |
| Cartes tel/email + icones | 2 cartes avec pastilles icones | 1 carte, tel en gros, sans icones | non documente | garde |
| Horaires dans Contact | Absents (footer only) | Ajoutes (0023) | Documente (horaires sur 3 surfaces) | garde |
| Reseaux Instagram/Facebook | Boutons contour, ancres mortes #d-contact | Pilules vertes, liens reels | Liens reels (COORDONNEES) = correction | garde |

### Mentions legales (`/mentions-legales`, d-mentions)
5 sections fideles, placeholders juridiques assumes.

| Element | Maquette | Implemente | Rationnel | Statut |
|---|---|---|---|---|
| Disposition | Grille 2 col (RGPD pleine largeur) | Pile 1 colonne | non documente | garde |
| Encadrement blocs | Blocs nus | Composant Carte (bordure) | non documente | garde |
| Badge « Placeholder » | Aucun (crochets dans le texte) | BadgeMono « contenu a fournir » sur 3 blocs | Documente (placeholders identifies) | garde |
| Encart ✳ | Callout stylise | Paragraphe simple | non documente | garde |
| Texte « Editeur » | « Responsable de publication : [nom] » | Adresse/email reels, « Responsable de publication » disparu | Contenu reel a fournir documente ; reformulation = non documente | **a trancher** |
| Texte RGPD | Mention « consentement revocable » | Reformule « futurs formulaires », consentement retire, « [a valider] » | Placeholder documente ; reformulation/perte du consentement = non documente | **a trancher** |
| Ligne © interne | Presente | Absente (© au footer) | non documente | garde |
| robots noindex | N/A | Ajoute (page desindexee) | Coherent placeholder ; non documente | garde |
