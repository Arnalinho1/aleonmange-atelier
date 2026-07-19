-- Atelier ALM — 0026 : newsletter_abonne (inscriptions site, DOUBLE opt-in).
-- Vague 2. Consentement RGPD date UNIQUEMENT au clic de confirmation (consentement_le
-- reste NULL tant que statut='en_attente'). Additif : zero impact sur le pipeline.
--
-- NON lu par le site (aucun grant site_lecteur). Ecrit par les RPC SECURITY DEFINER
-- web_inscrire_newsletter / web_confirmer_newsletter (0030). Policies equipe.

create table public.newsletter_abonne (
  id             uuid primary key default gen_random_uuid(),
  email          text not null,
  token          uuid not null default gen_random_uuid(),  -- lien de confirmation double opt-in
  statut         text not null default 'en_attente'
    check (statut in ('en_attente', 'confirme', 'desabonne')),
  consentement_le timestamptz,                              -- NULL tant que non confirme (RGPD)
  demande_le     timestamptz not null default now(),        -- horodatage de la demande d'inscription
  confirme_le    timestamptz,
  created_at     timestamptz not null default now()
);

-- Unicite sur l'email normalise (une inscription par adresse).
create unique index newsletter_email_unique
  on public.newsletter_abonne (lower(email));

alter table public.newsletter_abonne enable row level security;

create policy "equipe lit newsletter_abonne" on public.newsletter_abonne
  for select to authenticated using (true);
create policy "equipe ecrit newsletter_abonne" on public.newsletter_abonne
  for all to authenticated using (true) with check (true);

-- Rollback :
--   drop table public.newsletter_abonne;
