-- Atelier ALM — Droits d'accès API (GRANT).
-- Les nouveaux projets Supabase ne donnent plus de privilèges par défaut sur
-- les tables du schéma public : sans GRANT explicite, PostgREST renvoie
-- "42501 permission denied" avant même d'évaluer la RLS.
-- Conforme au design existant : seule l'équipe connectée (authenticated)
-- accède aux données ; anon ne reçoit aucun droit sur les tables.

grant usage on schema public to authenticated, service_role;

grant all on all tables in schema public to authenticated, service_role;
grant all on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;

-- Les objets créés plus tard héritent des mêmes droits.
alter default privileges in schema public
  grant all on tables to authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to authenticated, service_role;
