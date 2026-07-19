-- Atelier ALM — 0036 : espace client (Vague 4, Etage 2) — lien compte<->client + acces
-- du client a SES SEULES donnees. ADDITIF : colonne nullable, policies PERMISSIVES (OR
-- avec les policies equipe existantes), nouvelle table. N'elargit RIEN pour l'equipe.

-- 1. Lien compte auth <-> client (socle client, jamais de table parallele).
alter table public.client
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;
comment on column public.client.auth_user_id is
  'Compte Supabase Auth rattache a ce client (espace client, Vague 4). NULL = pas de compte. UNIQUE.';

-- 2. Helper : le client_id de l'utilisateur courant. SECURITY DEFINER (evite la recursion
--    de policy et lit le socle client sous RLS neutralisee). Renvoie NULL si pas un client.
create or replace function public.mon_client_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select id from public.client where auth_user_id = auth.uid();
$$;
comment on function public.mon_client_id() is
  'client.id rattache au JWT courant (espace client). NULL si l''utilisateur n''est pas un client.';

-- 3. Policies CLIENT additives : le client lit SES donnees (OR avec les policies equipe).
create policy "client lit son client"     on public.client      for select to authenticated using (id = public.mon_client_id());
create policy "client lit ses ventes"      on public.vente       for select to authenticated using (client_id = public.mon_client_id());
create policy "client lit ses lignes"      on public.vente_ligne for select to authenticated using (vente_id in (select id from public.vente where client_id = public.mon_client_id()));
create policy "client lit ses reglements"  on public.reglement   for select to authenticated using (vente_id in (select id from public.vente where client_id = public.mon_client_id()));

-- 4. Preferences client (STOCKEES, non exploitees en V1 : aucune personnalisation active).
create table if not exists public.client_preference (
  client_id uuid primary key references public.client(id) on delete cascade,
  gouts text[] not null default '{}',
  emplacement_favori text,
  frequence text,
  updated_le timestamptz not null default now()
);
alter table public.client_preference enable row level security;
create policy "client gere ses preferences"  on public.client_preference for all    to authenticated using (client_id = public.mon_client_id()) with check (client_id = public.mon_client_id());
create policy "equipe lit client_preference" on public.client_preference for select to authenticated using (public.est_chef());
grant select, insert, update, delete on public.client_preference to authenticated;

-- Rollback :
--   drop table public.client_preference;
--   drop policy "client lit ses reglements" on public.reglement;
--   drop policy "client lit ses lignes" on public.vente_ligne;
--   drop policy "client lit ses ventes" on public.vente;
--   drop policy "client lit son client" on public.client;
--   drop function public.mon_client_id();
--   alter table public.client drop column auth_user_id;
