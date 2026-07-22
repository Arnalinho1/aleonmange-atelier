-- Atelier ALM — 0044 : rattachement documentaire d'une vente anonyme à un client.
-- ADDITIF (colonne + contrainte + 2 vues redéfinies). Le marqueur client_rattache_le
-- distingue le rattachement APRÈS COUP (documentaire) du client posé à la saisie :
-- v_fidelite_client (compteur DÉRIVÉ, jamais stocké) ignore les ventes marquées — un
-- rattachement ne crédite JAMAIS un passage (arbitrage 2026-07-21 : pas de rétroactivité,
-- le programme démarre avec le site). Données existantes : marqueur NULL partout
-- -> zéro changement de comportement au déploiement de la migration seule.

-- 1. Marqueur : date du rattachement manuel. NULL = client posé à la saisie (ou vente anonyme).
alter table public.vente add column if not exists client_rattache_le timestamptz;
comment on column public.vente.client_rattache_le is
  'Rattachement manuel APRÈS COUP d''une vente anonyme à un client (documentaire, 0044). NULL = client posé à la saisie. Une vente marquée ne compte JAMAIS dans la fidélité ; le détachement n''est permis QUE sur les ventes marquées.';

-- 2. Cohérence : jamais de marqueur sans client (invariant gravé en DB).
alter table public.vente add constraint vente_rattache_requiert_client
  check (client_rattache_le is null or client_id is not null);

-- 3. v_fidelite_client (0037) : les passages ignorent les ventes rattachées après coup.
--    Redéfinition complète, security_invoker restaté ; grants (0037) préservés par
--    CREATE OR REPLACE.
create or replace view public.v_fidelite_client with (security_invoker = on) as
select
  c.id as client_id,
  (select count(*) from public.vente v
     where v.client_id = c.id and v.fulfillment = 'remis'
       and v.canal in ('boutique','truck') and v.occurred_at >= c.fidelite_opt_in_le
       and v.client_rattache_le is null) as passages,
  (select count(*) from public.fidelite_redemption r where r.client_id = c.id) as recompenses_utilisees
from public.client c
where c.fidelite_opt_in;

-- 4. v_vente_remise (0018) : extension purement ADDITIVE — client_rattache_le EN FIN
--    de liste (même règle que 0018 : aucun lecteur existant cassé). /history et la
--    fiche client restent sur LA vue doctrinale (source unique du CA facturé).
create or replace view public.v_vente_remise with (security_invoker = on) as
select
  v.id,
  v.occurred_at,
  v.canal,
  v.emplacement_id,
  v.montant_total,
  v.couverts,
  v.client_id,
  v.moyen_paiement,
  v.origine,
  v.mode_vente,
  v.source_vente,
  v.commande_le,
  v.encaisse_le,
  v.statut_paiement,
  v.echeance_paiement,
  -- Colonne ADDITIVE (0044) — toujours en fin de liste :
  v.client_rattache_le
from public.vente v
where v.fulfillment = 'remis';

-- Rollback :
--   create or replace view public.v_vente_remise ...    (version 0018, sans client_rattache_le — nécessite drop view car une colonne disparaît) ;
--   create or replace view public.v_fidelite_client ... (version 0037, sans le filtre client_rattache_le) ;
--   alter table public.vente drop constraint vente_rattache_requiert_client;
--   alter table public.vente drop column client_rattache_le;
