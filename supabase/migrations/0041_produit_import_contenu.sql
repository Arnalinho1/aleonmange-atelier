-- Atelier ALM - 0041 : colonnes additives pour l'import du catalogue chefs.
--
-- Contexte : import du catalogue reel des chefs (JSON V2, docs/imports/) dans la
-- table produit, en brouillons invisibles (visible_site=false), a completer par les
-- chefs. ADDITIF, zero backfill : les 101 lignes demo recoivent tags/import_ref/
-- allergenes NULL et allergenes_verifies=false (default). RLS inchangee (les colonnes
-- heritent des policies produit) ; site_lecteur les lit via le GRANT DE TABLE (0019/
-- 0020/0033), aucun nouveau grant/policy requis.
--
-- Colonnes :
--   tags[]              : tags produits (importes du JSON, informatif).
--   import_ref          : cle stable = id du produit dans le JSON. Idempotence de
--                         l'import + tracabilite + detection de collision (la demo a
--                         import_ref NULL). Index UNIQUE PARTIEL (where not null).
--   allergenes[]        : allergenes SUGGERES par le JSON (auto-generes, NON verifies).
--   allergenes_verifies : false par defaut. REGLE PERMANENTE : le site public
--                         n'affiche JAMAIS les allergenes d'un produit dont
--                         allergenes_verifies=false (verification chef via l'Atelier).
--
-- Contrainte produit_visible_requiert_prix : grave l'invariant "pas de prix = pas
-- visible" (un produit visible a TOUJOURS prix_unitaire OU prix_kg). Un brouillon
-- boutique sans prix ne peut donc pas devenir visible tant que le chef n'a pas saisi
-- son prix. Les 101 demo visibles ont deja un prix (verifie au dry-run avant apply).

alter table public.produit
  add column tags text[],
  add column import_ref text,
  add column allergenes text[],
  add column allergenes_verifies boolean not null default false;

create unique index produit_import_ref_uniq on public.produit (import_ref) where import_ref is not null;

alter table public.produit
  add constraint produit_visible_requiert_prix
  check (not visible_site or prix_unitaire is not null or prix_kg is not null);

-- Rollback :
--   alter table public.produit drop constraint produit_visible_requiert_prix;
--   drop index if exists produit_import_ref_uniq;
--   alter table public.produit
--     drop column allergenes_verifies, drop column allergenes,
--     drop column import_ref, drop column tags;
