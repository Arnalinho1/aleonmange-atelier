# HANDOFF CD — Productivité élargie : design de l'écran

**De :** CC (implémentation) · **Pour :** CD (maquette) · **Date :** 12/07/2026
**État :** la phase données/calcul est EN PROD. Les 3 métriques sont réelles et branchées ; la présentation actuelle de l'écran est volontairement fonctionnelle (blocs posés sans intention). Ta mission : concevoir la vraie présentation. Tu ne recalcules rien — tout est exposé, tu branches.

---

## 00 · Pourquoi cet écran change

L'écran Productivité ne mesurait que le **cycle de commande** (transitions de fulfillment : à produire → en prod → prêt → remis). Or seules les précommandes traiteur/click-&-collect traversent ce cycle — le truck et la boutique-comptoir naissent « remis » : l'écran était **vide** pour eux. Ces canaux produisent pourtant : un bowl vendu au comptoir a consommé des composants payés et du temps de travail. L'élargissement mesure cette **charge de production du vendu**, sur tous les canaux.

---

## 01 · Ce qui existe déjà — données prêtes (tu branches, tu ne recalcules pas)

### Données fournies par la page serveur (`productivity/page.tsx`)

| Donnée | Contenu |
|---|---|
| `VenteProduction[]` | `{ id, canal, occurred_at (ISO réel d'encaissement), emplacement (libellé truck ou null), source_vente }` — ventes REMISES 90 j (même périmètre que le CA) |
| `LigneProduction[]` | `{ vente_id, canal, montant, cout (€ ou null = non couvert), temps (minutes ; 0 = revendu ; null = temps non défini) }` |
| `CycleCommande[]` | `{ vente_id, canal, portions, saisie, en_prod, pret, remis }` — l'existant, inchangé |

### Fonctions d'agrégat (`src/lib/productivite.ts` — pures, utilisables côté client)

| Fonction | Retourne |
|---|---|
| `rythmeVentes(ventes)` | `{ histogramme: [{heure, ventes}], pic: {heure, ventes} \| null, debitParHeureActive: number \| null, exclusImport: number }` — heures Europe/Paris, ventes importées EXCLUES et comptées |
| `servicesTruck(ventes)` | `[{ emplacement, date, ventes, debut, fin }]` — un service = (emplacement × date), amplitude = première → dernière vente **observée** |
| `ventesParJour(ventes)` | `[{ jour, ventes }]` — pour la boutique, jours Europe/Paris, récents d'abord |
| `chargeProduction(lignes)` | `{ ca, cout, couverture (0-1), lignesSansCout, minutes, lignesSansTemps }` |
| `fmtAmplitude(debut, fin)` | `"11:05 → 13:55"` |

### Primitives par ligne (`src/lib/calculs.ts` — déjà consommées par la page, pour ta compréhension)

- `coutMatiereLigneVente(...)` → coût matière réel d'une ligne : fiche prioritaire (dépliage B8, bowls libres inclus, poids au prorata), `cout_achat` du produit en secours pour les revendus, `null` = non couvert. **C'est LA MÊME fonction que Finances** — si tes maquettes montrent un coût, c'est ce chiffre, identique aux deux écrans.
- `tempsProductionLigne(...)` → minutes estimées : `temps_prepa_min` de la fiche ÷ rendement × quantités ; **0 explicite** pour un revendu (rien à produire) ; **null** pour une fiche sans temps.

### Champs en base (déjà éditables)

- `produit.cout_achat` (€/pièce ou €/kg) — drawer Catalogue.
- `recette.temps_prepa_min` (min, par batch, assemblage inclus) — drawer Recettes.
- Jeu de démo seedé : couverture coût 100 % sur les 3 canaux, 72/72 fiches avec temps.

---

## 02 · Ce que tu dois concevoir : un écran qui s'ADAPTE au canal

Le sélecteur de canal existe (Tous / Food truck / Boutique / Traiteur) + périodes 7/30/90 j. La nature de la bonne métrique dépend du canal :

