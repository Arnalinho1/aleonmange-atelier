-- Atelier ALM — 0023 : horaire_boutique (horaires réels, pilotés par les chefs).
-- Plan référentiel approuvé le 2026-07-18 (docs/site/ARCHITECTURE.md), dernière
-- migration du plan (la 0024 creneau_retrait est reportée au STOP Vague 2).
--
-- Colonnes time (pas de texte libre) : le formatage (« 9h à 13h · 15h à 19h »)
-- se fait dans le code, et un futur statut « ouvert maintenant » calculé
-- devient possible. Représentation des jours FERMÉS : ligne PRÉSENTE aux
-- 4 plages nulles (fermeture EXPLICITE, saisie chef) — une table VIDE signifie
-- « non configuré » et le site retombe alors intégralement sur contenu.ts.
-- Côté site : plages nulles → « Fermé » ; consommation à activer avec l'UI
-- Réglages (nouvelle section Horaires boutique).
--
-- Création de table : RÈGLE PERMANENTE — RLS + policies équipe (convention
-- 0002) + grant/policy site_lecteur dans la MÊME migration. SEED des horaires
-- RÉELS du handoff §06 dans la même migration (pas de trou de configuration).

create table public.horaire_boutique (
  id           uuid primary key default gen_random_uuid(),
  jour         smallint not null unique check (jour between 1 and 7), -- 1=lundi … 7=dimanche
  plage1_debut time,                            -- matin (ou journée continue)
  plage1_fin   time,
  plage2_debut time,                            -- après-midi
  plage2_fin   time,
  created_at   timestamptz not null default now(),
  -- cohérence : débuts et fins vont par paire, fin après début,
  -- pas de plage 2 sans plage 1, après-midi après le matin
  constraint plage1_coherente check (
    (plage1_debut is null) = (plage1_fin is null)
    and (plage1_fin is null or plage1_fin > plage1_debut)
  ),
  constraint plage2_coherente check (
    (plage2_debut is null) = (plage2_fin is null)
    and (plage2_fin is null or plage2_fin > plage2_debut)
  ),
  constraint plage2_apres_plage1 check (
    plage2_debut is null or (plage1_fin is not null and plage2_debut > plage1_fin)
  )
);

alter table public.horaire_boutique enable row level security;

create policy "equipe lit horaire_boutique" on public.horaire_boutique
  for select to authenticated using (true);
create policy "equipe ecrit horaire_boutique" on public.horaire_boutique
  for all to authenticated using (true) with check (true);

grant select on public.horaire_boutique to site_lecteur;
create policy "site lit horaire_boutique" on public.horaire_boutique
  for select to site_lecteur using (true);

-- Seed : horaires REELS (handoff §06 : Mar-Ven 9h-13h / 15h-19h · Sam 9h-14h ·
-- Dim/Lun fermé), les mêmes que contenu.ts affiche aujourd'hui.
insert into public.horaire_boutique (jour, plage1_debut, plage1_fin, plage2_debut, plage2_fin) values
  (1, null,    null,    null,    null),     -- lundi : fermé
  (2, '09:00', '13:00', '15:00', '19:00'),  -- mardi
  (3, '09:00', '13:00', '15:00', '19:00'),  -- mercredi
  (4, '09:00', '13:00', '15:00', '19:00'),  -- jeudi
  (5, '09:00', '13:00', '15:00', '19:00'),  -- vendredi
  (6, '09:00', '14:00', null,    null),     -- samedi : matinée continue
  (7, null,    null,    null,    null);     -- dimanche : fermé

-- Rollback :
--   drop table public.horaire_boutique;
--   (drop table emporte policies, grants, contraintes et seed)
