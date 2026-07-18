# Plan d'intégration — A Léon Mange · Atelier

**Cible :** réimplémentation Next.js + Supabase.
**Statut de la maquette :** artefact de démonstration. Aucune donnée (ventes, stocks, **catalogue**) ne part en base. On porte le **modèle** et le **comportement**, pas les exemples. Les 58 produits du catalogue sont plausibles mais **inventés** ; le contenu réel (catalogue, recettes, coûts, social) sera refait avec les chefs et le marketing.

---

## 0 · Pièces de la passation
1. **Contrat de données Vente** — champs figés (source de vérité des échanges).
2. **Guide d'intégration** (doc de référence, écran par écran) → export HTML fourni.
3. **Ce plan** — ordre de travail et dépendances.

---

## 1 · Principes non négociables
- **Sources uniques.** Ventes `fulfillment=remis` alimentent Historique **et** Finances — jamais deux calculs parallèles. Les insights ont **une** source ; le dashboard la relit.
- **États vides propres.** Chaque écran gère le « 0 » : pas de `NaN%`, pas de moyenne sur 0, pas d'alerte fantôme sans référentiel. Ratios masqués si dénominateur nul.
- **Honnêteté des chiffres.** Tag par métrique : `Calculé` (déduit du transactionnel), `Estimé` (heuristique/déclaratif), `Démo` (donnée d'exemple). Ne jamais présenter un `Estimé` comme un `Calculé`.
- **Le CA est un dénominateur, pas un objectif.** Aucun écran ne pilote à la maximisation du CA.
- **Signaler plutôt que deviner.** Tout point ouvert remonte (cf. §6) au lieu d'être tranché en base.

---

## 2 · Ordre d'implémentation (dépendances)
1. **Référentiel** : catalogue (composants + coût matière), emplacements truck, seuils stock, canaux. → socle de tout le reste.
2. **Transactionnel vente** : saisie + machine à états `fulfillment` (commandé → préparé → remis / annulé), horodatée. → alimente Historique, Finances, Productivité, Clients.
3. **Stocks** : mouvements déduits ventes/production + réceptions ; seuils config.
4. **Pilotage lecture** : Finances → Ventes & tendances → Productivité → Insight (dérive tout du transactionnel).
5. **Clients / Fidélité** (V2, cf. §4).
6. **Marketing / social** (référentiel à refaire avec le marketing).

---

## 3 · Écrans — notes d'implémentation
- **Dashboard** : lit la source insights, ne recalcule rien.
- **Finances** : distinguer **marge brute matière** et **marge nette** (noms distincts, jamais confondus). Coûts = coût matière composant du référentiel. Filtre période + canal (ChanFilter) = recalcul.
- **Ventes & tendances** : dérivation de l'historique agrégé, pas de source parallèle.
- **Productivité — RE-SCOPÉ V2** :
  - Vue **adaptative par canal** (Tous / Truck / Boutique / Traiteur).
  - En « **Tous** » : comparaison **côte à côte**, **jamais d'agrégat unique**. Chaque canal garde sa mesure native — **débit** pour truck/boutique, **cycle** de préparation pour traiteur.
  - Métriques : rythme horaire, **coût matière**, temps observés. Filtre par **emplacement** pour le truck.
  - **Supprimé** : coût de main-d'œuvre, indicateurs de gaspillage (non fiables sans pointeuse ni pesée).
- **Clients** : fiches rattachées aux ventes/commandes (le comptoir anonyme n'en crée pas).
- **Réseaux sociaux** : contenu référentiel à refaire avec le marketing (démo inventée).

---

## 4 · Fidélité & espace client (V2)
- **Modèle** : paliers **calculés** sur l'historique de ventes rattachées au client. Récompense **non-monétaire** en V1.
- **Préférences** : **déclaratives** (saisies par le client), jamais inférées.
- **Côté Atelier** : la fiche client affiche le palier, le geste « appliquer récompense » en vente, et les préférences déclaratives.
- **Côté site public** : espace client (opt-in fidélité + news), suivi de palier, préférences.
- **Paiement en ligne** : **V2 non-actif** — prévu mais désactivé ; ne pas câbler d'encaissement en ligne.

---

## 5 · Contrat de données (rappel)
Le contrat fige les **champs** échangés, pas le **schéma physique** Supabase (normalisation à ton appréciation). Respecter les noms/typages du contrat Vente pour l'import caisse.

---

## 6 · Points ouverts — à trancher (CC / Arnaud)
1. **Format d'export caisse boutique** → mapping d'import + déduction de mode + révision contrat v1.
2. **Schéma physique Supabase** (normalisation vente/lignes, stock, insights).
3. **Règles exactes des insights et seuils d'alerte** (stock, DLC) — valider avec Arnaud.
4. **Périmètre du référentiel social** et outillage de programmation — cadrage marketing.
5. **Modèle de rôles/permissions** par écran (qui saisit, qui pilote, qui encaisse).
6. **Libellés/prix réels** du catalogue et de la carte site (ex. « Bowl méditerranéen · 13,50 € » posé pour la démo).

---

**En résumé :** porter la **structure** et le **comportement**, pas le **contenu**. Catalogue et transactionnel partent **vides**. Chaque écran gère son état vide. Les sources uniques ne se dupliquent pas. En cas de doute — **signaler**.
