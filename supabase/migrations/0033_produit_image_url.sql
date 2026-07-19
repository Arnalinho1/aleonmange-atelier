-- Atelier ALM — 0033 : produit.image_url (visuel produit pour le site public).
-- Additif, FAIBLE RISQUE : colonne nullable, aucun lecteur casse (les select de
-- colonnes explicites restent valides ; NULL par defaut = etat actuel). Le site
-- affiche l'image du produit quand elle existe (recettes signatures boutique,
-- cartes truck), avec fallback propre sinon. Alimentee d'abord par les visuels du
-- handoff CD (amendement du 2026-07-19, cf. CLAUDE.md), remplacables par un shooting
-- reel plus tard SANS changement de code ; plus tard, upload chef depuis l'Atelier.

alter table public.produit add column if not exists image_url text;

comment on column public.produit.image_url is
  'Visuel produit affiche sur le site public (ex. /images/plats/xxx.webp). NULL = pas d''image (fallback propre). Remplacable par un shooting reel sans changement de code.';

-- Rollback :
--   alter table public.produit drop column image_url;
