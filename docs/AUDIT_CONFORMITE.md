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
- ✅ Encart info (« le comptoir instantané n'apparaît pas ici »), onglets jour (Aujourd'hui/Demain/date + compteur), 4 KPI foncés, groupes par créneau (badge heure 52px foncé, chevron, client + pill canal, lignes/portions/couverts/montant mono, pill statut).
- 🔵 **CHOIX MÉTIER (12/07/2026)** : colonne « Charge à produire » **PAR PRODUIT FABRIQUÉ** (revendus exclus, « + N bowls libres » à part) + bloc « **Besoins matières premières (dérivés des commandes)** » (plan × fiches, badge Dérivé). Dans le dépliage d'une commande, les chips composants sont désormais libellées **composition** (détail), plus « à produire ». La maquette montrait la charge par composant — corrigé : l'unité de production est le produit.
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
- 🔵 **CHOIX MÉTIER (12/07/2026)** : bloc « Charge à produire » **PAR PRODUIT FABRIQUÉ** (top produits, « + N bowls libres ») ; « portions restantes » = Σ qte des lignes transformées (le cumul par composant gonflait le chiffre : 1 bowl = 4-6 composants).
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
- ✅ **Bascule de primitive (12/07/2026, décision Arnaud)** : le coût ligne n'est plus le proxy `coutPortionProduit × qte` (bowls libres ignorés, poids compté 1 portion, revendus jamais coûtés) mais `coutMatiereLigneVente` (calculs.ts — dépliage B8 + `cout_achat` des revendus), LA MÊME primitive que Productivité. Effet attendu et vérifié : coût boutique 594 → 1 935 € sur 90 j (charcuterie au poids + revendus enfin coûtés), marge nette boutique en baisse ; traiteur inchangé au centime (100 % fiches à l'unité — le proxy y était déjà exact).
- CTA : enregistrer paramètres ✅ · export CSV ✅ (réels, testés).

