-- Atelier ALM — Décisions base (Contrat §06 : structure des tables à l'appréciation de CC).
--
-- 1) vente.due_at : échéance de remise d'une PRÉCOMMANDE (le « due » du HANDOFF §02
--    orders : groupement jour/créneau de la file de production). NULL pour une vente
--    instantanée (déjà remise). Ne remplace jamais occurred_at (heure d'encaissement).
--
-- 2) fulfillment_event : transitions horodatées du cycle a_produire→en_prod→pret→remis.
--    Source de l'écran Productivité (cadences réelles). Écrite par Commandes du jour.

alter table vente add column due_at timestamptz;

comment on column vente.due_at is
  'Échéance de remise (précommande) — groupement jour/créneau des Commandes. NULL si instantané.';

create index idx_vente_due on vente (due_at) where fulfillment <> 'remis';

-- La vue v_commande_ouverte a figé ses colonnes à sa création (select v.*) :
-- on la recrée pour exposer due_at.
create or replace view v_commande_ouverte
with (security_invoker = on)
as
select
  v.*
from vente v
where v.mode_vente = 'precommande'
  and v.fulfillment <> 'remis';

create table fulfillment_event (
  id            uuid primary key default gen_random_uuid(),
  vente_id      uuid not null references vente (id) on delete cascade,
  de            fulfillment not null,
  vers          fulfillment not null,
  occurred_at   timestamptz not null default now(),
  operateur_id  uuid references profil (id),
  created_at    timestamptz not null default now()
);

comment on table fulfillment_event is
  'Transitions horodatées du fulfillment — source unique des cadences (Productivité).';

create index idx_fulfillment_event_vente on fulfillment_event (vente_id);

-- RLS dès la création (règle non négociable).
alter table fulfillment_event enable row level security;
create policy "equipe lit fulfillment_event" on fulfillment_event for select to authenticated using (true);
create policy "equipe ecrit fulfillment_event" on fulfillment_event for all to authenticated using (true) with check (true);

-- Les default privileges de 0006 couvrent la nouvelle table ; explicite par sûreté.
grant all on fulfillment_event to authenticated, service_role;
