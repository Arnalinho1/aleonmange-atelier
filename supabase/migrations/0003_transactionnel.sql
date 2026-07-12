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