## sales — Ventes & tendances (MOCKUP §3.14)
- ✅ Pills légende Calculé, période + ChanFilter, 4 KPI clairs, matrice plat × canal (grille maquette, cellules heat), bar chart saisonnalité 7 jours CLIQUABLE (jour → filtre KPI/matrice + bouton reset), carte latérale CA par emplacement (truck) / détail par jour.
- 🟡 « Invendus par canal » omis : volumes démo dans la maquette, aucune donnée d'invendus au modèle (viendra du gaspi Phase 4+).
- 🟡 Saisonnalité limitée aux 7 derniers jours calendaires (la comparaison période/période viendra avec l'historique réel).
- CTA : filtres/clic jour ✅ (lecture seule, conforme).

## productivity — Productivité (MOCKUP §3.12, ÉLARGI 12/07/2026 — phase données/calcul, design CD à venir)
- ✅ **Charge de production du vendu, TOUS canaux** (l'écran n'est plus vide sur truck/boutique — les instantanés naissent « remis » et ne traversent aucun cycle) : périmètre = ventes remises (v_vente_remise, même source que le CA), filtres canal × période (7/30/90 j).
- ✅ **Rythme (CALCULÉ réel)** : histogramme ventes/heure (occurred_at réel Europe/Paris, pic surligné), débit moyen par heure active, **services truck = (emplacement × date)** avec amplitude min→max étiquetée « (observée) » — pas les horaires d'ouverture ; ventes/jour boutique. **Garde import codée** : `source_vente='import'` (heure fictive 12:00) exclu de tout calcul horaire, note d'exclusion affichée si > 0.
- ✅ **Coût matière consommé (CALCULÉ réel)** : primitive `coutMatiereLigneVente` de calculs.ts — LA MÊME que Finances (une fonction, deux lecteurs) ; **indicateur de couverture** (% du CA au coût connu + lignes sans coût) affiché même à 100 %.
- ✅ **Temps de production estimé (ESTIMÉ, tag obligatoire)** : `temps_prepa_min` des fiches (÷ rendement × qtés vendues ; poids au prorata de la fiche) — déclaratif chef ; revendus = 0 explicite ; fiche sans temps = « N lignes au temps non défini », jamais 0 silencieux ; affiché en heures de travail (pas en jours écoulés).
- ✅ Cycle de commande (fulfillment_event) conservé tel quel, re-scopé visuellement « précommandes uniquement ».
- 🟡 Mise en page volontairement fonctionnelle — le design final de l'écran viendra de CD sur cette base de données/fonctions.
- 🟡 MO et pertes : arbitrage à prendre (forfait €/portion des Finances vs temps × taux horaire) — coût et temps affichés SÉPARÉMENT, jamais composés en « marge complète » tant que l'arbitrage n'est pas rendu.
- CTA : filtres ✅ (lecture seule).

## stock — Stocks & traçabilité (MOCKUP §3.10 + handoff « Profil & Stock » §02, refondu 12/07/2026)
- ✅ Tabs segmentés « Niveaux | À racheter » (compteur rouge sur l'onglet), 4 KPI foncés, table composants (pastille cat, chevron+nom+cat/seuil/lots, boutons Ajuster/Seuil), expand → encart FEFO + mini-table lots, colonne « Lots en cours · DLC » triée.
- ✅ **B8 (12/07/2026)** — trois nombres par composant : **Physique** (Σ mouvements signés) · **Réservé** (commandes ouvertes dépliées dynamiquement — aucun mouvement, pas de dé-réservation à gérer) · **Disponible** = physique − réservé, qui porte le **statut** ET la liste d'achat. Sorties réelles « Consommation vente » écrites à la REMISE : vente instantanée dans `createVente` (même chaîne, rollback commun), précommande au passage à « remis » dans `avancerFulfillment` (garde de concurrence vérifiée — une seule écriture). Dépliage = source unique `src/lib/stock.ts` (bowl : grammes FIGÉS `vlc.quantite_g` à l'encaissement, fallback fiche pour l'historique ; unité : fiche/rendement ; poids : prorata fiche ; revendu : rien).
- ✅ **Seuil effectif (12/07/2026)** = `seuil_stock.seuil_bas` (override) ?? **défaut par catégorie** (2,4/4/3/2 kg · 24/40/30/20 pièces — forfaits révisables, chantier règles) ; « Revenir au défaut » supprime l'override. **Arbitrage navette CC : le seuil RESTE en table `seuil_stock`** (pas un attribut du composant comme suggéré par le handoff dédié §2.1).
- ✅ Onglet **À racheter** : lignes = disponible < seuil effectif, tri rupture → sous-seuil → montant ; **Manque = CALCULÉ** (seuil − dispo), **Quantité suggérée = ESTIMÉE** (cible forfaitaire 2×seuil, bandeau d'honnêteté — la cible sera remplacée par la conso prévisionnelle sans changer l'UI), override manuel prioritaire (« · ajusté »), fournisseur texte libre (PAS de référentiel), coût = qté × €/kg, KPIs À commander / Déjà commandé, case « commandé » (grise + bascule le montant), état vide « Tout est au-dessus du seuil ». **PERSISTÉE** (arbitrage navette CC : table `reappro_ligne`, une ligne vivante par composant) — la feature s'arrête au flag : l'entrée en stock reste Ajuster (bandeau).
- ✅ Cas signalés (pas inventés) : composant à la pièce sans `poids_piece_g` → badge « poids/pièce à renseigner », réservé « ? », AUCUNE sortie (champ éditable dans le drawer Seuil : œuf, citron, blinis, pains) ; produit au poids sans grammages de fiche → aucune sortie ; revendus → jamais déduits ; pas de rétroactivité (l'historique démo n'est pas re-déduit ; le réservé, dynamique, s'applique immédiatement aux 6 commandes ouvertes de démo).
- 🟡 Alerte gaspillage et barres de stock de la maquette omises (gaspi = démo ; barres sans capacité max définie). Alertes automatiques (notifications) = chantier règles (B2). KPI « Prochaine DLC » sans règle de « DLC proche » figée.
- CTA : réception ✅ · ajustement ✅ · seuil + poids/pièce + retour défaut ✅ · qté retenue / fournisseur / commandé ✅ (tous testés en base, E2E dédiés).

## haccp — HACCP & traçabilité (MOCKUP §3.9)
- ✅ 3 KPI foncés, drawer « Enregistrer un relevé » (type température/nettoyage/contrôle, cible, valeur °C display 24px, conformité, note), relevés du jour + historique 30 j (timeline pastille/heure/badge/« Action : » si non-conformité), opérateur tracé (profil connecté).
- ✅ Non-conformité → action corrective OBLIGATOIRE (validée serveur). Champs contrôlés (le reset de formulaire React 19 effaçait la saisie sur erreur).
- 🟡 « Plan de nettoyage » à cases et enceintes pré-listées omis : exige un référentiel de zones/enceintes/contrôles dus — à cadrer ; les relevés nettoyage passent par le drawer.
- CTA : enregistrer relevé ✅ (testé, conformité + opérateur en base).

## prod — Production (MOCKUP §3.7)
- ✅ « Prévision — demain » (carte foncée) : moyenne 7 j des ventes remises × buffer +10 %, badge « Aide à la décision », prisme ChanFilter ; plan du jour ; « Enregistrer un lot » RÉEL (lot + entrée stock) ; lots du jour.
- 🔵 **CHOIX MÉTIER (12/07/2026)** : le plan est **PAR PRODUIT FABRIQUÉ** (fiche liée), plus par composant — la maquette montrait la charge par composant, mais on ne produit pas des ingrédients. Source unique `lib/plan.ts` (prod, orders, dashboard). Les matières premières deviennent le bloc « **Besoins matières premières (dérivés du plan)** » (plan × fiches, grammes, badge Dérivé) — jamais libellé « à produire ». Bowls en composition libre : hors plan produits, « + N bowls libres » avec composants réels en portions (le dépliage ne porte pas de grammages). Produits revendus tels quels : jamais dans le plan. Produits au poids : kg convertis en portions via la fiche (Σ grammes/rendement).
- 🟡 Plan du jour SANS barre de progression : le « fait » venait des lots (niveau matière) — suspendu à l'arbitrage lots ↔ produits finis (options A/B/C présentées le 12/07/2026, en attente). La carte lots est relabellisée « Préparations de matières ».
- 🟡 Prisme = filtre direct canal/emplacement des ventes sources (la maquette multipliait des parts) — plus honnête à faible historique.
- 🟡 « Signal communauté » (votes) omis — référentiel social, point ouvert #4. T° à cœur/temps/chefs du drawer maquette omis (mesure MO à cadrer).
- 🟡 Règle +10 % INDICATIVE affichée comme telle — point ouvert #2 (y compris la politique d'arrondi du suggéré, à valider).
- CTA : enregistrer lot ✅ (niveau matière, testé : lot + mouvement en base).

## notifs — Notifications (MOCKUP §3.18)
- ✅ 3 KPI foncés, tabs segmentés pill (Centre / Préférences), chips catégorie avec compteurs, liste (icône sévérité, titre, badge, catégorie mono, description, « Aller à → », « Marquer comme lu », heure, point rouge non-lu), « Tout marquer comme lu », état vide « Aucune notification » (badge nav disparaît à 0).
- ✅ Préférences par type × (in-app / e-mail) : toggles switch custom persistés PAR PROFIL.
- 🟡 RIEN n'écrit encore dans notification (règles = point ouvert #2) ; seuils de déclenchement + heures calmes affichés comme point ouvert (non simulés).
- 🟡 « Résumé quotidien » omis (dépend de l'envoi d'e-mails, non branché).
- CTA : lu ✅ · tout lu ✅ · toggles ✅ (testés en base).

## import — Import caisse (MOCKUP §3.4, Contrat §05, POINT OUVERT #1)
- ✅ Encart d'avertissement ambre « format à caler sur un vrai export », wizard 3 étapes : dépôt (fichier OU collage, badge n° foncé, « Charger l'exemple »/« Vider », « Détecté · séparateur »), mapping colonne→champ modèle (selects, auto-suggestion par nom, PERSISTÉ dans import_mapping), prévisualisation (compteurs importables/à corriger, table aux colonnes maquette, statut pastille+motif), note occurred_at + bouton « Valider & créer N ventes ».
- ✅ Lignes inconnues EXCLUES (jamais créées à l'aveugle) ; déductions (montant depuis le prix catalogue, qté 1) marquées « déduit » ; règlements mappés ; ventes source='import' → badge Historique ; import_batch tracé ; occurred_at = jour d'exploitation 12:00 Europe/Paris.
- 🟡 Le mode vient du PRODUIT rapproché (autoritaire) plutôt que deviné des colonnes — plus sûr ; le badge « à confirmer » couvre les valeurs déduites.
- CTA : valider l'import ✅ (testé : 3 ventes J-1 en base, 1 exclue).

## commu — Réseaux sociaux (MOCKUP §3.16, POINT OUVERT #4 : squelette)
- ✅ B1 « Annoncer l'emplacement du jour » (carte foncée) : chips emplacement (badge AUJ.), chips réseau, textarea + compteur 500, aperçu de post (header réseau, bandeau dégradé, texte), « Publier » rouge / « Programmer » (datetime) — écritures RÉELLES dans social_post ; journal des annonces (statut Publié/Programmé).
- 🟡 Attribution post → plat → ventes, stats réseaux/audience/meilleures publications : démo maquette, affichées comme point ouvert #4 (l'origine déclarative de la Saisie est prête côté ventes).
- 🟡 Plats tagués et « Régénérer » omis (génération de texte + lien catalogue à cadrer marketing). Publication automatique vers les plateformes non branchée (journal seulement).
- 🟡 Icônes de réseaux génériques (lucide 1.x n'a plus les logos de marques).
- CTA : publier ✅ · programmer ✅ (testés en base). · commu

## profil — Mon profil (handoff « Profil & Stock » §01 + maquette autonome, livré 12/07/2026)
- ✅ Bloc « Mon compte » : avatar initiale 72px, nom éditable (→ `profil.nom`, répercuté sidebar), e-mail du compte (lecture seule + badge rôle), **changement de mot de passe réel** (`auth.updateUser`, double saisie, 8 car. min), déconnexion.
- ✅ « Mes préférences de travail » (bandeau « n'affectent que votre session ») : **canal par défaut** de la Saisie (Demander/Truck/Boutique/Traiteur) et **écran d'accueil** à la connexion — persistés immédiatement dans `user_preference` (**RLS owner-only** `auth.uid() = profil_id` : config PERSO, par opposition à la config partagée type seuils). Une source, plusieurs lecteurs : `sale` présélectionne le canal, `signIn` redirige selon l'accueil.
- ✅ Avatar du pied de sidebar cliquable → /profil ; liens croisés « Gérer mes alertes » (/notifs) et « L'équipe et les accès » (/users) — aucun doublon.
- 🟡 Thème clair/sombre = placeholder désactivé « Optionnel · à confirmer » (consigne : ne pas implémenter sans demande).
- 🟡 Changement d'e-mail non proposé en v1 (flux de confirmation auth séparé — hors périmètre) ; mot de passe changé en direct (l'utilisateur est authentifié) plutôt que par lien e-mail comme dans la maquette.
- CTA : nom ✅ · mot de passe ✅ (cycle complet changé/restauré en E2E) · préférences ✅ · déconnexion ✅.

## Arbitrages navette CC (12/07/2026)
- **A3 vérifié** : l'univers stock = composants UNIQUEMENT. Code (l'écran Stocks ne référence jamais `produit`), base (FK `composant(id)` sur lot / mouvement_stock / seuil_stock / reappro_ligne), transverse (aucun recalcul de statut stock hors Stocks ; le plan de production exclut les revendus). Les produits finis n'apparaissent jamais en niveaux/alertes/liste d'achat.
- **B1-B7 confirmés tels quels** (aucun code changé) : bowl virtuel §7.5 ✅ · CA à l'encaissement ✅ (tranche le point transverse n°1 ci-dessous) · import caisse provisoire en l'état ✅ · moteurs de règles = chantier séparé (rien de figé) ✅ · rôles/invitations en l'état ✅ · social plus tard ✅ · **lots ↔ produits finis : GEL MAINTENU** (question aux chefs).

## Points d'attention transverses signalés
1. **CA d'une précommande** — **TRANCHÉ (navette CC, 12/07/2026) : occurred_at = encaissement, confirmé.** À la remise, la vente entre dans v_vente_remise datée par son occurred_at (jour d'encaissement), pas par le jour de remise. Une commande traiteur saisie mardi et livrée vendredi apparaît, une fois remise, dans l'historique de mardi.
2. **Rafale d'encaissements** : pas de revalidatePath dans createVente + saisie gelée pendant l'écriture (le re-render de la route courante avalait les clics suivants — diagnostiqué en E2E réel).
3. `supabase gen types` non utilisé (types à la main, contrainte postgrest-js `type` vs `interface`) — à régénérer proprement quand l'outillage le permettra.
