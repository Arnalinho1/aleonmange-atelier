# Site public — Conformite Vague 2 (les trois ecritures) · 2026-07-19

> Legende : ✅ present et verifie · 🟡 volontairement differe (raison) · 🔴 oubli.
> Etat : branche `site-vague-2`, migrations 0024-0030 APPLIQUEES en prod, code
> committe et verifie E2E. NON MERGEE — go-live gate Vague 3 (confirmation chef).

## Ecritures (le point central : le site alimente le pipeline EXISTANT)

| Parcours | Route | Etat | Detail verifie en base |
|---|---|---|---|
| Precommande boutique (C&C) | `/api/commande` (canal boutique) | ✅ | `vente` web / `web_a_confirmer` / `statut_paiement='regle'` / `precommande` ; total RECALCULE serveur (3,80 = 1,90x2) ; `due_at` = creneau ; aucun reglement, aucun mouvement_stock |
| Precommande truck | `/api/commande` (canal truck) | ✅ | idem + `emplacement_id` renseigne ; cutoff veille 23h59 ; contextualise par `?emplacement=<code>` |
| Demande de devis | `/api/devis` | ✅ | `demande_devis` (contact inline, `statut='nouveau'`, `client_id` null) ; AUCUN client cree pour le prospect |
| Newsletter double opt-in | `/api/newsletter` + `/newsletter/confirmer` | ✅ | inscription -> `en_attente` (consentement NULL) ; confirmation par token -> `confirme` + `consentement_le` date (RGPD) ; idempotent, pas de doublon |

## Contraintes de securite (toutes verifiees E2E)

- ✅ Mecanisme d'ecriture : role `site_ecrivain` (0030), AUCUN droit table, EXECUTE sur 4 RPC SECURITY DEFINER seulement. La `service_role` n'est PAS revenue dans le site.
- ✅ Prix client IGNORE : payload avec `prix/montant` falsifies (0,01) -> total serveur 1,90. Le prix n'existe pas dans le contrat (produit_id + qte|poids_g).
- ✅ create-or-match : email prioritaire (normalise lower/trim), telephone secours (E.164) ; les DEUX cas testes (creation + reutilisation par email ET par telephone), jamais de doublon.
- ✅ B2C jamais `'du'` : toutes les ventes web nees `'regle'`.
- ✅ Statut client TOUJOURS « En attente de confirmation par l'atelier », jamais « validee ».
- ✅ Agregats Atelier INTACTS : les ventes `web_a_confirmer` sont ABSENTES de `v_commande_ouverte` (donc RESERVE B8, charge prod, KPI orders, badge sidebar), de `v_vente_remise` (CA facture) et de `v_encaissement` (CA encaisse).
- ✅ `anon` reste sans droit ; validation zod stricte ; rate limiting basique par IP.
- ✅ Preuve zero fuite ETENDUE (bundle client) : marqueurs `service_role`/`site_lecteur`/`site_ecrivain` ET valeurs des 4 secrets (2 JWT, cle anon, `RESEND_API_KEY`) = 0.

## Emails (Resend, best-effort)

- ✅ Best-effort strict : l'ecriture prime ; email tente apres, jamais bloquant (E2E : 6 emails envoyes en mode dev, zero erreur, zero route affectee).
- 🟡 Mode dev par defaut : expediteur de test Resend vers `RESEND_DEST_TEST` (domaine `aleonmange.app` non encore verifie chez Resend). Expediteur cible `contact@aleonmange.app` (constante configurable) + `Reply-To: contact@aleonmange.com` temporaire. Verification DNS `aleonmange.app` = etape a part (enregistrements a fournir).

## Transverse

- ✅ E2E : 20/20 preuves en base (HTTP) + 6 rendus visuels (390/1440) sans cadratin/NaN + 1 soumission REELLE via l'UI jusqu'a l'ecran de confirmation.
- ✅ Build + typecheck + lint verts des DEUX apps (Atelier : types enum + OrdersQueue exhaustif ; site : plomberie + parcours).
- ✅ Primitives de formulaire creees (aucune n'existait) ; `Stepper` du design system enfin utilise ; articles au poids commandables (250/500/1000 g).
- 🟡 Editeur `creneau_retrait` cote Reglages Atelier : NON inclus cette vague (config seedee et fonctionnelle ; edition chef = petit ajout Reglages, a cadrer). Signale.
- 🟡 Depliage bowl (`vente_ligne_composant`) : DIFFERE a la confirmation Vague 3 (une commande non confirmee ne reserve aucune matiere). `vente_ligne.recette_id` pose pour les bowls signature.
- 🟡 Confirmation chef (« Commandes web a confirmer », depliage, reglement au retrait) : Vague 3 (par decision : go-live gate).

## Donnees d'essai E2E : NETTOYEES le 2026-07-19 (feu vert Arnaud)

Les 6 ventes web + 3 clients + 1 devis + 1 newsletter d'essai (patterns `%exemple-alm%`) ont ete supprimees (ordre FK : ventes -> clients -> devis -> newsletter). Comptages verifies a 0 : zero vente web en base, zero artefact d'essai. La base est propre.
