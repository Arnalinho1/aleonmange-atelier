-- Atelier ALM — Paramètres de rentabilité (Finances, MOCKUP §3.11).
-- La marge NETTE = marge brute matière − charges par portion (main-d'œuvre,
-- transport). Table singleton (une seule ligne, id booléen contraint) :
-- la structure des tables est à l'appréciation de CC (Contrat §06).

create table parametre_rentabilite (
  id                    boolean primary key default true check (id),
  mo_par_portion        numeric(6, 2),
  transport_par_portion numeric(6, 2),
  updated_at            timestamptz not null default now()
);

comment on table parametre_rentabilite is
  'Singleton — charges par portion pour la marge nette (Finances). Libellés distincts : brute matière ≠ nette.';

-- RLS dès la création (règle non négociable).
alter table parametre_rentabilite enable row level security;
create policy "equipe lit parametre_rentabilite" on parametre_rentabilite for select to authenticated using (true);
create policy "equipe ecrit parametre_rentabilite" on parametre_rentabilite for all to authenticated using (true) with check (true);

grant all on parametre_rentabilite to authenticated, service_role;
