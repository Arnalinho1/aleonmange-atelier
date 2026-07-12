-- Atelier ALM — Migration 0012 : déduction de stock à la vente (B8).
--
-- CONSOMMÉ = mouvements réels « sortie » écrits à la REMISE (vente instantanée
-- ou passage à remis). RÉSERVÉ = calcul dynamique sur les commandes ouvertes
-- (aucun mouvement — toujours juste sans mécanique de dé-réservation).
--
-- 1) Le dépliage d'un bowl porte ses grammes FIGÉS à l'encaissement :
--    la fiche peut changer ensuite, l'historique reste vrai.
alter table vente_ligne_composant
  add column quantite_g numeric(10, 2);
comment on column vente_ligne_composant.quantite_g is
  'Grammes TOTAUX de la ligne pour ce composant (qte × grammes fiche), figés à l''encaissement. NULL sur l''historique antérieur à B8 (fallback fiche).';

-- 2) Conversion grammes → pièces pour les composants suivis à la pièce
--    (œuf ≈ 50 g…). Sans poids renseigné : pas de sortie automatique,
--    badge « poids à renseigner » sur l'écran Stocks.
alter table composant
  add column poids_piece_g numeric(10, 2);
comment on column composant.poids_piece_g is
  'Poids d''UNE pièce en grammes (composants unite=piece) — requis pour convertir les sorties recettes (g) en pièces.';
