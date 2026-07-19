-- Atelier ALM — 0019 : rôle site_lecteur (lecture seule dédiée au site public).
-- Remplace la clé service_role dans site/.env.local : PostgREST endosse le rôle
-- nommé dans la claim `role` d'un JWT signé avec le secret legacy du projet
-- (procédure de frappe et de rotation : docs/site/ARCHITECTURE.md).
--
-- RÈGLE PERMANENTE : site_lecteur ne bypasse PAS la RLS (contrairement à
-- service_role) et reste HORS des default privileges de 0006 (allowlist
-- explicite). Chaque future table lisible par le site reçoit son GRANT SELECT
-- ET sa policy de lecture dans la MÊME migration.

create role site_lecteur nologin;

grant usage on schema public to site_lecteur;
grant select on public.produit, public.emplacement to site_lecteur;

-- PostgREST doit pouvoir endosser le rôle (claim `role` du JWT).
grant site_lecteur to authenticator;

-- RLS activée sur ces tables : sans policy, les SELECT renverraient 0 ligne
-- malgré les grants. Nommage aligné sur « equipe lit … » existant.
create policy "site lit produit" on public.produit
  for select to site_lecteur using (true);
create policy "site lit emplacement" on public.emplacement
  for select to site_lecteur using (true);

-- Rollback (dans cet ordre) :
--   drop policy "site lit produit" on public.produit;
--   drop policy "site lit emplacement" on public.emplacement;
--   revoke site_lecteur from authenticator;
--   revoke select on public.produit, public.emplacement from site_lecteur;
--   revoke usage on schema public from site_lecteur;
--   drop role site_lecteur;
