# Audit de conformité maquette ↔ code — écran par écran

Référence : `handoff/MOCKUP_DIGEST.md` (+ HANDOFF §02). Mis à jour à chaque écran livré.
Légende : ✅ présent · 🟡 volontairement absent/différent (raison) · 🔴 oublié/à faire · CTA = état des actions.

## Shell (sidebar / topbar / thème)
- ✅ Sidebar 250px canard #0e3947, logo rond + « A Léon Mange / ATELIER », 6 groupes mono uppercase, item actif #1493be, badges dynamiques (notifs non lues, commandes ouvertes — masqués à 0), pied avatar + profil réel + déconnexion.
- ✅ Topbar sticky crème translucide + blur, recherche (visuelle), bouton « Vente » rouge → /sale, cloche avec pastille non-lu.
- ✅ Tokens (couleurs/typos/radius/scrollbar/::selection) dans `globals.css`.
- 🟡 Recherche topbar non fonctionnelle (placeholder) — la maquette ne spécifie aucun comportement de recherche.
- 🟡 Bouton « Vente » = lien vers /sale, pas la modale `saleOpen` de la maquette (une seule surface de saisie, moins de duplication). 
- 🟡 Pied sidebar : profil réel connecté (la maquette montrait « Audrey Depouilly · Cheffe » en dur).
- CTA : navigation ✅ · déconnexion ✅ réelle.

## login (hors maquette — nécessaire à l'app réelle)
- ✅ Connexion / création de compte (1er inscrit = owner via trigger), erreurs FR, redirections proxy.ts.

