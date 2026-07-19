-- Atelier ALM — 0037 : fidelite (Vague 4, Etage 2). Compteur DERIVE des retraits, JAMAIS
-- stocke. Demarrage a l'opt-in. ADDITIF (colonnes, config, rachats, vue). Aucun objet modifie.

-- 1. Opt-in fidelite sur le client (date = point de depart du compteur).
alter table public.client
  add column if not exists fidelite_opt_in boolean not null default false,
  add column if not exists fidelite_opt_in_le timestamptz;
comment on column public.client.fidelite_opt_in is 'Adhesion au programme fidelite (opt-in RGPD explicite).';
comment on column public.client.fidelite_opt_in_le is 'Date de l''opt-in : les passages comptent a partir de cette date.';

-- 2. Parametres fidelite (singleton, editables en Reglages). Seuil + recompense configurables.
create table if not exists public.parametre_fidelite (
  id boolean primary key default true check (id),
  seuil int not null default 10 check (seuil > 0),
  recompense text not null default '1 plat offert',
  actif boolean not null default true,
  updated_le timestamptz not null default now()
);
insert into public.parametre_fidelite (id) values (true) on conflict (id) do nothing;
alter table public.parametre_fidelite enable row level security;
create policy "fidelite config lecture"      on public.parametre_fidelite for select to authenticated using (true);
create policy "equipe gere fidelite config"  on public.parametre_fidelite for all    to authenticated using (public.est_chef()) with check (public.est_chef());
create policy "site lit fidelite config"     on public.parametre_fidelite for select to site_lecteur using (true);
grant select on public.parametre_fidelite to authenticated, site_lecteur;
grant insert, update, delete on public.parametre_fidelite to authenticated;

-- 3. Rachats de recompense (trace ; le compteur reste derive : dispo = floor(passages/seuil) - rachats).
create table if not exists public.fidelite_redemption (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.client(id) on delete cascade,
  cree_le timestamptz not null default now(),
  operateur_id uuid references public.profil(id)
);
alter table public.fidelite_redemption enable row level security;
create policy "client lit ses rachats" on public.fidelite_redemption for select to authenticated using (client_id = public.mon_client_id());
create policy "equipe gere rachats"    on public.fidelite_redemption for all    to authenticated using (public.est_chef()) with check (public.est_chef());
grant select on public.fidelite_redemption to authenticated;
grant insert, update, delete on public.fidelite_redemption to authenticated;

-- 4. Compteur DERIVE (vue security_invoker : RLS scope au client courant ; tout pour l'equipe).
--    Passages = retraits (fulfillment='remis') boutique+truck depuis l'opt-in. Web non confirmee
--    exclue d'office (fulfillment). Traiteur exclu (canal).
create or replace view public.v_fidelite_client with (security_invoker = on) as
select
  c.id as client_id,
  (select count(*) from public.vente v
     where v.client_id = c.id and v.fulfillment = 'remis'
       and v.canal in ('boutique','truck') and v.occurred_at >= c.fidelite_opt_in_le) as passages,
  (select count(*) from public.fidelite_redemption r where r.client_id = c.id) as recompenses_utilisees
from public.client c
where c.fidelite_opt_in;
grant select on public.v_fidelite_client to authenticated;

-- Rollback :
--   drop view public.v_fidelite_client;
--   drop table public.fidelite_redemption;
--   drop table public.parametre_fidelite;
--   alter table public.client drop column fidelite_opt_in, drop column fidelite_opt_in_le;
