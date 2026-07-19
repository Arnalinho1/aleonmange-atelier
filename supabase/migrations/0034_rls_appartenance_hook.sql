-- Atelier ALM — 0034 : socle de la refonte RLS (Vague 4, Étage 1).
-- Identité chef vs client par CLAIM JWT posé par un Custom Access Token Hook dont la
-- SOURCE DE VÉRITÉ est la table profil (l'équipe). Claim absent = client, FAIL-CLOSED.
-- SENSIBLE : durcit un trigger EXISTANT (handle_new_user). AUCUNE policy touchée ici
-- (conversion en 0035, séquencée, seulement APRÈS preuve du claim sur jeton frais équipe).

-- ── 1. est_chef() : lit le claim, fail-closed ────────────────────────────────
create or replace function public.est_chef()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'app_role') = 'equipe', false);
$$;
comment on function public.est_chef() is
  'TRUE si le JWT courant porte app_role=equipe (posé par custom_access_token_hook depuis profil). Fail-closed : jeton sans claim => FALSE (jamais équipe).';

-- ── 2. Custom Access Token Hook : profil -> claim app_role, à l''émission du jeton ──
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  claims jsonb;
begin
  if exists (select 1 from public.profil where id = (event->>'user_id')::uuid) then
    claims := coalesce(event->'claims', '{}'::jsonb);
    claims := jsonb_set(claims, '{app_role}', '"equipe"');
    event  := jsonb_set(event, '{claims}', claims);
  end if;
  return event;  -- non-équipe : event INCHANGÉ (aucun claim)
end;
$$;
comment on function public.custom_access_token_hook(jsonb) is
  'Auth Hook (à ACTIVER dans la config Auth). Ajoute app_role=equipe au jeton si l''utilisateur a un profil (équipe) ; sinon renvoie l''event inchangé (client). Source de vérité = profil.';

-- Grants du hook : GoTrue l''appelle en supabase_auth_admin ; réservé à lui.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant select on table public.profil to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- ── 3. Durcissement de handle_new_user : une inscription CLIENT ne crée pas de profil ──
-- Garde ajoutée EN TÊTE ; le reste (logique owner/equipe, nom) reste IDENTIQUE à 0002.
-- Une inscription marquée kind='client' (route site, qu'on maîtrise) sort sans profil ;
-- les invitations chef (sans marqueur) gardent le comportement d'origine.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  premier boolean;
begin
  if new.raw_user_meta_data ->> 'kind' = 'client' then
    return new;  -- garde Vague 4 : les comptes CLIENT n'entrent pas dans l'équipe
  end if;
  select count(*) = 0 into premier from public.profil;
  insert into public.profil (id, nom, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nom', split_part(new.email, '@', 1)),
    case when premier then 'owner'::role_equipe else 'equipe'::role_equipe end
  );
  return new;
end;
$$;

-- Rollback :
--   (3) recréer handle_new_user SANS la garde kind='client' (version 0002).
--   (2) drop function public.custom_access_token_hook(jsonb);
--       revoke execute ... from supabase_auth_admin; (grants profil/schema laissés inertes).
--   (1) drop function public.est_chef();
--   + DÉSACTIVER le hook dans la config Auth (hook_custom_access_token_enabled=false).
