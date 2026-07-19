-- Atelier ALM — 0020 : produit, contenu site (description + visibilité).
-- Plan référentiel approuvé le 2026-07-18 (docs/site/ARCHITECTURE.md).
--
-- Colonnes ADDITIVES : aucune rupture des écrans Atelier (Catalogue et
-- lecteurs font select("*")). visible_site DEFAULT TRUE : préserve le rendu
-- actuel du site (tout produit actif reste visible), les chefs masqueront au
-- cas par cas depuis le Catalogue (UI à venir). Le site lira
-- actif = true AND visible_site = true. Aucun index (100 lignes, ISR 5 min).
--
-- Grants/policy site_lecteur : DÉJÀ couverts par la 0019 — le GRANT SELECT
-- est de niveau TABLE (toutes colonnes, y compris futures) et la policy
-- « site lit produit » est par ligne, indépendante des colonnes. Vérifié
-- au dry-run : lecture des nouvelles colonnes OK sous le rôle.

alter table public.produit
  add column description  text,
  add column visible_site boolean not null default true;

-- Rollback :
--   alter table public.produit
--     drop column description,
--     drop column visible_site;
