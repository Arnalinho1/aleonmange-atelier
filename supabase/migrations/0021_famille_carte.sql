-- Atelier ALM — 0021 : famille_carte (ordre et notes des familles de carte).
-- Plan référentiel approuvé le 2026-07-18 (docs/site/ARCHITECTURE.md) ;
-- exécutée APRÈS la 0022 conformément à l'ordre approuvé 0019-0020-0022-0021-0023.
--
-- Rapprochement par (canal, nom = produit.categorie), SANS FK : zéro backfill,
-- le pipeline de vente (produit.categorie) reste intact. Le site s'en sert
-- pour l'ORDRE d'affichage et la NOTE de famille ; une famille absente de la
-- table retombe sur le tri alphabétique actuel. Saisie chef via l'UI
-- Réglages à venir. L'unique (canal, nom) sert aussi d'index de jointure.
--
-- Première CRÉATION de table du plan : RLS activée + policies équipe
-- (convention 0002) + RÈGLE PERMANENTE 0019 — grant select ET policy
-- site_lecteur dans la MÊME migration (pas d'héritage possible, contrairement
-- aux colonnes additives des 0020/0022). Les droits de l'équipe (authenticated)
-- arrivent, eux, par les default privileges de la 0006.

create table public.famille_carte (
  id         uuid primary key default gen_random_uuid(),
  canal      canal not null,
  nom        text not null,
  note       text,                            -- ex. « servies chaudes sur place »
  ordre      smallint not null default 0,     -- ordre d'affichage dans le canal
  actif      boolean not null default true,   -- désactivation = soft delete
  created_at timestamptz not null default now(),
  unique (canal, nom)
);

alter table public.famille_carte enable row level security;

create policy "equipe lit famille_carte" on public.famille_carte
  for select to authenticated using (true);
create policy "equipe ecrit famille_carte" on public.famille_carte
  for all to authenticated using (true) with check (true);

grant select on public.famille_carte to site_lecteur;
create policy "site lit famille_carte" on public.famille_carte
  for select to site_lecteur using (true);

-- Rollback :
--   drop table public.famille_carte;
--   (drop table emporte policies, grants et contrainte unique)
