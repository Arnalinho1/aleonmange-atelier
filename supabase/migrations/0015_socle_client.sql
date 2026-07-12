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
