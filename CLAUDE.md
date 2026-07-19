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
- 0019 `site_lecteur` APPLIQUEE le 2026-07-18, bascule du site TERMINEE le meme jour (JWT en service, echeance 2036-07-18 ; service_role sortie de `site/.env.local` ; preuve zero fuite + E2E verts). SITE EN PRODUCTION sur **https://aleonmange.app** depuis le 2026-07-19 (www → apex en 308 ; Atelier sur **https://atelier.aleonmange.app**, Supabase Auth basculee avec transition). Verifie en prod sur le domaine definitif : 13 routes/icones en 200, donnees reelles, ISR, zero fuite bundle, TLS wildcard OK. Etat live, rollback et pieges Vercel : `docs/site/ARCHITECTURE.md` section « Deploiement (etat live) ». Prochaine etape : VAGUE 2 (ecritures — precommandes, devis, lettre d'info) sur branche `site-vague-2`, REGLE : merge `--no-ff` vers main (piege Ignored Build Step / HEAD^) ; inclut le STOP Vague 2 des migrations reportees (0024 creneau_retrait, demande_devis, newsletter_abonne, enums web). Avant deploiement : favicon a choisir.
