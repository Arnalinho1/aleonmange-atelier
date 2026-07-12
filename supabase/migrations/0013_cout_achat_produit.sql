-- Atelier ALM — Migration 0013 : coût d'achat des produits REVENDUS.
--
-- Le coût matière vit sur les fiches (composant.cout_matiere_kg) — mais les
-- revendus tels quels (boissons, épicerie, charcuterie à la coupe) n'ont pas
-- de fiche : leur coût était INCONNU (58 % du CA boutique couvert seulement).
-- cout_achat comble ce trou. Interprété dans l'UNITÉ DE VENTE du produit,
-- symétrique de prix_unitaire/prix_kg : €/pièce si mode unite, €/kg si poids.
-- La fiche reste PRIORITAIRE quand elle existe (source unique calculs.ts).

alter table produit
  add column cout_achat numeric(8, 2);

comment on column produit.cout_achat is
  'Coût d''achat d''un produit REVENDU (sans fiche) — €/pièce si mode unite, €/kg si mode poids. La fiche liée reste prioritaire pour le coût matière. NULL = coût inconnu (compte dans l''indicateur de couverture).';
