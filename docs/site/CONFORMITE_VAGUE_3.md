# Conformité Vague 3 (confirmation chef + go-live) · 2026-07-19

> Légende : ✅ présent et vérifié · 🟡 vérifiable seulement côté chef (Atelier authentifié) · 🔴 oubli.
> État : branche `site-vague-2` (Vagues 2+3 = une unité de go-live), migrations 0031-0032 APPLIQUÉES, code committé. NON mergée — go-live sur feu vert explicite.

## Le cycle de vie (cœur de la vague)

| Comportement | État | Détail |
|---|---|---|
| Signalement (3 signaux) | ✅ | Notification (trigger 0032, `categorie='commande'`, `ecran='orders'`) + badge sidebar (`v_commande_ouverte` + web à confirmer non refusées) + section « Commandes web à confirmer » en tête de /orders |
| Confirmation (web_a_confirmer → a_produire) | ✅ | Entre alors dans `v_commande_ouverte` (RESERVE/charge/KPI) ; **dépliage bowl** : 6 `vente_ligne_composant` créés, conformes à la recette (`grammesBowlComposant` via source unique `composerLignesComposantBowl`) ; `fulfillment_event` journalisé |
| Refus (marqueur, Option B) | ✅ | `refuse_le` + `motif_refus` posés, `fulfillment` INCHANGÉ (reste `web_a_confirmer`) ; absent de `v_commande_ouverte`/`v_vente_remise`/`v_encaissement` ; badge l'exclut ; visible en « Refusées » |
| **RÈGLE PERMANENTE** | ✅ | Tout lecteur de `web_a_confirmer` filtre `refuse_le` : `IS NULL` = file à confirmer, `IS NOT NULL` = historique refusées (badge, section, historique) |
| Remise B2C (paiement réel) | ✅ | `avancerFulfillment(venteId, moyenReel?)` : au retrait, le chef choisit le moyen réel (le web naît `'especes'` placeholder) → `moyen_paiement` + `reglement` corrigés, `encaisse_le` posé |
| Productivité web = manuel | ✅ | Aucun changement : `productivite.ts` exclut seulement `'import'` ; une vente web confirmée puis remise compte en heures réelles. Refusée/en attente ne compte nulle part |

## Émails (Atelier, best-effort)

- ✅ Module PROPRE `src/lib/email.ts` (isolation : le module du site n'est pas importable ; `resend` ajouté aux deps racine). `emailCommandeConfirmee` (retrait + à régler au retrait) et `emailCommandeRefusee` (motif DOUX mappé, jamais le détail interne, invite à appeler le 06 75 36 23 26). Best-effort strict : ne bloque jamais l'action du chef.
- 🟡 Envoi réel vérifiable côté chef (l'action tourne en authenticated) : `RESEND_API_KEY` + `RESEND_DEST_TEST` à poser dans `.env.local` racine + Vercel projet Atelier (go-live). Mode dev par défaut. Module identique à celui du site (dont l'envoi est prouvé).

## Réglages

- ✅ Éditeur `creneau_retrait` (Réglages) : délai minimum, pas, horizon, plage restrictive optionnelle ; met à jour la ligne active (non-singleton), validation miroir de `plage_coherente`.

## Vérification E2E (2026-07-19, ce qui NE requiert pas l'auth chef)

- ✅ Site → commande web (boutique + truck avec Bowl saumon) créées (réel).
- ✅ **Trigger notification live** : chaque commande web crée 1 notification `categorie='commande'`, `ecran='orders'`, `severite='alerte'` (0 avant, prouvé), sans jamais bloquer la vente.
- ✅ Ligne bowl porte `recette_id`, AUCUN `vente_ligne_composant` avant confirmation (dépliage différé, prouvé).
- ✅ Confirmation (effets DB, identiques à `confirmerCommandeWeb`) : `a_produire`, entre dans `v_commande_ouverte`, 6 composants = recette, tous conformes (`quantite_g = quantité/rendement × qte`), event journalisé.
- ✅ Refus (marqueur) : `fulfillment` inchangé, absent de `v_commande_ouverte`/CA facturé/CA encaissé, badge l'exclut (`refuse_le IS NULL`), présent en historique refusées.
- ✅ Build + typecheck + lint verts des DEUX applications (Atelier : extraction, actions, UI ; site : inchangé).
- 🟡 Côté CHEF (Atelier authentifié, hors de portée autonome — saisie de mot de passe interdite) : clic réel Confirmer/Refuser via les server actions, écrans /orders et /settings à 390/1440, émails partant de l'action. À exercer par Arnaud au test go-live (étape 3) ou en checkpoint pré-go-live.

## Migrations Vague 3 (0031-0032, faible risque, mode auto avec discipline complète)

- 0031 `vente += refuse_le, motif_refus` (additif). Dry-run + rollback + vérif post-exec.
- 0032 trigger DÉFENSIF `notifier_commande_web` (after insert web → notification, exception avalée). Dry-run avec preuve (vente web d'essai → 1 notification, rollback) + vérif post-exec.

## Données d'essai (à nettoyer, validation Arnaud)

2 ventes web (dont 1 confirmée = **actuellement dans la file de production `a_produire`**) + 2 clients + 2 notifications + 6 composants (pattern `%exemple-alm%` / `categorie='commande'`). Cleanup prêt (ventes en cascade → clients → notifications).
