# Conformité Vague 3 (confirmation chef + go-live) · 2026-07-19

> Légende : ✅ présent et vérifié · 🔴 oubli.
> État : **MERGÉE dans `main` (`a48b497`), EN PRODUCTION depuis le 2026-07-19, testée de bout en bout EN PRODUCTION** (voir « Test go-live » plus bas). Migrations 0031-0032 appliquées.

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

## Test go-live EN PRODUCTION (2026-07-19, actions chef réelles)

Côté CHEF (Atelier authentifié), exécuté par Arnaud — la partie hors de portée autonome (saisie de mot de passe interdite) est ainsi PROUVÉE en production :

- ✅ **2 commandes truck réelles** passées sur aleonmange.app (11,50 € et 31,30 € = 2 bowls + 3 produits) → chacune crée sa `vente` `web_a_confirmer` (RPC) + sa notification (trigger) + pastille sidebar + section « à confirmer ».
- ✅ **CONFIRMATION chef** : `web_a_confirmer → a_produire`, **dépliage bowl exécuté en production** (les bowls dépliés en `vente_ligne_composant`, tous conformes à la recette), entrée dans `v_commande_ouverte`, `fulfillment_event` journalisé. Preuve réelle de `confirmerCommandeWeb` + `composerLignesComposantBowl` en prod.
- ✅ **REMISE chef** : moyen espèces, `reglement` créé = montant total, `encaisse_le` posé, `statut_paiement='regle'`, entrée en **CA facturé (`v_vente_remise`) ET encaissé (`v_encaissement`)**, sortie de `v_commande_ouverte`. Cycle complet web → CA vérifié en base.
- 🔵 Observé (à arbitrer Vague 4) : la 2ᵉ commande, saisie sous un nouvel email/nom mais AVEC un téléphone déjà utilisé, a été rattachée par le create-or-match au client existant (match téléphone secours) — le nouvel email est ignoré, la confirmation partirait à l'ancienne adresse. Conforme à la spec ; cf. CLAUDE.md backlog Vague 4 et ARCHITECTURE.md § create-or-match.

## Migrations Vague 3 (0031-0032, faible risque, mode auto avec discipline complète)

- 0031 `vente += refuse_le, motif_refus` (additif). Dry-run + rollback + vérif post-exec.
- 0032 trigger DÉFENSIF `notifier_commande_web` (after insert web → notification, exception avalée). Dry-run avec preuve (vente web d'essai → 1 notification, rollback) + vérif post-exec.

## Données d'essai — NETTOYÉES (2026-07-19)

Après validation d'Arnaud, les données de test go-live ont été SUPPRIMÉES : 2 ventes web (cascade → `vente_ligne` / `vente_ligne_composant` / `reglement` / `fulfillment_event`), 1 client de test (`essai.golive@exemple-alm.fr` ; `arnalinho+test1prod` n'a jamais existé — absorbé par le match téléphone), 2 notifications `categorie='commande'`. **Comptages vérifiés à ZÉRO** : 0 vente web, 0 client test (par email ET par téléphone), 0 notification `commande`, 0 orphelin (règlement / ligne sans vente parente). Base de production propre.
