-- Atelier ALM — schéma complet (concaténation des migrations 0001→0017).
-- À exécuter dans le SQL Editor Supabase du projet DÉDIÉ ALM (base vide).
-- Généré à partir de supabase/migrations/*.sql


-- ═══════════════════════════════════════════════════════════════════
-- 0001_enums.sql
-- ═══════════════════════════════════════════════════════════════════
-- Atelier ALM — Enums (Contrat de données §04, valeurs figées)
-- Clés = valeurs stockées (stables, jamais traduites). Libellés FR = côté front.
-- Décision base (Contrat §06) : types Postgres natifs pour les jeux figés.
-- NOTE : `emplacement` n'est PAS un enum → table de référentiel éditable (0002).

create type canal as enum ('truck', 'boutique', 'traiteur');

create type mode_vente as enum ('instantane', 'precommande');

create type fulfillment as enum ('a_produire', 'en_prod', 'pret', 'remis');

create type paiement as enum ('especes', 'cb', 'ticket', 'virement');

create type origine as enum ('spontane', 'insta', 'tiktok', 'facebook', 'code');

create type ligne_type as enum ('bowl', 'produit', 'formule');

-- Exactement 2 modes de tarification (portion + tailles S/M/L retirés du modèle).
create type ligne_mode as enum ('unite', 'poids');

create type categorie_composant as enum ('proteine', 'feculent', 'legume', 'sauce');

create type source_vente as enum ('manuel', 'import');

-- ═══════════════════════════════════════════════════════════════════
-- 0002_referentiel.sql
-- ═══════════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════════
-- 0003_transactionnel.sql
-- ═══════════════════════════════════════════════════════════════════
-- Atelier ALM — Transactionnel. NAÎT VIDE, aucun seed (HANDOFF §01-C).
-- La Vente est LA source de vérité (Contrat de données §01).

-- ── VENTE (Contrat §01 — jeu de champs & nullabilité FIGÉS) ──────────────────
create table vente (
  id             uuid primary key default gen_random_uuid(),
  -- Champ critique : porte le jour-de-semaine → TOUTE la saisonnalité.
  -- Capturé à l'encaissement, Europe/Paris. JAMAIS dérivé de created_at (§03/§04).
  occurred_at    timestamptz not null,
  canal          canal not null,
  -- FK vers le référentiel éditable. NOT NULL si truck, sinon NULL (Contrat §01).
  emplacement_id uuid references emplacement (id),
  montant_total  numeric(8, 2) not null,       -- somme des lignes, figée à l'encaissement
  couverts       int,                          -- traiteur uniquement (base du €/pers)
  client_id      uuid references client (id),  -- optionnel (comptoir = anonyme)
  moyen_paiement paiement not null,
  origine        origine not null default 'spontane',
  -- Marqueur SAISI à la vente : c'est lui (pas le canal) qui dérive fulfillment.
  mode_vente     mode_vente not null,
  -- Cycle de production. CA compté uniquement sur 'remis'.
  fulfillment    fulfillment not null,
  source_vente   source_vente not null default 'manuel', -- 'import' = issu de l'import caisse
  created_at     timestamptz not null default now(),      -- heure d'insertion technique (≠ occurred_at)
  -- emplacement obligatoire pour le truck, interdit ailleurs (Contrat §06 figé).
  constraint emplacement_si_truck check (
    (canal = 'truck' and emplacement_id is not null)
    or (canal <> 'truck' and emplacement_id is null)
  ),
  -- couverts réservé au traiteur
  constraint couverts_si_traiteur check (
    couverts is null or canal = 'traiteur'
  )
);

-- Index pour la saisonnalité (Contrat §06 — appel base).
create index idx_vente_occurred_canal on vente (occurred_at, canal);
create index idx_vente_fulfillment on vente (fulfillment);

-- ── VENTE_LIGNE (Contrat §02) ────────────────────────────────────────────────
-- Une ligne = un bowl (recette virtuelle, se déplie), un produit fini, ou une
-- formule traiteur. Tarification : 2 modes (unite | poids).
create table vente_ligne (
  id            uuid primary key default gen_random_uuid(),
  vente_id      uuid not null references vente (id) on delete cascade,
  type          ligne_type not null,          -- bowl | produit | formule
  mode          ligne_mode not null,          -- unite | poids
  recette_id    uuid references recette (id), -- bowl = recette virtuelle (se déplie)
  produit_id    uuid references produit (id), -- traçabilité catalogue (nullable pour import non rapproché)
  libelle       text not null,                -- désignation figée à la vente
  poids_g       int,                          -- mode=poids uniquement (pesée réelle continue)
  prix_kg       numeric(8, 2),                -- mode=poids uniquement
  qte           int,                          -- mode=unite (pièces)
  prix_unitaire numeric(8, 2),                -- mode=unite
  montant       numeric(8, 2) not null,       -- unite: PU×qte · poids: prix_kg×poids_g/1000
  constraint champs_selon_mode check (
    (mode = 'poids' and poids_g is not null and prix_kg is not null)
    or (mode = 'unite' and qte is not null and prix_unitaire is not null)
  )
);

create index idx_ligne_vente on vente_ligne (vente_id);

-- Dépliage du bowl → composants (coût matière + gaspi C2). Le bowl se VEND à
-- l'unité mais reste COMPOSÉ. Vide pour un produit fini.
create table vente_ligne_composant (
  id            uuid primary key default gen_random_uuid(),
  ligne_id      uuid not null references vente_ligne (id) on delete cascade,
  composant_id  uuid not null references composant (id),
  categorie     categorie_composant not null
);

create index idx_vlc_ligne on vente_ligne_composant (ligne_id);

-- ── STOCK & LOTS (DLC) ───────────────────────────────────────────────────────
create table lot (
  id            uuid primary key default gen_random_uuid(),
  composant_id  uuid not null references composant (id),
  numero        text,
  dlc           date,
  quantite      numeric(10, 2),
  recu_le       date,
  created_at    timestamptz not null default now()
);

create table mouvement_stock (
  id            uuid primary key default gen_random_uuid(),
  composant_id  uuid not null references composant (id),
  lot_id        uuid references lot (id),
  type          text not null,                -- 'reception' | 'ajustement' | 'sortie'
  quantite      numeric(10, 2) not null,
  occurred_at   timestamptz not null default now(),
  note          text,
  created_at    timestamptz not null default now()
);

-- Seuils d'alerte stock = config référentiel. Règles exactes = point ouvert #2.
create table seuil_stock (
  composant_id  uuid primary key references composant (id) on delete cascade,
  seuil_bas     numeric(10, 2)
);

-- ── HACCP (registre réglementaire) ───────────────────────────────────────────
create table releve_haccp (
  id            uuid primary key default gen_random_uuid(),
  type          text not null,                -- 'temperature' | 'nettoyage' | 'controle'
  cible         text,
  valeur        numeric(6, 2),
  conforme      boolean,
  lot_id        uuid references lot (id),
  note          text,
  occurred_at   timestamptz not null default now(),
  operateur_id  uuid references profil (id),
  created_at    timestamptz not null default now()
);

-- ── INSIGHTS (source UNIQUE — dashboard lit .slice(0,3)) ─────────────────────
-- Règles de génération exactes = point ouvert #2 (à valider). Table vide au départ.
create table insight (
  id            uuid primary key default gen_random_uuid(),
  urgence       text not null,                -- 'aujourdhui' | 'semaine' | 'structurel'
  impact        numeric(10, 2),               -- enjeu € (tri urgence→impact)
  objectif      text,
  constat       text not null,
  chiffre       text,
  action        text,
  action_ecran  text,                         -- écran d'exécution ciblé par le CTA
  origine_calcul text not null default 'calcule', -- 'calcule' | 'demo'
  statut        text not null default 'ouvert',   -- 'ouvert' | 'traite' | 'reporte'
  created_at    timestamptz not null default now()
);

create index idx_insight_statut on insight (statut);

-- ── NOTIFICATIONS ────────────────────────────────────────────────────────────
create table notification (
  id            uuid primary key default gen_random_uuid(),
  categorie     text not null,                -- 'stock' | 'dlc' | 'seuil' | 'traiteur'
  severite      text not null default 'info', -- 'critique' | 'alerte' | 'info'
  titre         text not null,
  description   text,
  ecran         text,                         -- écran concerné
  lu            boolean not null default false,
  occurred_at   timestamptz not null default now()
);

create index idx_notif_lu on notification (lu);

create table notification_preference (
  id            uuid primary key default gen_random_uuid(),
  profil_id     uuid not null references profil (id) on delete cascade,
  categorie     text not null,
  in_app        boolean not null default true,
  email         boolean not null default false,
  unique (profil_id, categorie)
);

-- ── SOCIAL (périmètre = point ouvert #4, squelette) ──────────────────────────
create table social_post (
  id            uuid primary key default gen_random_uuid(),
  reseau        text not null,                -- 'insta' | 'tiktok' | 'facebook'
  emplacement_id uuid references emplacement (id),
  contenu       text,
  statut        text not null default 'brouillon', -- 'brouillon' | 'programme' | 'publie'
  programme_le  timestamptz,
  publie_le     timestamptz,
  created_at    timestamptz not null default now()
);

-- ── IMPORT CAISSE (mapping PROVISOIRE & configurable — point ouvert #1) ──────
create table import_mapping (
  id            uuid primary key default gen_random_uuid(),
  nom           text not null,
  separateur    text not null default ',',
  -- mapping colonne CSV → champ modèle, entièrement paramétrable (jamais figé).
  colonnes      jsonb not null default '{}',
  actif         boolean not null default true,
  created_at    timestamptz not null default now()
);

create table import_batch (
  id            uuid primary key default gen_random_uuid(),
  mapping_id    uuid references import_mapping (id),
  fichier_nom   text,
  lignes_total  int,
  lignes_valides int,
  statut        text not null default 'brouillon', -- 'brouillon' | 'valide'
  jour_exploitation date,                     -- occurred_at métier (jamais created_at)
  created_at    timestamptz not null default now()
);

-- ── RLS sur TOUT le transactionnel (dès la création) ────────────────────────
alter table vente enable row level security;
alter table vente_ligne enable row level security;
alter table vente_ligne_composant enable row level security;
alter table lot enable row level security;
alter table mouvement_stock enable row level security;
alter table seuil_stock enable row level security;
alter table releve_haccp enable row level security;
alter table insight enable row level security;
alter table notification enable row level security;
alter table notification_preference enable row level security;
alter table social_post enable row level security;
alter table import_mapping enable row level security;
alter table import_batch enable row level security;

-- Politique bootstrap uniforme : équipe authentifiée (lecture/écriture).
do $$
declare t text;
begin
  foreach t in array array[
    'vente','vente_ligne','vente_ligne_composant','lot','mouvement_stock',
    'seuil_stock','releve_haccp','insight','notification','social_post',
    'import_mapping','import_batch'
  ] loop
    execute format('create policy "equipe lit %1$s" on %1$s for select to authenticated using (true);', t);
    execute format('create policy "equipe ecrit %1$s" on %1$s for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- Préférences de notif : chacun gère les siennes.
create policy "prefs notif lecture" on notification_preference for select to authenticated using (auth.uid() = profil_id);
create policy "prefs notif ecriture" on notification_preference for all to authenticated using (auth.uid() = profil_id) with check (auth.uid() = profil_id);

-- ═══════════════════════════════════════════════════════════════════
-- 0004_vues.sql
-- ═══════════════════════════════════════════════════════════════════
-- Atelier ALM — Sources uniques matérialisées (un calcul, plusieurs vues).
-- Règle critique (HANDOFF §03) : Finances ET Historique dérivent de la MÊME
-- source de ventes remises. On ne recompte jamais le CA de deux façons.

-- security_invoker=on : la RLS des tables sous-jacentes s'applique au lecteur.
create view v_vente_remise
with (security_invoker = on)
as
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
  v.source_vente
from vente v
where v.fulfillment = 'remis'; -- LE CA n'est compté qu'ici (une commande non remise ≠ CA).

comment on view v_vente_remise is
  'Source unique du CA : ventes fulfillment=remis. Lue par Historique ET Finances (jamais de recompte parallèle).';

-- File de production : uniquement le NON-remis en précommande (Contrat §01).
create view v_commande_ouverte
with (security_invoker = on)
as
select
  v.*
from vente v
where v.mode_vente = 'precommande'
  and v.fulfillment <> 'remis';

comment on view v_commande_ouverte is
  'Commandes du jour : précommandes non encore remises. Le comptoir instantané (déjà remis) n''apparaît pas.';

-- ═══════════════════════════════════════════════════════════════════
-- 0005_seed.sql
-- ═══════════════════════════════════════════════════════════════════
-- Atelier ALM — SEED MINIMAL (le seul autorisé et requis — HANDOFF §01-A).
-- Autorisé : enums (0001), les 3 emplacements truck RÉELS, un compte propriétaire.
-- INTERDIT : aucun produit, aucune vente, aucun stock, aucun insight. Le reste naît vide.

-- Les 3 emplacements truck réels (référentiel éditable — modifiables ensuite en Réglages).
insert into emplacement (code, libelle, jour_semaine, actif) values
  ('oingt',    'Marché du Bois d''Oingt', 2, true),  -- mardi
  ('tassin',   'Tassin-la-Demi-Lune',     3, true),  -- mercredi
  ('salvagny', 'La Tour-de-Salvagny',     4, true)   -- jeudi
on conflict (code) do nothing;

-- Compte propriétaire :
-- Le profil référence auth.users → il ne peut exister sans un compte Auth.
-- Le trigger handle_new_user (0002) crée automatiquement le profil au 1er
-- inscrit et lui attribue le rôle 'owner'. Donc : la 1re inscription via
-- Supabase Auth (Arnaud) devient le propriétaire. Rien à seeder ici pour Auth
-- (création d'un utilisateur auth.users à faire via l'app / le dashboard Supabase).

-- ═══════════════════════════════════════════════════════════════════
-- 0006_grants.sql
-- ═══════════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════════
-- 0007_due_fulfillment_event.sql
-- ═══════════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════════
-- 0008_parametre_rentabilite.sql
-- ═══════════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════════
-- 0009_unite_composant_notification_created_at.sql
-- ═══════════════════════════════════════════════════════════════════
-- Atelier ALM — Migration 0009 (décisions base, Contrat §06).
--
-- 1) composant.unite : unité de STOCK (kg | piece | l) — affichage de l'écran
--    Stocks. Les coûts restent en cout_matiere_kg (€/kg) : les recettes sont
--    exprimées en grammes, y compris pour les composants à la pièce/au litre,
--    donc lib/calculs.ts est inchangé.
--
-- 2) notification.created_at : heure d'insertion TECHNIQUE (≠ occurred_at,
--    qui porte l'instant métier de l'alerte). Aligne la table sur le reste du
--    schéma et rend possible une purge par borne temporelle.

alter table composant
  add column unite text not null default 'kg'
  check (unite in ('kg', 'piece', 'l'));

comment on column composant.unite is
  'Unité de stock (kg | piece | l) — affichage Stocks. Coûts toujours en €/kg (recettes en grammes).';

alter table notification
  add column created_at timestamptz not null default now();

comment on column notification.created_at is
  'Heure d''insertion technique (≠ occurred_at métier) — borne des purges temporelles.';

-- ═══════════════════════════════════════════════════════════════════
-- 0010_user_preference.sql
-- ═══════════════════════════════════════════════════════════════════
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


-- ═══════════════════════════════════════════════════════════════════
-- 0011_reappro_ligne.sql
-- ═══════════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════════
-- 0012_deduction_stock.sql
-- ═══════════════════════════════════════════════════════════════════

-- Atelier ALM — Migration 0012 : déduction de stock à la vente (B8).
--
-- CONSOMMÉ = mouvements réels « sortie » écrits à la REMISE (vente instantanée
-- ou passage à remis). RÉSERVÉ = calcul dynamique sur les commandes ouvertes
-- (aucun mouvement — toujours juste sans mécanique de dé-réservation).
--
-- 1) Le dépliage d'un bowl porte ses grammes FIGÉS à l'encaissement :
--    la fiche peut changer ensuite, l'historique reste vrai.
alter table vente_ligne_composant
  add column quantite_g numeric(10, 2);
comment on column vente_ligne_composant.quantite_g is
  'Grammes TOTAUX de la ligne pour ce composant (qte × grammes fiche), figés à l''encaissement. NULL sur l''historique antérieur à B8 (fallback fiche).';

-- 2) Conversion grammes → pièces pour les composants suivis à la pièce
--    (œuf ≈ 50 g…). Sans poids renseigné : pas de sortie automatique,
--    badge « poids à renseigner » sur l'écran Stocks.
alter table composant
  add column poids_piece_g numeric(10, 2);
comment on column composant.poids_piece_g is
  'Poids d''UNE pièce en grammes (composants unite=piece) — requis pour convertir les sorties recettes (g) en pièces.';


-- ═══════════════════════════════════════════════════════════════════
-- 0013_cout_achat_produit.sql
-- ═══════════════════════════════════════════════════════════════════

-- Atelier ALM — Migration 0013 : coût d'achat des produits REVENDUS.
--
-- Le coût matière vit sur les fiches (composant.cout_matiere_kg) — mais les
-- revendus tels quels (boissons, épicerie, charcuterie à la coupe) n'ont pas
-- de fiche : leur coût était INCONNU (58 % du CA boutique couvert seulement).
-- cout_achat comble ce trou. Interprété dans l'UNITÉ DE VENTE du produit,
-- symétrique de prix_unitaire/prix_kg : €/pièce si mode unite, €/kg si poids.
-- La fiche reste PRIORITAIRE quand elle existe (source unique calculs.ts).

alter table produit
  add column cout_achat numeric(8, 2);

comment on column produit.cout_achat is
  'Coût d''achat d''un produit REVENDU (sans fiche) — €/pièce si mode unite, €/kg si mode poids. La fiche liée reste prioritaire pour le coût matière. NULL = coût inconnu (compte dans l''indicateur de couverture).';


-- ═══════════════════════════════════════════════════════════════════
-- 0014_temps_prepa_recette.sql
-- ═══════════════════════════════════════════════════════════════════

-- Atelier ALM — Migration 0014 : temps de préparation déclaratif des fiches.
--
-- Ouvre la métrique « temps de production estimé » de Productivité :
-- temps PAR BATCH de la fiche, ASSEMBLAGE INCLUS (décision Arnaud — pas de
-- forfait d'assemblage séparé pour les bowls). Temps par portion = temps ÷
-- rendement (même mécanique que le coût). Valeur DÉCLARATIVE chef → la
-- métrique est toujours affichée ESTIMÉE, jamais « réelle ».
-- NULL = « temps non défini » (affiché tel quel, jamais 0 silencieux).

alter table recette
  add column temps_prepa_min numeric(6, 1);

comment on column recette.temps_prepa_min is
  'Temps de préparation du BATCH de la fiche, en minutes, assemblage inclus (déclaratif chef — métrique ESTIMÉE). Temps/portion = temps ÷ rendement. NULL = temps non défini.';


-- ═══════════════════════════════════════════════════════════════════
-- 0015_socle_client.sql
-- ═══════════════════════════════════════════════════════════════════

-- Atelier ALM — Migration 0015 : SOCLE CLIENT (plan « Reconnaissance du revenu »
-- validé le 12/07/2026 — exécution sur feu vert dédié, migration par migration).
--
-- Fondation commune de la facturation B2B, de la fidélité, du futur espace
-- client et du rapprochement web (« email prioritaire, téléphone secours ») :
-- identité fiabilisée par normalisation + index uniques partiels, consentement
-- RGPD daté, coordonnées de facturation. AUCUNE policy modifiée (la refonte
-- RLS est un chantier à part) ; aucune table communautaire concernée.

-- ── 1. Normalisation des données existantes ──────────────────────────────────
-- Emails : minuscules + trim (les 6 emails démo sont déjà propres — no-op sûr).
update client
  set email = nullif(lower(trim(email)), '')
  where email is not null;

-- Téléphones : E.164. Règle déterministe : on ne garde que chiffres et « + » ;
-- un national français (0X XXXXXXXX) devient +33X XXXXXXXX ; un international
-- déjà préfixé est conservé tel quel ; tout autre reste en chiffres bruts.
update client
  set telephone = case
    when regexp_replace(telephone, '[^0-9+]', '', 'g') ~ '^0[1-9][0-9]{8}$'
      then '+33' || substr(regexp_replace(telephone, '[^0-9+]', '', 'g'), 2)
    when regexp_replace(telephone, '[^0-9+]', '', 'g') ~ '^\+[0-9]{8,15}$'
      then regexp_replace(telephone, '[^0-9+]', '', 'g')
    else nullif(regexp_replace(telephone, '[^0-9+]', '', 'g'), '')
  end
  where telephone is not null;

-- ── 2. Colonnes du socle ─────────────────────────────────────────────────────
alter table client
  add column consentement_marketing boolean not null default false,
  add column consentement_le timestamptz,
  add column adresse text,
  add column siret text;

comment on column client.consentement_marketing is
  'Consentement marketing RGPD — toujours accompagné de sa date (consentement_le). Défaut false : rien n''est présumé.';
comment on column client.consentement_le is
  'Date du recueil (ou retrait) du consentement marketing. NULL = jamais recueilli.';
comment on column client.adresse is
  'Adresse postale — mentions de facturation B2B.';
comment on column client.siret is
  'SIRET (clients pro, facturation B2B) — optionnel.';

-- ── 3. Index uniques PARTIELS — fondation du create-or-match ────────────────
-- Le rapprochement web s''appuiera sur ces contraintes, jamais sur une
-- recherche floue. Partiels : plusieurs clients sans email/tel restent permis.
create unique index client_email_unique
  on client (lower(email)) where email is not null;
create unique index client_telephone_unique
  on client (telephone) where telephone is not null;

comment on column client.email is
  'Identifiant de rapprochement PRIORITAIRE (unique si renseigné, normalisé minuscules/trim à l''écriture).';
comment on column client.telephone is
  'Identifiant de rapprochement SECOURS (unique si renseigné, normalisé E.164 à l''écriture).';


-- ═══════════════════════════════════════════════════════════════════
-- 0016_trois_dates.sql
-- ═══════════════════════════════════════════════════════════════════

-- Atelier ALM — Migration 0016 : TROIS DATES (plan « Reconnaissance du revenu »
-- validé le 12/07/2026 — feu vert dédié 0016).
--
-- Une vente porte trois moments : commande_le (prise de commande), livre_le
-- (remise/prestation — PORTÉ PAR occurred_at, décision de la note : pas de
-- renommage physique), encaisse_le (entrée d'argent, NULL tant que non soldé).
-- Cette migration ne modifie AUCUN montant : elle ajoute deux colonnes et
-- ré-impute la DATE de 18 précommandes remises (occurred_at := instant réel
-- de remise, déjà tracé par fulfillment_event). Le comptoir (714 ventes,
-- 3 dates égales) ne bouge pas d'un iota.

-- ── 1. Colonnes ──────────────────────────────────────────────────────────────
alter table vente
  add column commande_le timestamptz,
  add column encaisse_le timestamptz;

-- ── 2. Backfill (AVANT la ré-imputation : occurred_at actuel = saisie) ──────
-- Instantanées : commande = livraison = encaissement (comptoir).
update vente
  set commande_le = occurred_at, encaisse_le = occurred_at
  where mode_vente = 'instantane';

-- Précommandes remises : la saisie ÉTAIT la prise de commande, et le modèle
-- historique encaissait à la saisie — l'historique reste vrai.
update vente
  set commande_le = occurred_at, encaisse_le = occurred_at
  where mode_vente = 'precommande' and fulfillment = 'remis';

-- Précommandes ouvertes : commandées, ni livrées ni encaissées
-- (statut_paiement 'du' arrive en 0017).
update vente
  set commande_le = occurred_at, encaisse_le = null
  where mode_vente = 'precommande' and fulfillment <> 'remis';

-- ── 3. Ré-imputation : occurred_at (= livre_le) := instant réel de remise ──
update vente v
  set occurred_at = e.remis_le
  from (
    select vente_id, max(occurred_at) as remis_le
    from fulfillment_event
    where vers = 'remis'
    group by vente_id
  ) e
  where e.vente_id = v.id
    and v.mode_vente = 'precommande'
    and v.fulfillment = 'remis';

-- ── 4. Contrainte et sémantique ─────────────────────────────────────────────
alter table vente alter column commande_le set not null;

comment on column vente.occurred_at is
  'LIVRE_LE — instant de remise/prestation (Europe/Paris). Porte le CA FACTURÉ (v_vente_remise) et toute la saisonnalité de service. Comptoir : posé à l''encaissement (3 dates égales). Précommande : provisoire à la saisie, RÉÉCRIT à la remise par avancerFulfillment. NE PLUS le surcharger d''un autre sens (note Reconnaissance du revenu, 12/07/2026).';
comment on column vente.commande_le is
  'Prise de commande (saisie comptoir, commande web, devis accepté). Borne de départ du cycle de commande.';
comment on column vente.encaisse_le is
  'Entrée d''argent — date du règlement SOLDANT. NULL tant que non soldé (traiteur B2B J+30). Porte le CA ENCAISSÉ (v_encaissement, 0018).';


-- ═══════════════════════════════════════════════════════════════════
-- 0017_facturation.sql
-- ═══════════════════════════════════════════════════════════════════

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
