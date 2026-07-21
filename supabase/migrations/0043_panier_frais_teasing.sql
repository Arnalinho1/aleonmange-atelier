-- Atelier ALM — 0043 : bloc « Panier frais » (teasing /boutique). ADDITIF, aucun objet modifie.
-- Trois briques : (1) table d'INTENTIONS autonome (email + vote facultatif + double opt-in
-- STRICT propre, JAMAIS l'extension de newsletter_abonne) ; (2) singleton parametre_site
-- (flag de pilotage OFF par defaut, lu par le site en SSR, togglable en Reglages) ; (3) deux
-- RPC SECURITY DEFINER (ecriture site via site_ecrivain only, comme 0030). Le site n'a AUCUN
-- droit table sur les intentions : il n'ecrit que par RPC, il n'y lit jamais.

-- ── 1. Intentions panier frais (double opt-in : token renvoye au SERVEUR, consentement au clic) ──
create table if not exists public.panier_frais_intention (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  taille          text check (taille  in ('petit','grand')),          -- vote facultatif
  rythme          text check (rythme  in ('hebdo','quinzaine')),       -- vote facultatif
  contenu         text check (contenu in ('legumes','fruits','mixte')),-- vote facultatif
  source          text not null default 'panier_frais',               -- segment (extensible a d'autres teasers)
  token           uuid not null default gen_random_uuid(),            -- lien de confirmation double opt-in
  statut          text not null default 'en_attente'
    check (statut in ('en_attente','confirme','desabonne')),
  consentement_le timestamptz,                                        -- NULL tant que non confirme (RGPD)
  demande_le      timestamptz not null default now(),
  confirme_le     timestamptz,
  created_at      timestamptz not null default now()
);
create unique index if not exists panier_frais_email_unique
  on public.panier_frais_intention (lower(email));                    -- idempotence sur l'email

alter table public.panier_frais_intention enable row level security;
create policy "equipe lit panier_frais_intention"  on public.panier_frais_intention for select to authenticated using (public.est_chef());
create policy "equipe gere panier_frais_intention" on public.panier_frais_intention for all    to authenticated using (public.est_chef()) with check (public.est_chef());
grant select on public.panier_frais_intention to authenticated;
grant insert, update, delete on public.panier_frais_intention to authenticated;

-- ── 2. Parametre site (singleton, editable en Reglages). Flag de pilotage du bloc teasing. ──
--    OFF par defaut : le bloc n'apparait sur /boutique QU'apres activation explicite par l'equipe.
create table if not exists public.parametre_site (
  id                         boolean primary key default true check (id),
  panier_frais_teasing_actif boolean not null default false,
  updated_le                 timestamptz not null default now()
);
insert into public.parametre_site (id) values (true) on conflict (id) do nothing;
alter table public.parametre_site enable row level security;
create policy "site config lecture"      on public.parametre_site for select to authenticated using (true);
create policy "equipe gere site config"  on public.parametre_site for all    to authenticated using (public.est_chef()) with check (public.est_chef());
create policy "site lit config publique" on public.parametre_site for select to site_lecteur using (true);
grant select on public.parametre_site to authenticated, site_lecteur;
grant insert, update, delete on public.parametre_site to authenticated;

-- ── 3. RPC : intention (upsert idempotent sur l'email, votes en coalesce) ────────
create or replace function public.web_intention_panier_frais(
  p_email   text,
  p_taille  text,
  p_rythme  text,
  p_contenu text
) returns table(token uuid, statut text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email   text;
  v_taille  text;
  v_rythme  text;
  v_contenu text;
  v_row     panier_frais_intention%rowtype;
begin
  v_email := nullif(lower(trim(p_email)), '');
  if v_email is null then raise exception 'email requis'; end if;

  -- Votes facultatifs : normalises, valides (garde en plus du CHECK), NULL si absent.
  v_taille  := nullif(trim(p_taille),  '');
  v_rythme  := nullif(trim(p_rythme),  '');
  v_contenu := nullif(trim(p_contenu), '');
  if v_taille  is not null and v_taille  not in ('petit','grand')           then raise exception 'taille invalide'; end if;
  if v_rythme  is not null and v_rythme  not in ('hebdo','quinzaine')        then raise exception 'rythme invalide'; end if;
  if v_contenu is not null and v_contenu not in ('legumes','fruits','mixte') then raise exception 'contenu invalide'; end if;

  select * into v_row from panier_frais_intention where lower(email) = v_email limit 1;
  if found then
    -- Idempotent : coalesce = ne JAMAIS ecraser un vote existant par un NULL (re-submit email seul).
    if v_row.statut = 'confirme' then
      update panier_frais_intention set
        taille  = coalesce(v_taille,  taille),
        rythme  = coalesce(v_rythme,  rythme),
        contenu = coalesce(v_contenu, contenu)
      where id = v_row.id;
      return query select null::uuid, 'confirme'::text; return;   -- deja confirme : PAS de nouvel email
    end if;
    -- en_attente ou desabonne : maj votes + re-armer et renvoyer le token pour un nouvel email.
    update panier_frais_intention set
      taille     = coalesce(v_taille,  taille),
      rythme     = coalesce(v_rythme,  rythme),
      contenu    = coalesce(v_contenu, contenu),
      statut     = 'en_attente',
      demande_le = now()
    where id = v_row.id;
    return query select v_row.token, 'en_attente'::text; return;
  end if;

  insert into panier_frais_intention (email, taille, rythme, contenu)
  values (v_email, v_taille, v_rythme, v_contenu)
  returning * into v_row;
  return query select v_row.token, 'en_attente'::text;
end;
$$;

-- ── 4. RPC : confirmation (consentement date au clic) ───────────────────────────
create or replace function public.web_confirmer_panier_frais(p_token uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_row panier_frais_intention%rowtype;
begin
  select * into v_row from panier_frais_intention where token = p_token limit 1;
  if not found then return 'inconnu'; end if;
  if v_row.statut = 'confirme' then return 'deja'; end if;
  update panier_frais_intention set statut = 'confirme', consentement_le = now(), confirme_le = now() where id = v_row.id;
  return 'confirme';
end;
$$;

-- ── 5. Grants : EXECUTE reserve a site_ecrivain, retire a public ─────────────────
revoke all on function public.web_intention_panier_frais(text,text,text,text) from public;
revoke all on function public.web_confirmer_panier_frais(uuid) from public;
grant execute on function public.web_intention_panier_frais(text,text,text,text) to site_ecrivain;
grant execute on function public.web_confirmer_panier_frais(uuid) to site_ecrivain;

-- Rollback :
--   drop function public.web_confirmer_panier_frais(uuid);
--   drop function public.web_intention_panier_frais(text,text,text,text);
--   drop table public.parametre_site;
--   drop table public.panier_frais_intention;
