-- Atelier ALM — 0029 : v_commande_ouverte EXCLUT web_a_confirmer (LE fix de fuite).
-- Vague 2, migration SENSIBLE. EXIGE la 0028 DEJA COMMITEE (reference la valeur enum).
--
-- Sans ce fix, une precommande web_a_confirmer (mode_vente='precommande' AND
-- fulfillment <> 'remis') FUIT dans les 4 consommateurs de la vue, dont aucun ne
-- re-filtre fulfillment : RESERVE stock B8 (stock/page.tsx), charge a produire
-- (dashboard/page.tsx), KPI + file (orders/page.tsx), badge sidebar (layout.tsx).
-- Une commande non confirmee ne DOIT reserver aucune matiere ni entrer dans aucun
-- agregat de production : cette exclusion l'y garantit.
--
-- Projection PRESERVEE a l'IDENTIQUE (14 colonnes figees a la 0007, security_invoker=on)
-- : on ne change QUE le filtre (chirurgical, aucun consommateur casse).

create or replace view public.v_commande_ouverte
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
  v.fulfillment,
  v.source_vente,
  v.created_at,
  v.due_at
from vente v
where v.mode_vente = 'precommande'
  and v.fulfillment not in ('remis', 'web_a_confirmer');

-- Rollback : recreer la vue sans l'exclusion (definition 0018/0007) :
--   create or replace view public.v_commande_ouverte with (security_invoker = on) as
--   select v.id, v.occurred_at, v.canal, v.emplacement_id, v.montant_total, v.couverts,
--          v.client_id, v.moyen_paiement, v.origine, v.mode_vente, v.fulfillment,
--          v.source_vente, v.created_at, v.due_at
--   from vente v where v.mode_vente = 'precommande' and v.fulfillment <> 'remis';
