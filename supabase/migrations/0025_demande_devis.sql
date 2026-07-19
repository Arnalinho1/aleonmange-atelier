-- Atelier ALM — 0025 : demande_devis (demandes de devis traiteur depuis le site).
-- Vague 2. Une demande de devis N'EST PAS une vente : table dediee, contact stocke
-- INLINE (aucun client cree tant que le chef n'a pas transforme la demande, Vague 3).
-- Additif : zero impact sur le pipeline vente.
--
-- NON lu par le site (aucun grant site_lecteur). Ecrit par la RPC SECURITY DEFINER
-- web_creer_devis (0030) qui tourne en proprietaire → aucun grant site_ecrivain sur
-- la table. Policies equipe (convention 0002) pour l'Atelier.

create table public.demande_devis (
  id                uuid primary key default gen_random_uuid(),
  type_evenement    text,
  date_evenement    date,
  nb_convives       int,
  budget_indicatif  text,                            -- libre (ex. « 500 a 800 »), jamais un total ferme
  description       text,
  contact_nom       text not null,
  contact_email     text,
  contact_telephone text,
  statut            text not null default 'nouveau'
    check (statut in ('nouveau', 'traite', 'transforme', 'refuse')),
  client_id         uuid references client (id),     -- NULL ; pose pour la future transformation (Vague 3)
  created_at        timestamptz not null default now()
);

create index idx_demande_devis_statut on public.demande_devis (statut);

alter table public.demande_devis enable row level security;

create policy "equipe lit demande_devis" on public.demande_devis
  for select to authenticated using (true);
create policy "equipe ecrit demande_devis" on public.demande_devis
  for all to authenticated using (true) with check (true);

-- Rollback :
--   drop table public.demande_devis;
