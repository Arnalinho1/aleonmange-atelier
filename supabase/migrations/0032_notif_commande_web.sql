-- Atelier ALM — 0032 : notification a l'arrivee d'une commande web (Vague 3).
-- Le site (RPC web_creer_precommande, 0030) cree la vente ; l'Atelier n'est pas
-- invoque a l'arrivee. Un trigger cree la notification pour que le chef la voie
-- (badge cloche + ecran Notifs + deep-link vers /orders).
--
-- DEFENSIF : la creation de notification ne DOIT JAMAIS bloquer l'insertion d'une
-- vente (best-effort, exception avalee). Le WHEN restreint au canal web : aucune
-- surcharge sur les saisies manuelles au-dela de l'evaluation du predicat.
-- ADDITIF, faible risque : aucun enum, aucune vue, aucune RPC touchee.

create or replace function public.notifier_commande_web() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.notification (categorie, severite, titre, description, ecran)
    values (
      'commande', 'alerte', 'Nouvelle commande web a confirmer',
      'Canal ' || new.canal || ' - a confirmer dans Commandes du jour.', 'orders'
    );
  exception when others then
    null;  -- best-effort : un echec de notification ne bloque jamais la commande
  end;
  return new;
end;
$$;

create trigger trg_notifier_commande_web
  after insert on public.vente
  for each row
  when (new.source_vente = 'web' and new.fulfillment = 'web_a_confirmer')
  execute function public.notifier_commande_web();

-- Rollback :
--   drop trigger trg_notifier_commande_web on public.vente;
--   drop function public.notifier_commande_web();
