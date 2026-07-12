-- Atelier ALM — Migration 0009 (décisions base, Contrat §06).
--
-- 1) composant.unite : unité de STOCK (kg | piece | l) — affichage de l'écran
--    Stocks. Les coûts restent en cout_matiere_kg (€/kg) : les recettes sont
--    exprimées en grammes, y compris pour les composants à la pièce/au litre,
--    donc lib/calculs.ts est inchangé.
--
-- 2) notification.created_at : heure d'insertion TECHNIQUE (≠ occurred_at,
--    qui porte l'instant métier de l'alerte). Aligne la table sur le reste du
--    schéma et rend possible une purge par borne temporelle.

alter table composant
  add column unite text not null default 'kg'
  check (unite in ('kg', 'piece', 'l'));

comment on column composant.unite is
  'Unité de stock (kg | piece | l) — affichage Stocks. Coûts toujours en €/kg (recettes en grammes).';

alter table notification
  add column created_at timestamptz not null default now();

comment on column notification.created_at is
  'Heure d''insertion technique (≠ occurred_at métier) — borne des purges temporelles.';
