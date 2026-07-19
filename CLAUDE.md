@AGENTS.md

# Carte des documents du repo

- `docs/PLAN.md`, `docs/HANDOFF_CC_LOCAL.md`, `docs/AUDIT_CONFORMITE.md` : l'ATELIER (plan, reprise, conformite maquette-code ecran par ecran).
- `handoff/` : handoff maquette Atelier (reference, jamais edite).
- `docs/handoff-site/` : handoff du SITE PUBLIC (relais, INTEGRATION.md V2, maquettes desktop/mobile autonomes, plan d'integration — jamais edites).
- `docs/site/ARCHITECTURE.md` : architecture du site public (monorepo, acces donnees service_role, plan de migration referentiel, risques Vagues 2-3).
- `docs/site/CONFORMITE_VAGUE_1.md` : conformite maquette-code du site, Vague 1.
- `site/` : app Next.js du site public (port 3002, README env : `site/.env.local.example`).

# Etat du chantier site public (a tenir a jour a chaque fin de session)

- Vague en cours : Vague 1 (vitrine en lecture) TERMINEE et VERIFIEE avec les vraies lectures Supabase le 2026-07-18 (resultats : `docs/site/CONFORMITE_VAGUE_1.md`).
- Branche : `site-vague-1` (posee sur main, RIEN de pushe). Dernier commit : correctif menu mobile (piege backdrop-filter) + verification donnees reelles, cf. `docs/site/ARCHITECTURE.md`.
- Plan de migration referentiel APPROUVE le 2026-07-18 (ordre 0019 → 0020 → 0022 → 0021 → 0023, un feu vert PAR migration ; 0024 reportee au STOP Vague 2) : `docs/site/ARCHITECTURE.md`.
- VAGUE 1 (vitrine lecture) EN PRODUCTION sur **https://aleonmange.app** depuis le 2026-07-19 (www → apex 308 ; Atelier sur **https://atelier.aleonmange.app**) ; role `site_lecteur` (JWT echeance 2036-07-18). Etat live, rollback, pieges Vercel : `docs/site/ARCHITECTURE.md`.
- VAGUE 2 (les trois ecritures) TERMINEE et VERIFIEE le 2026-07-19 sur branche **`site-vague-2`** (NON mergee — go-live gate Vague 3). Migrations 0024-0030 APPLIQUEES en prod (creneau_retrait, demande_devis, newsletter_abonne, `source_vente+='web'`, `fulfillment+='web_a_confirmer'`, fix `v_commande_ouverte`, role `site_ecrivain`+4 RPC). Ecritures via `site_ecrivain` (JWT echeance 2036-07-19 ; AUCUN droit table, EXECUTE sur RPC only) ; emails Resend best-effort (mode dev). E2E : 20/20 preuves en base + visuel 390/1440 + soumission UI reelle ; zero fuite etendue (incl. Resend). Details : `docs/site/CONFORMITE_VAGUE_2.md`, mecanisme : `docs/site/ARCHITECTURE.md` section Vague 2.
- EN ATTENTE : nettoyage des donnees d'essai E2E (6 ventes web + 3 clients + 1 devis + 1 newsletter, pattern `%exemple-alm%`, a valider Arnaud) ; puis MERGE `--no-ff` vers main + go-live = Vague 3, feu vert explicite. Env a poser dans Vercel projet site au merge : `SUPABASE_SITE_ECRIVAIN_JWT`, `RESEND_API_KEY`, `RESEND_DEST_TEST`.
- PROCHAINE VAGUE (3) : confirmation chef (ecran « Commandes web a confirmer », depliage bowl a la confirmation, reglement au retrait), verification domaine `aleonmange.app` chez Resend (DNS zone Vercel), decision `productivite.ts` web/import. Aussi en attente : favicon variante 16px (polish), editeur `creneau_retrait` en Reglages.
