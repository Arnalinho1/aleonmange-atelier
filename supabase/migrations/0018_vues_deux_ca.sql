-- Atelier ALM — Migration 0018 : LES DEUX CA (plan « Reconnaissance du revenu »
-- validé le 12/07/2026 — feu vert dédié 0018, dernière de la série 0015-0018).
--
-- Deux CA, deux vues, deux libellés — JAMAIS confondus :
-- · v_vente_remise  = CA FACTURÉ  (reconnaissance du revenu, à occurred_at
--   = livre_le). Définition de fond INCHANGÉE (fulfillment='remis') —
--   extension purement ADDITIVE : les 4 colonnes de la série 0016-0017
--   s'ajoutent EN FIN de liste (aucun lecteur existant cassé).
-- · v_encaissement  = CA ENCAISSÉ (trésorerie, à encaisse_le). NOUVELLE —
--   une ligne par événement de trésorerie (reglement). Source UNIQUE.
-- Migration de vues uniquement : AUCUNE donnée modifiée.

-- ── 1. v_vente_remise : extension additive ───────────────────────────────────
create or replace view v_vente_remise
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
  v.source_vente,
  -- Colonnes ADDITIVES (0016-0017) — toujours en fin de liste :
  v.commande_le,
  v.encaisse_le,
  v.statut_paiement,
  v.echeance_paiement
from vente v
where v.fulfillment = 'remis';

comment on view v_vente_remise is
  'CA FACTURÉ — source unique de la reconnaissance du revenu : ventes remises, imputées à occurred_at (= livre_le, jour de prestation). Lue par Historique, Finances (bloc CA facturé), analytique. Ne JAMAIS partager son libellé avec le CA encaissé.';

-- ── 2. v_encaissement : le CA encaissé (trésorerie) ──────────────────────────
create view v_encaissement
with (security_invoker = on)
as
select
  r.id,
  r.vente_id,
  r.encaisse_le,
  r.montant,
  r.moyen_paiement,
  r.note,
  v.canal,
  v.emplacement_id,
  v.client_id,
  v.mode_vente,
  v.source_vente
from reglement r
join vente v on v.id = r.vente_id;

comment on view v_encaissement is
  'CA ENCAISSÉ — source unique de la trésorerie : un événement par règlement, imputé à encaisse_le. Lue par Finances (bloc CA encaissé). Ne JAMAIS partager son libellé avec le CA facturé.';

grant select on v_encaissement to authenticated, service_role;
