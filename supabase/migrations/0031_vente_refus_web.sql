-- Atelier ALM — 0031 : vente, colonnes de refus des commandes web (Vague 3).
-- Une commande web refusee par le chef RESTE fulfillment='web_a_confirmer' (donc
-- deja exclue de TOUS les agregats via 0029) et porte une decision de refus.
-- ADDITIF, faible risque : aucun enum, aucune vue, aucune RPC touchee.
--
-- REGLE PERMANENTE (cf. docs/site/ARCHITECTURE.md) : tout lecteur de
-- 'web_a_confirmer' filtre refuse_le — IS NULL = file d'attente a confirmer,
-- IS NOT NULL = historique des refusees. Sinon une commande refusee reapparait
-- dans la file / le badge.

alter table public.vente
  add column refuse_le  timestamptz,   -- NULL = pas refusee ; sinon horodatage du refus chef
  add column motif_refus text;         -- motif (code + detail libre eventuel) pour l'historique et l'email

comment on column public.vente.refuse_le is
  'Refus chef d''une commande web (0031). NULL = non refusee. Le fulfillment reste web_a_confirmer (exclu des agregats) ; tout lecteur de web_a_confirmer filtre refuse_le.';
comment on column public.vente.motif_refus is
  'Motif du refus (code + detail interne eventuel). L''email client n''expose qu''une phrase douce derivee du code.';

-- Rollback :
--   alter table public.vente drop column refuse_le, drop column motif_refus;