- **Traiteur / C&C → métriques de CYCLE** (l'existant) : commandes remises, cycle complet (saisie → remise), temps de production (lancement → prêt), attente de retrait, table des cycles. C'est la mesure maîtresse de ce canal. Le coût matière et le temps estimé restent disponibles si tu veux les montrer en second plan.
- **Truck / Boutique → métriques de DÉBIT + CHARGE** : rythme horaire (histogramme + pic), débit moyen par heure active, services truck (emplacement × date, amplitude observée) / ventes par jour boutique, coût matière consommé (+ couverture), temps de production estimé. Le cycle n'existe pas pour eux — ne pas afficher de bloc cycle vide.
- **« Tous » → À CADRER PAR TOI.** Question ouverte : vue de synthèse comparant les canaux (ex. coût/temps côte à côte, cycle en encart traiteur) ? Ou défaut sur le canal dominant ? Propose — c'est le principal choix de design de ce chantier. Contrainte : ne jamais additionner des cycles (traiteur) avec du débit (comptoir) dans un même chiffre.

**Chiffres réels de la démo pour calibrer tes maquettes (90 j)** : 732 ventes remises, CA 12 144 € · coût consommé 3 286 € (couverture 100 %) · temps estimé 229 h 48 · pic global 12 h (179 ventes). Par canal — truck : 764,93 € / 47 h 00 / pic 12 h ; boutique : 1 935,36 € / 84 h 51 / pic 13 h ; traiteur : 585,85 € / 97 h 57 / pic 15 h. Cycle traiteur : 18 remises, cycle moyen ≈ 4 j. Un service truck type : 22-26 ventes, amplitude ≈ 11:30 → 13:45.

---

## 03 · Tags d'honnêteté — OBLIGATOIRES, non négociables

| Élément | Tag |
|---|---|
| Rythme, pic, débit, coût matière | **Calculé** (réel) |
| Temps de production | **Estimé** — déclaratif chef (temps de fiche), jamais présenté comme mesuré |
| Amplitude d'un service truck | **« (observée) »** — première → dernière vente, PAS les horaires d'ouverture |
| Couverture du coût | **Toujours visible**, même à 100 % (« couverture 100 % du CA · 0 ligne sans coût ») — si un produit perd son coût, l'utilisateur doit le voir, pas croire à un total complet faux |
| Ventes importées | note d'exclusion quand `exclusImport > 0` : elles portent une heure fictive (12:00) et sont exclues des calculs horaires |

Unités : le temps estimé s'affiche en **heures de travail** (« 84 h 51 »), jamais en jours — ce sont des minutes de travail cumulées, pas une durée écoulée.

---

## 04 · États vides à dessiner

- **Canal sans ventes remises sur la période** → état vide propre par bloc (« aucune moyenne sur zéro »), pas de 0 trompeur.
- **Fiche sans temps** → le total temps exclut ces lignes et affiche « **N lignes au temps non défini** » — jamais un 0 silencieux.
- **Ligne sans coût** → couverture < 100 % + compteur de lignes sans coût.
- **Aucune vente horodatée** (période 100 % import) → bloc rythme vide + note d'exclusion.
- **Aucun cycle** (pas de précommandes) → la section cycle s'efface sans bloquer le reste de l'écran (c'était le bug d'origine : l'écran entier disparaissait).

---

## 05 · À NE PAS faire

- **Pas de « marge complète »** (prix − matière − MO) sur cet écran : coût et temps restent affichés **séparément**. La marge vit dans Finances — un seul endroit.
- **Ne pas convertir le temps estimé en euros** (ce serait une MO implicite — voir §06).
- **Ne pas recréer Ventes & tendances** : Productivité = efficacité opérationnelle (rythme, charge, temps). Le CA affiché ici n'est qu'un dénominateur de couverture — pas d'analyse business (paniers, tendances, comparaisons de CA), elle existe ailleurs.

---

## 06 · À savoir, à NE PAS traiter : le chantier MO

Le temps estimé ouvre une main-d'œuvre **temps-based** (temps × taux horaire) qui, le jour venu, **remplacera** le forfait `mo_par_portion` des Finances — jamais les deux en même temps. L'arbitrage n'est pas rendu (le forfait actuel rend d'ailleurs la marge traiteur négative : problème connu, chantier séparé). Pour toi : n'intègre **aucun** élément qui figerait un modèle de MO dans le design (pas de €/h, pas de coût MO) ; prévois juste que le bloc temps pourra un jour porter une conversion en coût.

---

**En résumé :** trois métriques réelles t'attendent (rythme Calculé, coût Calculé + couverture, temps Estimé), un cycle existant à re-scoper visuellement sur le traiteur, un écran à faire pivoter selon le canal, et une vraie question de design sur la vue « Tous ». Les données sont en prod avec la démo — maquette sur du vrai. Quand un doute subsiste : signale, ne devine pas.
