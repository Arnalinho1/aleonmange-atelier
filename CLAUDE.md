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
- 0019 `site_lecteur` APPLIQUEE le 2026-07-18, bascule du site TERMINEE le meme jour (JWT en service, echeance 2036-07-18 ; service_role sortie de `site/.env.local` ; preuve zero fuite + E2E verts). FINITION VAGUE 1 TERMINEE le 2026-07-18 : UI Atelier (Catalogue + Reglages) et consommation cote site livrees et verifiees (E2E sans anomalie, zero fuite) — details : `docs/site/CONFORMITE_VAGUE_1.md` section Finition. EN ATTENTE d'arbitrage : favicon (declinaisons generees, non commitees — lisibilite 16 px soumise a Arnaud) ; jeu d'essai UI Atelier + verification visuelle des nouveaux ecrans Atelier (extension Chrome requise ou verification par Arnaud). Prochaine etape : push + deploiement Vercel du site (session dediee — projet distinct, Root Directory `site/`, env SUPABASE_URL + SUPABASE_ANON_KEY + SUPABASE_SITE_LECTEUR_JWT, Ignored Build Step croise avec le projet Atelier ; merge main = prod UNIQUEMENT sur feu vert explicite). Avant deploiement : favicon a choisir.
