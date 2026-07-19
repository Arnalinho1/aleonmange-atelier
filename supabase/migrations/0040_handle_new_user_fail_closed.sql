-- Atelier ALM - 0040 : handle_new_user FAIL-CLOSED (correctif securite).
--
-- FAILLE (0034 fail-open) : le trigger creait un profil equipe PAR DEFAUT et ne
-- l'evitait que si raw_user_meta_data->>'kind' = 'client'. Or 'kind' vit dans
-- user_metadata, EDITABLE par l'utilisateur (regle Supabase : jamais d'autorisation
-- fondee sur user_metadata). Signups ON (espace client Vague 4) + cle anon publique
-- (bundle Atelier) => une inscription publique SANS le marqueur obtenait un profil
-- equipe -> hook app_role=equipe -> est_chef() -> acces chef complet. Prouve en prod.
--
-- CORRECTIF : ne creer un profil (= appartenance equipe) QUE pour le tout premier
-- compte (bootstrap owner). Toute autre inscription, quel que soit user_metadata,
-- n'obtient AUCUN profil : elle reste un compte auth sans acces interne (fail-closed).
-- Le SEUL chemin de provisioning equipe legitime = insertion EXPLICITE dans profil
-- (le bootstrap owner, deja fait ; puis le futur ecran /users -> insert profil par un
-- chef, ou un insert SQL). SENSIBLE : remplace un trigger existant (0034).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  premier boolean;
begin
  select count(*) = 0 into premier from public.profil;
  -- Un profil n'est cree QUE pour le premier compte (bootstrap owner). Le marqueur
  -- user_metadata ne peut PAS accorder l'appartenance equipe (editable par le user) :
  -- une inscription publique (client ou quelconque) reste sans profil = sans acces.
  if premier then
    insert into public.profil (id, nom, role)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'nom', split_part(new.email, '@', 1)),
      'owner'::role_equipe
    );
  end if;
  return new;
end;
$$;
comment on function public.handle_new_user() is
  'Trigger auth.users (0040, fail-closed). Cree un profil (= equipe) UNIQUEMENT pour le 1er compte (bootstrap owner). Toute autre inscription reste sans profil, quel que soit user_metadata. Provisioning equipe suivant = insert explicite dans profil (ecran /users).';

-- Rollback (ATTENTION : restaure la version 0034 FAIL-OPEN ; ne pas rollback sans
-- avoir d'abord recoupe les signups, sinon le trou de privilege se rouvre) :
--   create or replace function public.handle_new_user() returns trigger language plpgsql
--   security definer set search_path = public as $$
--   declare premier boolean;
--   begin
--     if new.raw_user_meta_data ->> 'kind' = 'client' then return new; end if;
--     select count(*) = 0 into premier from public.profil;
--     insert into public.profil (id, nom, role)
--     values (new.id, coalesce(new.raw_user_meta_data ->> 'nom', split_part(new.email,'@',1)),
--             case when premier then 'owner'::role_equipe else 'equipe'::role_equipe end);
--     return new;
--   end; $$;
