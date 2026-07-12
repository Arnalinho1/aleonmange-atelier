-- Atelier ALM — Migration 0010 : préférences PERSONNELLES de travail.
--
-- Principe du handoff « Profil & Stock » §00 : une PRÉFÉRENCE PERSO vit dans
-- une table rattachée à l'utilisateur, RLS owner-only (le canal par défaut
-- d'Audrey ne change jamais l'écran de Victorien) — par opposition à la
-- config métier PARTAGÉE (seuil_stock, emplacements…) en lecture équipe.
-- Même famille que notification_preference.

create table user_preference (
  profil_id     uuid primary key references profil (id) on delete cascade,
  canal_defaut  text not null default 'ask'
                check (canal_defaut in ('ask', 'truck', 'boutique', 'traiteur')),
  ecran_accueil text not null default 'dashboard'
                check (ecran_accueil in ('dashboard', 'sale', 'orders')),
  updated_at    timestamptz not null default now()
);

comment on table user_preference is
  'Préférences PERSONNELLES (RLS owner-only) : canal présélectionné à la Saisie, écran ouvert à la connexion. Une source, plusieurs lecteurs (sale, routeur post-login).';

-- RLS OWNER-ONLY : chacun ne lit/écrit QUE les siennes.
alter table user_preference enable row level security;
create policy "preference perso lecture" on user_preference
  for select to authenticated using (auth.uid() = profil_id);
create policy "preference perso ecriture" on user_preference
  for all to authenticated using (auth.uid() = profil_id) with check (auth.uid() = profil_id);

grant all on user_preference to authenticated, service_role;
