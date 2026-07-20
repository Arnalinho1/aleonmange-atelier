-- Atelier ALM - 0039 : espace client (Vague 4, Etage 2 CODE) - write-path client.
-- Le backend 0036/0037 donne au client la LECTURE de ses donnees (policies SELECT
-- scopees par mon_client_id()) mais AUCUN write-path : les policies client sur la table
-- client sont SELECT only, et mon_client_id() reste NULL tant que auth_user_id n'est pas
-- pose (oeuf-et-poule). Cette migration ajoute le write-path MINIMAL, fail-closed :
--
--   (a) web_rattacher_compte_client() : lie le compte auth courant a un client par
--       l'EMAIL VERIFIE du jeton (auth.jwt()->>'email'), JAMAIS un email saisi librement.
--       Idempotent. Cree le client si l'email ne matche personne (comportement defini).
--   (b)+(c) web_maj_profil_client(...) : maj self-scopee (auth.uid()) du profil (nom,
--       telephone) et de l'opt-in fidelite DATE (non retroactif : la date est posee a la
--       bascule false->true). L'email n'est JAMAIS modifiable ici (identite = compte auth).
--
-- SECURITY DEFINER (bypass RLS) mais self-scope STRICT par auth.uid()/auth.jwt() : un
-- client ne peut agir que sur SON client. Zero elargissement equipe (aucune policy touchee).
-- EXECUTE reserve a authenticated (revoque de anon/public). N'ecrit rien pour un jeton
-- equipe : ces fonctions servent le parcours client (les chefs passent par leurs policies).

-- (a) Rattachement compte <-> client par l'email VERIFIE du compte (param-free).
create or replace function public.web_rattacher_compte_client()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_email  text := nullif(lower(trim(auth.jwt() ->> 'email')), '');
  v_nom    text := nullif(trim(auth.jwt() -> 'user_metadata' ->> 'nom'), '');
  v_client uuid;
  v_lie    uuid;   -- auth_user_id du client trouve par email (avant rattachement)
begin
  if v_uid is null then raise exception 'non authentifie'; end if;
  if public.est_chef() then raise exception 'compte equipe : espace client reserve aux clients'; end if;
  if v_email is null then raise exception 'email du compte absent'; end if;

  -- Idempotence : deja rattache -> renvoyer le client existant (aucune ecriture).
  select id into v_client from client where auth_user_id = v_uid;
  if v_client is not null then return v_client; end if;

  -- Match par EMAIL VERIFIE du compte (index client_email_unique, lower(email)).
  select id, auth_user_id into v_client, v_lie
    from client where email is not null and lower(email) = v_email limit 1;

  if v_client is not null then
    if v_lie is not null and v_lie <> v_uid then
      raise exception 'client deja rattache a un autre compte';
    end if;
    update client set auth_user_id = v_uid where id = v_client;
    return v_client;
  end if;

  -- Aucun client pour cet email -> creation (comportement defini : nouveau particulier).
  begin
    insert into client (nom, type, email, auth_user_id)
    values (coalesce(v_nom, split_part(v_email, '@', 1)), 'particulier', v_email, v_uid)
    returning id into v_client;
  exception when unique_violation then
    -- Course : un client avec cet email vient d'apparaitre -> re-match et rattache.
    select id, auth_user_id into v_client, v_lie
      from client where email is not null and lower(email) = v_email limit 1;
    if v_client is null then raise; end if;
    if v_lie is not null and v_lie <> v_uid then
      raise exception 'client deja rattache a un autre compte';
    end if;
    update client set auth_user_id = v_uid where id = v_client;
  end;
  return v_client;
end;
$$;
comment on function public.web_rattacher_compte_client() is
  'Espace client (0039). Lie le compte auth courant a un client par l''email VERIFIE du jeton (jamais un email saisi). Idempotent ; cree le client si l''email ne matche personne. Renvoie client.id.';

revoke all on function public.web_rattacher_compte_client() from public, anon;
grant execute on function public.web_rattacher_compte_client() to authenticated;

-- (b)+(c) Maj self-scopee du profil + opt-in fidelite date (non retroactif).
create or replace function public.web_maj_profil_client(
  p_nom             text    default null,
  p_telephone       text    default null,
  p_fidelite_opt_in boolean default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_client  uuid;
  v_tel_raw text;
  v_tel     text;
begin
  if v_uid is null then raise exception 'non authentifie'; end if;
  if public.est_chef() then raise exception 'compte equipe : espace client reserve aux clients'; end if;
  select id into v_client from client where auth_user_id = v_uid;
  if v_client is null then raise exception 'compte non rattache'; end if;

  -- Telephone : normalisation IDENTIQUE a 0015/0038 (E.164), null si vide. Non touche si
  -- p_telephone est NULL (distinction "ne pas changer" vs "vider").
  if p_telephone is not null then
    v_tel_raw := regexp_replace(p_telephone, '[^0-9+]', '', 'g');
    v_tel := case
      when v_tel_raw ~ '^0[1-9][0-9]{8}$' then '+33' || substr(v_tel_raw, 2)
      when v_tel_raw ~ '^\+[0-9]{8,15}$'  then v_tel_raw
      else nullif(v_tel_raw, '')
    end;
  end if;

  update client set
    nom = coalesce(nullif(trim(p_nom), ''), nom),
    telephone = case when p_telephone is null then telephone else v_tel end,
    fidelite_opt_in = coalesce(p_fidelite_opt_in, fidelite_opt_in),
    -- Date posee UNIQUEMENT a la bascule vers true (non retroactif) ; sinon conservee.
    fidelite_opt_in_le = case
      when p_fidelite_opt_in is true and fidelite_opt_in is not true then now()
      else fidelite_opt_in_le
    end
  where id = v_client;

  return v_client;
exception when unique_violation then
  raise exception 'telephone deja utilise par un autre client';
end;
$$;
comment on function public.web_maj_profil_client(text, text, boolean) is
  'Espace client (0039). Maj self-scopee (auth.uid()) du profil client : nom, telephone (E.164), opt-in fidelite DATE (non retroactif). N''ecrit jamais l''email (identite = compte auth).';

revoke all on function public.web_maj_profil_client(text, text, boolean) from public, anon;
grant execute on function public.web_maj_profil_client(text, text, boolean) to authenticated;

-- Rollback :
--   drop function public.web_maj_profil_client(text, text, boolean);
--   drop function public.web_rattacher_compte_client();
