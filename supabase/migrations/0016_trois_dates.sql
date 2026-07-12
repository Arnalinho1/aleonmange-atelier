-- Atelier ALM — Migration 0016 : TROIS DATES (plan « Reconnaissance du revenu »
-- validé le 12/07/2026 — feu vert dédié 0016).
--
-- Une vente porte trois moments : commande_le (prise de commande), livre_le
-- (remise/prestation — PORTÉ PAR occurred_at, décision de la note : pas de
-- renommage physique), encaisse_le (entrée d'argent, NULL tant que non soldé).
-- Cette migration ne modifie AUCUN montant : elle ajoute deux colonnes et
-- ré-impute la DATE de 18 précommandes remises (occurred_at := instant réel
-- de remise, déjà tracé par fulfillment_event). Le comptoir (714 ventes,
-- 3 dates égales) ne bouge pas d'un iota.

-- ── 1. Colonnes ──────────────────────────────────────────────────────────────
alter table vente
  add column commande_le timestamptz,
  add column encaisse_le timestamptz;

-- ── 2. Backfill (AVANT la ré-imputation : occurred_at actuel = saisie) ──────
-- Instantanées : commande = livraison = encaissement (comptoir).
update vente
  set commande_le = occurred_at, encaisse_le = occurred_at
  where mode_vente = 'instantane';

-- Précommandes remises : la saisie ÉTAIT la prise de commande, et le modèle
-- historique encaissait à la saisie — l'historique reste vrai.
update vente
  set commande_le = occurred_at, encaisse_le = occurred_at
  where mode_vente = 'precommande' and fulfillment = 'remis';

-- Précommandes ouvertes : commandées, ni livrées ni encaissées
-- (statut_paiement 'du' arrive en 0017).
update vente
  set commande_le = occurred_at, encaisse_le = null
  where mode_vente = 'precommande' and fulfillment <> 'remis';

-- ── 3. Ré-imputation : occurred_at (= livre_le) := instant réel de remise ──
update vente v
  set occurred_at = e.remis_le
  from (
    select vente_id, max(occurred_at) as remis_le
    from fulfillment_event
    where vers = 'remis'
    group by vente_id
  ) e
  where e.vente_id = v.id
    and v.mode_vente = 'precommande'
    and v.fulfillment = 'remis';

-- ── 4. Contrainte et sémantique ─────────────────────────────────────────────
alter table vente alter column commande_le set not null;

comment on column vente.occurred_at is
  'LIVRE_LE — instant de remise/prestation (Europe/Paris). Porte le CA FACTURÉ (v_vente_remise) et toute la saisonnalité de service. Comptoir : posé à l''encaissement (3 dates égales). Précommande : provisoire à la saisie, RÉÉCRIT à la remise par avancerFulfillment. NE PLUS le surcharger d''un autre sens (note Reconnaissance du revenu, 12/07/2026).';
comment on column vente.commande_le is
  'Prise de commande (saisie comptoir, commande web, devis accepté). Borne de départ du cycle de commande.';
comment on column vente.encaisse_le is
  'Entrée d''argent — date du règlement SOLDANT. NULL tant que non soldé (traiteur B2B J+30). Porte le CA ENCAISSÉ (v_encaissement, 0018).';
