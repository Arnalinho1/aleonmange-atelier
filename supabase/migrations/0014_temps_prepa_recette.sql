-- Atelier ALM — Migration 0014 : temps de préparation déclaratif des fiches.
--
-- Ouvre la métrique « temps de production estimé » de Productivité :
-- temps PAR BATCH de la fiche, ASSEMBLAGE INCLUS (décision Arnaud — pas de
-- forfait d'assemblage séparé pour les bowls). Temps par portion = temps ÷
-- rendement (même mécanique que le coût). Valeur DÉCLARATIVE chef → la
-- métrique est toujours affichée ESTIMÉE, jamais « réelle ».
-- NULL = « temps non défini » (affiché tel quel, jamais 0 silencieux).

alter table recette
  add column temps_prepa_min numeric(6, 1);

comment on column recette.temps_prepa_min is
  'Temps de préparation du BATCH de la fiche, en minutes, assemblage inclus (déclaratif chef — métrique ESTIMÉE). Temps/portion = temps ÷ rendement. NULL = temps non défini.';
