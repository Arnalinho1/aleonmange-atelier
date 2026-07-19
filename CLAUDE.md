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
- VAGUE 3 (confirmation chef) TERMINEE et VERIFIEE le 2026-07-19 sur branche **`site-vague-2`** (NON mergee — go-live sur feu vert). Migrations 0031-0032 APPLIQUEES (vente += refuse_le/motif_refus ; trigger notification web defensif). Confirmation (depliage bowl via source unique), refus (marqueur, REGLE PERMANENTE : lecteurs de web_a_confirmer filtrent refuse_le), remise B2C (moyen corrige), badge + section /orders + notification, editeur creneau_retrait, emails Atelier (module propre). E2E autonome vert (site + trigger + pipeline confirm/refus + depliage conforme recette) ; cote CHEF (Atelier authentifie) verifie par Arnaud au go-live. Details : `docs/site/CONFORMITE_VAGUE_3.md` + ARCHITECTURE.md section Vague 3.
- EN ATTENTE : nettoyage donnees d'essai V3 (2 ventes web dont 1 en `a_produire`, 2 clients, 2 notifs, 6 vlc, pattern `%exemple-alm%`/`categorie='commande'`, validation Arnaud). Puis GO-LIVE (Vagues 2+3 ensemble) : env Vercel projet SITE (`SUPABASE_SITE_ECRIVAIN_JWT`, `RESEND_API_KEY`, `RESEND_DEST_TEST`) + projet ATELIER (`RESEND_API_KEY`, `RESEND_DEST_TEST`, `RESEND_PROD`) ; racine `.env.local` (`RESEND_API_KEY`, `RESEND_DEST_TEST`) pour les emails chef ; MERGE `--no-ff` vers main (les deux projets rebuildent) ; test de bout en bout en prod avec Arnaud ; verification domaine `aleonmange.app` chez Resend (DNS zone Vercel, fallback mode dev).
- PROCHAINE VAGUE (4) : saisie contenu reel par les chefs, Atelier mobile, refonte RLS (espace client / fidelite). Aussi : favicon variante 16px (polish).