## catalog — Catalogue (MOCKUP §3.5)
- ✅ Bouton « Nouveau produit » (bleu), état vide dédié, lignes cliquables → drawer d'édition, colonnes Produit/Catégorie/Mode/Prix/Coût/Marge/Statut, hover, compteurs par groupe.
- ✅ Coût & Marge dérivés de la fiche liée (source unique `lib/calculs.ts`), « — » si non calculable.
- ✅ « Retirer d'un canal » = soft delete (badge Retiré, ligne grisée).
- 🟡 Groupé par CANAL (la maquette groupait par catégorie avec badges multi-canaux F/B/T) : notre modèle est mono-canal par produit, conforme au Contrat (« catalogues de vente distincts par canal ») — le recouvrement passe par la couche composant, pas par le produit.
- 🟡 Pas de recherche/onglets canaux dans la barre (groupes canal affichés d'un bloc) — à ajouter si le catalogue réel devient long.
- CTA : créer ✅ · éditer ✅ · retirer/réactiver ✅ · lier une fiche ✅ (tous réels, testés en base).

## recipes — Recettes & plats (MOCKUP §3.6)
- ✅ Bouton « Nouveau plat » (bleu), grille de cartes minmax(330px), en-tête avatar-initiale + nom + rendement/étapes, lignes composant (pastille catégorie, grammage, coût ligne), encart « Coût & marge » #f1ead9 badge Calculé, marge « brute matière » (libellé exact), note « marge nette dans Finances ».
- ✅ Création de composant inline dans le drawer (couche commune, lue par id).
- 🟡 Section « Recettes candidates » (votes communauté) omise — dépend du référentiel social, POINT OUVERT #4.
- 🟡 Vignette photo remplacée par initiale (les photos de la maquette sont des placeholders démo).
- 🟡 Chips santé/nutri/éco et allergènes omis (aucun champ au modèle — à cadrer si souhaité).
- CTA : créer fiche ✅ · créer composant ✅ (réels, testés). Édition de fiche 🔴 à venir (création seule en v1).

## settings — Emplacements (HANDOFF §01, écran ajouté)
- ✅ Table éditable : ajouter / renommer / désactiver-réactiver, jamais de DELETE ; code stable auto-slugifié immuable ; jour de semaine ; inactifs grisés listés.
- 🟡 Écran absent de la maquette (17 écrans) — exigé par le handoff (« gérée depuis Réglages ») ; design aligné sur le système.
- CTA : tous réels, testés en base.

## clients — Clients (MOCKUP §3.15)
- ✅ « Nouveau client » (rouge), KPI clairs (masqués à vide), table (client+CP, type, contact, Cmd, Dernière, CA remis, statut), fiche éditable, désactivation soft delete.
- ✅ Agrégats par client dérivés de v_vente_remise (source unique) — s'allument avec les ventes.
- 🟡 Entonnoir communauté → client, segments/chips, « À relancer », export CSV : démo maquette hors périmètre v1 (référentiel social/communauté = POINT OUVERT #4).
- 🟡 Fiche dépliable (mini-KPI + dernières commandes) : réduite à l'édition drawer en v1 ; l'historique par client viendra avec l'écran client détaillé si souhaité.
- CTA : créer ✅ · éditer ✅ · désactiver/réactiver ✅ (réels, testés).

## users — Utilisateurs & rôles (MOCKUP §3.17)
- ✅ 3 KPI foncés, liste des profils réels (avatar initiale, badge rôle, date d'arrivée), matrice « Accès par rôle » (✓/–), journal d'audit « Bientôt · V2 » grisé.
- ✅ Matrice marquée Bootstrap/indicative — POINT OUVERT #3 non figé.
- 🟡 « Inviter un utilisateur » présent mais INACTIF (assumé) : nécessite service_role ou politique RLS dédiée — POINT OUVERT #3. Ajout d'équipe = « Créer un compte » sur /login (trigger → rôle equipe).
- 🟡 Email + « dernière connexion » non affichables (non exposés par la table profil / API client) — remplacés par la date d'arrivée.
- CTA : lecture réelle ✅ · inviter 🟡 inactif (décision à prendre) · éditer rôle 🟡 non offert (RLS self-only).

## sale — Saisie de vente (MOCKUP §3.2, Contrat §01-04)
- ✅ Onglets canal (pastilles), chips mode de vente à 2 lignes + ligne destination, encart ambre « Session truck · emplacement » (badge AUJ. sur le marché du jour), grille 1.5fr/1fr, récap sticky foncé (lignes panier, total display 32px), carte paiement (chips, défauts par canal du Contrat §04), origine (chips + badge Proxy + note attribution), client (select + lien), traiteur (convives + date), précommande (date/créneau → due_at).
- ✅ Bowls « les deux en couches » : signature (fiche pré-remplie) vs composition libre (1 choix par catégorie, recette_id NULL — reco §7.5 par défaut).
- ✅ Boutique : steppers unité + pesée réelle en g (prix/kg) ; états vides par canal avec lien Catalogue ; « Encaisser » désactivé si panier vide / bowl incomplet / truck sans emplacement.
- ✅ Montants recalculés côté serveur ; occurred_at à l'encaissement ; fulfillment dérivé du mode_vente saisi.
- ✅ Confirmation réelle en place (bandeau vert avec montant) — pas de toast de démo.
- 🟡 « Nouveau client » = lien vers /clients (la maquette ouvrait un drawer local) — une seule surface de création.
- 🟡 Truck : la maquette proposait des catégories en boutons radio pleine page ; rendu ici par bowl ajouté avec 4 sélecteurs par catégorie (même règle « 1 au choix », plus compact multi-bowls).
- 🟡 Pas de « formule » traiteur distincte (ligne_type formule inutilisé) : le catalogue n'a pas de notion de formule — à cadrer si besoin.
- CTA : « Encaisser » / « Enregistrer la commande » ✅ réels (4 scénarios testés jusqu'en base).

## orders — Commandes du jour (MOCKUP §3.3)
- ✅ Encart info (« le comptoir instantané n'apparaît pas ici »), onglets jour (Aujourd'hui/Demain/date + compteur), 4 KPI foncés, groupes par créneau (badge heure 52px foncé, chevron, client + pill canal, lignes/portions/couverts/montant mono, pill statut), expand → chips composants « À produire », colonne « Charge à produire » (barres par composant).
- ✅ Avancement réel a_produire→en_prod→pret→remis (une étape à la fois, garde-fou concurrence), journalisé dans fulfillment_event avec opérateur ; bascule CA à la remise.
- 🟡 « Nouvelle vente » du header remplacé par le bouton Vente global de la topbar (déjà présent partout).
- 🟡 Alerte rouge « retard » optionnelle de la maquette non implémentée (règle d'alerte = POINT OUVERT #2).
- CTA : avancer le fulfillment ✅ réel (testé, 3 événements en base).

## history — Historique des ventes (MOCKUP §3.8)
- ✅ Onglets période + recherche pill, ChanFilter partagé (canal → emplacements truck), 3 KPI foncés recalculés en live (panier moyen « — » à 0), groupes par jour (en-tête #f1ead9 avec compteur/total), lignes (heure mono 46px, pastilles composants, résumé + client, badge Import, pill canal, pill paiement, prix display), détail dépliable, lecture seule.
- 🟡 Période par défaut 7 jours (maquette non spécifiée).
- CTA : filtres ✅ · détail ✅ · aucune mutation (conforme).

## insight — Insight stratégique (MOCKUP §3.13)
- ✅ Cartes CONSTAT (700/15.5) + CHIFFRE (chip rouge translucide) + ACTION (flèche verte + lien écran d'exécution), blocs par urgence avec pastille/compteur, rang + impact estimé (display 22px), tags Calculé/Démo.
- ✅ CTA réels : « Marquer traité » / « Reporter » (statut persisté) ; tri urgence→impact dans lib/insights.ts = SOURCE UNIQUE partagée avec le dashboard.
- 🟡 RÈGLES de génération non implémentées (POINT OUVERT #2) — l'écran naît vide « Rien à arbitrer ».
- 🟡 Jauge de fiabilité (carte foncée % calculé/démo) et onglets « Objectif » omis : sans moteur de règles, pas de mix calculé/démo à mesurer ni d'objectifs à filtrer.
- 🟡 ChanFilter omis (les insights n'ont pas de dimension canal au modèle actuel).
- CTA : traiter ✅ · reporter ✅ · lien action ✅.

## dashboard — Tableau de bord (MOCKUP §3.1)
- ✅ Verdict tricolore (styles exacts du README : bord gauche 5px, fonds dédiés) avec facts à droite ; règle affichée comme INDICATIVE « à valider (point ouvert #2) » : rouge=retard/critique, vert=CA≥J-7, ambre=activité, neutre=journée pas démarrée.
- ✅ 3 key insights = MÊME jeu qu'Insight (.slice(0,3), même tri — vérifié par test) ; clic → Insight.
- ✅ CA du jour par canal (barres + delta vs J-7, « — » sans référence), ventes + panier moyen (masqué à 0), top plats, charge à produire + prochain créneau (v_commande_ouverte), traiteur J/J+1/J+2, alertes vitales (compteurs par sévérité), liens vers écrans sources.
- 🟡 « Objectif du jour » : aucun paramétrage d'objectif au modèle — état vide propre, à cadrer.
- 🟡 Bandeau « X/7 blocs en réel » omis : toutes les données sont réelles (le bandeau maquette mesurait la part de démo).
- 🟡 Pill statut « Atelier ouvert · Beaujolais » omise (aucune notion d'ouverture au modèle).
- CTA : navigation ✅ (aucune mutation, conforme).

## finance — Finances (MOCKUP §3.11)
- ✅ Onglets période + canal, 4 KPI foncés avec sous-libellés, table « CA & marge nette par plat » (colonnes maquette), « Paramètres de rentabilité » (MO/portion + transport/portion, persistés — migration 0008), CA par canal (barres + ventes + panier), carte foncée « Export comptable » avec bouton rouge → CSV RÉEL téléchargé.
- ✅ Marges aux libellés DISTINCTS : « brute matière » vs « nette » ; « — » si paramètres manquants ; couverture de coût honnête (« N/M lignes costées »).
- 🟡 Lignes TVA omises (aucun taux au modèle — à cadrer avec la compta).
- 🟡 « Tournées de livraison » omises (transport simplifié en €/portion — à affiner si besoin).
- 🟡 Badge « auto » des paramètres maquette → saisie réelle à la place (pas de calcul automatique de MO sans données de paie).
- 🟡 Coût d'une composition libre de bowl = fiche du produit en proxy (les quantités réelles par composant ne sont pas pesées à la vente).
- CTA : enregistrer paramètres ✅ · export CSV ✅ (réels, testés).

## sales — Ventes & tendances (MOCKUP §3.14)
- ✅ Pills légende Calculé, période + ChanFilter, 4 KPI clairs, matrice plat × canal (grille maquette, cellules heat), bar chart saisonnalité 7 jours CLIQUABLE (jour → filtre KPI/matrice + bouton reset), carte latérale CA par emplacement (truck) / détail par jour.
- 🟡 « Invendus par canal » omis : volumes démo dans la maquette, aucune donnée d'invendus au modèle (viendra du gaspi Phase 4+).
- 🟡 Saisonnalité limitée aux 7 derniers jours calendaires (la comparaison période/période viendra avec l'historique réel).
- CTA : filtres/clic jour ✅ (lecture seule, conforme).

## productivity — Productivité (MOCKUP §3.12)
- ✅ 4 KPI clairs badge Calculé (commandes remises, cycle complet, temps de production, attente de retrait — moyennes réelles, « — » sans données), table des cycles par commande, filtre canal.
- ✅ Source : fulfillment_event (transitions horodatées réelles écrites par Commandes).
- 🟡 « Temps & rendement par lot », « Économie par recette », « Main-d'œuvre », « Pertes & gaspillage » : dépendent des lots (Phase 4), des temps théoriques de fiche (non modélisés) et de la MO — signalés, non simulés.
- CTA : filtre ✅ (lecture seule).

## Écrans restants (états vides Phase 0 — audit à venir avec leur implémentation)
notifs · import · prod · haccp · stock · commu

## Points d'attention transverses signalés
1. **CA d'une précommande** : à la remise, la vente entre dans v_vente_remise **datée par son occurred_at (jour d'encaissement)**, pas par le jour de remise — lecture littérale du Contrat (« occurred_at porte le jour de la vente ; CA compté sur remis »). Une commande traiteur saisie mardi et livrée vendredi apparaît donc, une fois remise, dans l'historique de mardi. À VALIDER avec Arnaud (alternative : occurred_at = remise pour les précommandes).
2. **Rafale d'encaissements** : pas de revalidatePath dans createVente + saisie gelée pendant l'écriture (le re-render de la route courante avalait les clics suivants — diagnostiqué en E2E réel).
3. `supabase gen types` non utilisé (types à la main, contrainte postgrest-js `type` vs `interface`) — à régénérer proprement quand l'outillage le permettra.
