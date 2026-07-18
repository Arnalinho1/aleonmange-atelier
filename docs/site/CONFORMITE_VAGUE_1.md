# Site public — Conformite maquette ↔ code · Vague 1 (2026-07-18)

> Grille : carte des ecrans d'INTEGRATION.md §03. Legende : ✅ present · 🟡 volontairement absent ou differe (raison) · 🔴 oubli.
> Rien n'est simplifie en silence : tout ecart est liste ici.

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
- ✅ Mobile d'abord : nav plein ecran, empilement, cibles 42px+ ; chaque route verifiee a 390 px ET 1440 px (E2E, 20 rendus).
- ✅ Etats vides partout (zero NaN, zero moyenne sur zero) ; lectures desactivees sans cle = message serveur clair + etats vides.
- ✅ Zero tiret cadratin dans les textes visibles (verifie par E2E sur les 10 routes — la maquette en contenait, reecrits).
- ✅ Zero photo IA, zero visuel Foodizy, zero asset maquette : placeholders neutres « Photo a venir ».
- ✅ Cle service_role : serveur uniquement, zero occurrence dans le bundle client (grep = 0).
- 🟡 « Annonces » : aucune surface dans la maquette → rien a porter (signale ; social_post disponible si besoin).
- 🟡 Sitemap/robots avances : metadata + OG de base seulement en Vague 1 (a completer au deploiement).
