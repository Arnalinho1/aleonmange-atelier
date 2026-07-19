-- Atelier ALM — 0024 : creneau_retrait (configuration du click & collect boutique).
-- Vague 2, plan « les trois ecritures ». Table de CONFIGURATION editable par les
-- chefs (jamais une constante en dur). Le site GENERE les creneaux proposables =
-- horaires d'ouverture (horaire_boutique, 0023) INTERSECTES [maintenant+delai,
-- maintenant+horizon], par pas ; plage_debut/fin NULL = plage = horaires complets.
-- Aucun blocage de stock (garde-fou V1 = confirmation chef). Additif : zero impact
-- sur le pipeline existant.
--
-- REGLE PERMANENTE (site_lecteur) : le site LIT cette config → grant select + policy
-- de lecture site_lecteur dans CETTE migration (sinon SELECT = 0 ligne malgre le grant).

create table public.creneau_retrait (
  id                uuid primary key default gen_random_uuid(),
  pas_minutes       smallint not null default 30,   -- granularite des creneaux
  delai_min_minutes smallint not null default 120,  -- delai mini commande -> retrait (2h)
  horizon_jours     smallint not null default 7,    -- reservation jusqu'a J+horizon
  plage_debut       time,                            -- restriction optionnelle (NULL = horaires d'ouverture)
  plage_fin         time,
  actif             boolean not null default true,
  created_at        timestamptz not null default now(),
  constraint plage_coherente check (
    (plage_debut is null) = (plage_fin is null)
    and (plage_fin is null or plage_fin > plage_debut)
  )
);

alter table public.creneau_retrait enable row level security;

create policy "equipe lit creneau_retrait" on public.creneau_retrait
  for select to authenticated using (true);
create policy "equipe ecrit creneau_retrait" on public.creneau_retrait
  for all to authenticated using (true) with check (true);

grant select on public.creneau_retrait to site_lecteur;
create policy "site lit creneau_retrait" on public.creneau_retrait
  for select to site_lecteur using (true);

-- Seed : valeurs de demarrage tranchees (delai 2h, pas 30min, horizon 7j, plage = ouverture).
insert into public.creneau_retrait (pas_minutes, delai_min_minutes, horizon_jours)
values (30, 120, 7);

-- Rollback :
--   drop table public.creneau_retrait;
