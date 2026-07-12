-- Atelier ALM — Migration 0017 : FACTURATION B2B (plan « Reconnaissance du
-- revenu » validé le 12/07/2026 — feu vert dédié 0017).
--
-- Livré ≠ réglé : le fulfillment (production) ne bouge pas, le règlement est
-- une machine d'état SÉPARÉE. statut_paiement sur la vente, échéance de
-- paiement distincte de due_at (échéance de remise), et table reglement —
-- un règlement = un événement de trésorerie (pas d'acompte en V1, arbitrage
-- du 12/07/2026, mais le modèle l'accueille sans migration future).
-- SEULES les policies de la NOUVELLE table reglement sont créées ici :
-- aucune policy existante n'est touchée (refonte RLS = chantier à part).

-- ── 1. Statut de règlement et échéance sur la vente ─────────────────────────
alter table vente
  add column statut_paiement text not null default 'regle'
    check (statut_paiement in ('regle', 'du', 'partiel')),
  add column echeance_paiement date;

comment on column vente.statut_paiement is
  'Machine d''état du RÈGLEMENT — indépendante du fulfillment (un traiteur peut être remis ET dû). regle = soldé (comptoir par défaut) · du = rien d''encaissé · partiel = acompte/règlement partiel.';
comment on column vente.echeance_paiement is
  'Échéance de PAIEMENT (traiteur B2B : prestation + 30 j, posée à la remise). DISTINCTE de due_at (échéance de REMISE, production).';

-- ── 2. Backfill statut : les 6 précommandes ouvertes n'ont rien encaissé ────
update vente
  set statut_paiement = 'du'
  where encaisse_le is null;

-- ── 3. Table reglement — RLS et grants posés AVANT toute ligne ──────────────
create table reglement (
  id              uuid primary key default gen_random_uuid(),
  vente_id        uuid not null references vente (id) on delete cascade,
  montant         numeric(8, 2) not null check (montant > 0),
  encaisse_le     timestamptz not null default now(),
  moyen_paiement  paiement not null,
  note            text,
  created_at      timestamptz not null default now()
);

comment on table reglement is
  'Un règlement = un événement de trésorerie (source de v_encaissement, 0018). Un seul règlement par vente en V1 (pas d''acompte — arbitrage 12/07/2026) ; le modèle accueille le partiel sans migration. vente.encaisse_le = date du règlement SOLDANT.';

create index idx_reglement_vente on reglement (vente_id);
create index idx_reglement_encaisse on reglement (encaisse_le);

alter table reglement enable row level security;
create policy "equipe lit reglement" on reglement
  for select to authenticated using (true);
create policy "equipe ecrit reglement" on reglement
  for all to authenticated using (true) with check (true);

grant all on reglement to authenticated, service_role;

-- ── 4. Backfill : une ligne reglement par vente déjà réglée ─────────────────
-- (732 ventes : encaisse_le posé en 0016 = date d'encaissement historique)
insert into reglement (vente_id, montant, encaisse_le, moyen_paiement, note)
select id, montant_total, encaisse_le, moyen_paiement, 'Backfill 0017 — règlement historique (soldé à l''encaissement)'
from vente
where encaisse_le is not null;
