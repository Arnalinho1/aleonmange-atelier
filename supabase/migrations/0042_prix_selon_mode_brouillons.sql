-- Atelier ALM - 0042 : relache prix_selon_mode pour autoriser les BROUILLONS sans prix.
--
-- Contexte : l'import du catalogue chefs (0041) pose des produits en brouillons
-- INVISIBLES ; les 45 produits boutique n'ont pas encore de prix (les chefs les
-- saisiront dans l'Atelier). L'ancienne prix_selon_mode EXIGEAIT un prix pour TOUT
-- produit (mode -> sa colonne de prix NOT NULL), ce qui interdisait tout brouillon.
--
-- Nouvelle regle : le MODE choisit la colonne de prix et INTERDIT l'autre, mais
-- AUTORISE la colonne du mode a etre NULL (brouillon). Le garde-fou fort est desormais
-- porte par produit_visible_requiert_prix (0041) : un produit VISIBLE a toujours un prix.
--
-- Couple de contraintes (invariant global preserve) :
--   prix_selon_mode              = coherence mode <-> colonne de prix (jamais la colonne de l'autre mode).
--   produit_visible_requiert_prix = un produit VISIBLE a toujours un prix.
-- => un produit visible a un prix CORRECT pour son mode ; seul un brouillon INVISIBLE
--    peut etre sans prix. Les 101 lignes demo passent (verifie au dry-run avant apply).

alter table public.produit drop constraint prix_selon_mode;

alter table public.produit
  add constraint prix_selon_mode
  check ((mode = 'unite'::ligne_mode and prix_kg is null) or (mode = 'poids'::ligne_mode and prix_unitaire is null));

-- Rollback (restaure la version stricte d'origine) :
--   alter table public.produit drop constraint prix_selon_mode;
--   alter table public.produit add constraint prix_selon_mode
--     check ((mode='unite'::ligne_mode and prix_unitaire is not null) or (mode='poids'::ligne_mode and prix_kg is not null));
