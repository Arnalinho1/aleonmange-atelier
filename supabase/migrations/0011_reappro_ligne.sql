-- Atelier ALM — Migration 0011 : liste de réapprovisionnement PERSISTÉE.
--
-- Arbitrage navette CC (prime sur le handoff « Profil & Stock » §2.4 qui
-- recommandait l'éphémère) : la liste d'achat survit d'un jour à l'autre.
-- UNE ligne vivante par composant (unique), upsertée : on retrouve la
-- quantité retenue, le fournisseur (texte libre — PAS de référentiel
-- fournisseurs, §2.3) et l'état « commandé ». La feature S'ARRÊTE au flag
-- commandé : l'entrée en stock reste l'action Ajuster de l'onglet Niveaux.
-- Config PARTAGÉE d'établissement (§00) → RLS équipe, pas owner-only.

create table reappro_ligne (
  id            uuid primary key default gen_random_uuid(),
  composant_id  uuid not null unique references composant (id) on delete cascade,
  qte_retenue   numeric(10, 2),               -- override manuel (?? quantité suggérée)
  fournisseur   text,                         -- texte libre, optionnel
  commande      boolean not null default false,
  date_liste    date not null default ((now() at time zone 'Europe/Paris'))::date,
  created_at    timestamptz not null default now()
);

comment on table reappro_ligne is
  'Liste de courses persistée (une ligne vivante par composant) : qté retenue, fournisseur libre, flag commandé. S''arrête au flag — la réception réelle passe par l''ajustement d''inventaire.';

alter table reappro_ligne enable row level security;
create policy "equipe lit reappro_ligne" on reappro_ligne
  for select to authenticated using (true);
create policy "equipe ecrit reappro_ligne" on reappro_ligne
  for all to authenticated using (true) with check (true);

grant all on reappro_ligne to authenticated, service_role;
