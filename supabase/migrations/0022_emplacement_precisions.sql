-- Atelier ALM — 0022 : emplacement, précisions truck (ville, lieu, horaire).
-- Plan référentiel approuvé le 2026-07-18 (docs/site/ARCHITECTURE.md) ;
-- exécutée AVANT la 0021 conformément à l'ordre approuvé 0019-0020-0022-0021-0023.
--
-- Colonnes ADDITIVES : aucune rupture des écrans Atelier (Réglages fait
-- select("*") ; le badge AUJ. et la Saisie restent sur jour_semaine, intact).
-- Côté site : ville et lieu enrichiront les cartes d'emplacement ;
-- horaire_service remplacera l'amplitude par défaut, qui devient un simple
-- fallback (« 11h30 à 14h ») quand la colonne est nulle. Saisie chef via
-- l'UI Réglages (EmplacementsManager) à venir.
--
-- Grants/policy site_lecteur : DÉJÀ couverts par la 0019 (GRANT SELECT de
-- niveau table + policy « site lit emplacement » par ligne), même mécanique
-- confirmée à la 0020. Aucun index (3 lignes).

alter table public.emplacement
  add column ville           text,
  add column lieu            text,
  add column horaire_service text;

-- Rollback :
--   alter table public.emplacement
--     drop column ville,
--     drop column lieu,
--     drop column horaire_service;
