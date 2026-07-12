# Jeu de démonstration — Atelier ALM

**Artefact de démo, hors chemin de lancement.** Ce dossier n'est JAMAIS référencé
par les migrations, le seed ou l'app : le transactionnel de production naît vide
(brief §6). La démo s'injecte volontairement et se purge intégralement.

Source : `handoff/ALM_Carte_Demo.json` (liste FERMÉE — 100 produits, 63 composants
dont « sel » jamais utilisé par une recette).

## Injection

```bash
OWNER_EMAIL=... OWNER_PWD=... node scripts/demo/injecter.mjs
```

- Écrit via l'API REST **authentifiée owner** (RLS active), avec les mêmes
  invariants que les server actions : montants recalculés, `montant_total` = Σ
  lignes, `fulfillment` dérivé du `mode_vente`, bowls dépliés (signature =
  `recette_id`, composition libre = NULL), transitions dans `fulfillment_event`.
- Loggue **T0** (horloge de la base, via une ligne-sonde insérée puis retirée)
  en tête de sortie + dans `derniere-injection.txt` : c'est la borne de purge.
- `created_at` = instant d'exécution partout ; `occurred_at`/`due_at`/`dlc`
  sont étalés dans le passé/futur MÉTIER (Europe/Paris) — jamais confondus.
- Garde anti-double-injection : refuse si des produits de la carte existent
  déjà (`--force` pour outrepasser — à vos risques).
- Termine par une passe de vérification (100 produits / 63 composants / 72
  fiches liées / zéro doublon / CA `v_vente_remise` = somme injectée /
  précommandes dans `v_commande_ouverte` / coût matière calculable).

## Purge (coupure temporelle)

```bash
OWNER_EMAIL=... OWNER_PWD=... node scripts/demo/purger.mjs "<T0>"
```

Supprime tout ce qui a `created_at ≥ T0`, dans l'ordre des dépendances,
et affiche le compte par table. Ne touche ni les 3 emplacements réels, ni le
compte owner, ni les enums, ni aucune ligne antérieure à T0.

⚠ **Tout ce qui est créé après T0 part aussi** : n'entrez pas de vraies données
entre l'injection et la purge. Si les paramètres de rentabilité ont été
modifiés pendant la démo, ils sont retirés aussi (`updated_at ≥ T0`).
