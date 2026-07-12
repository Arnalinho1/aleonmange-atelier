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
