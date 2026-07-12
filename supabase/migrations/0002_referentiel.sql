-- Atelier ALM — Référentiel (le "contenant" : structure à conserver).
-- Règle : on ne SUPPRIME jamais un référentiel → soft delete via actif=false,
-- pour préserver l'historique / la saisonnalité (HANDOFF §01).
-- CONTENU vide au départ (sauf les 3 emplacements réels, seedés en 0005).

-- Profil équipe (1:1 avec auth.users). Rôle bootstrap ; modèle fin = point ouvert #3.
create type role_equipe as enum ('owner', 'chef', 'equipe');

create table profil (
  id          uuid primary key references auth.users (id) on delete cascade,
  nom         text not null default '',
  role        role_equipe not null default 'equipe',
  actif       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Emplacements truck — RÉFÉRENTIEL ÉDITABLE (jamais un enum). FK depuis la vente.
create table emplacement (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,          -- ex: 'oingt' (stable, jamais traduit)
  libelle       text not null,                 -- ex: 'Marché du Bois d''Oingt'
  jour_semaine  smallint,                      -- 1=lundi … 7=dimanche (indicatif)
  actif         boolean not null default true, -- désactivation = soft delete
  created_at    timestamptz not null default now()
);

-- Composant = brique commune sous les 3 catalogues (lu par id, jamais par canal).
create table composant (
  id             uuid primary key default gen_random_uuid(),
  nom            text not null,
  categorie      categorie_composant not null,
  cout_matiere_kg numeric(8, 2),               -- coût matière au kg (null tant qu'inconnu)
  actif          boolean not null default true,
  created_at     timestamptz not null default now()
);

-- Recette / fiche technique. Le bowl signature = une recette VIRTUELLE (point ouvert #5).
create table recette (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  rendement   int,                             -- nb de portions produites
  etapes      jsonb not null default '[]',     -- étapes de production
  is_virtuelle boolean not null default false, -- true pour un bowl signature
  actif       boolean not null default true,
  created_at  timestamptz not null default now()
);

create table recette_composant (
  id            uuid primary key default gen_random_uuid(),
  recette_id    uuid not null references recette (id) on delete cascade,
  composant_id  uuid not null references composant (id),
  quantite      numeric(8, 2),                 -- quantité par portion
  categorie     categorie_composant not null
);

-- Catalogue produit — 3 catalogues de vente (par canal), couche composants commune.
-- Vide au départ ; rempli via le formulaire "Nouveau produit".
create table produit (
  id             uuid primary key default gen_random_uuid(),
  nom            text not null,
  categorie      text,
  canal          canal not null,
  mode           ligne_mode not null,          -- unite | poids (2 modes)
  prix_unitaire  numeric(8, 2),                -- si mode=unite
  prix_kg        numeric(8, 2),                -- si mode=poids
  is_bowl        boolean not null default false,
  recette_id     uuid references recette (id), -- fiche technique / bowl virtuel
  actif          boolean not null default true,
  created_at     timestamptz not null default now(),
  -- cohérence prix ↔ mode
  constraint prix_selon_mode check (
    (mode = 'unite' and prix_unitaire is not null)
    or (mode = 'poids' and prix_kg is not null)
  )
);

-- Client — CRM léger (surtout traiteur / C&C). Comptoir anonyme = pas de client.
create table client (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  type        text,                            -- 'particulier' | 'pro' (libre)
  email       text,
  telephone   text,
  code_postal text,
  notes       text,
  actif       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Index utiles
create index idx_produit_canal on produit (canal) where actif;
create index idx_composant_actif on composant (actif);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — activée DÈS la création (jamais "on sécurisera après").
-- Politique bootstrap : membres authentifiés de l'équipe (lecture/écriture).
-- Le modèle fin de permissions par écran est un point ouvert (#3) — non figé ici.
-- ─────────────────────────────────────────────────────────────────────────────
alter table profil enable row level security;
alter table emplacement enable row level security;
alter table composant enable row level security;
alter table recette enable row level security;
alter table recette_composant enable row level security;
alter table produit enable row level security;
alter table client enable row level security;

create policy "equipe lit profil" on profil for select to authenticated using (true);
create policy "equipe gere son profil" on profil for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "equipe lit emplacement" on emplacement for select to authenticated using (true);
create policy "equipe ecrit emplacement" on emplacement for all to authenticated using (true) with check (true);

create policy "equipe lit composant" on composant for select to authenticated using (true);
create policy "equipe ecrit composant" on composant for all to authenticated using (true) with check (true);

create policy "equipe lit recette" on recette for select to authenticated using (true);
create policy "equipe ecrit recette" on recette for all to authenticated using (true) with check (true);

create policy "equipe lit recette_composant" on recette_composant for select to authenticated using (true);
create policy "equipe ecrit recette_composant" on recette_composant for all to authenticated using (true) with check (true);

create policy "equipe lit produit" on produit for select to authenticated using (true);
create policy "equipe ecrit produit" on produit for all to authenticated using (true) with check (true);

create policy "equipe lit client" on client for select to authenticated using (true);
create policy "equipe ecrit client" on client for all to authenticated using (true) with check (true);

-- Auto-création du profil à l'inscription. Le PREMIER inscrit devient 'owner'
-- (compte propriétaire — Arnaud), les suivants 'equipe'.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  premier boolean;
begin
  select count(*) = 0 into premier from public.profil;
  insert into public.profil (id, nom, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nom', split_part(new.email, '@', 1)),
    case when premier then 'owner'::role_equipe else 'equipe'::role_equipe end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
