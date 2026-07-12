-- Atelier ALM — Seed démo (12/07/2026) : cout_achat (0013) + temps_prepa_min (0014).
-- Valeurs PLAUSIBLES pour que Productivité (coût consommé, temps estimé) soit
-- vivante en démo. Référentiel uniquement — le transactionnel n'est pas touché
-- (la borne de purge démo reste valide). Appliqué en supervisé via management API.

-- ── Coût d'achat des 28 produits revendus sans fiche ─────────────────────────
-- Unité (€/pièce ≈ 35-45 % du prix) · Poids (€/kg ≈ 55-65 % du prix/kg).
update produit p set cout_achat = v.cout
from (values
  ('Bouteille eau 50cl',            0.40),
  ('Canette soda 33cl',             0.80),
  ('Cookie',                        0.90),
  ('Fruit de saison',               0.55),
  ('Yaourt fermier',                0.85),
  ('Barre cereales',                0.80),
  ('Biere artisanale 33cl',         1.90),
  ('Compote a boire',               0.70),
  ('Crackers apero',                1.60),
  ('Fromage blanc fermier',         1.20),
  ('Jus de fruits artisanal 25cl',  1.40),
  ('Limonade artisanale 33cl',      1.55),
  ('Madeleine (sachet)',            1.45),
  ('Paquet chips',                  1.00),
  ('Sachet bonbons',                1.10),
  ('Tablette chocolat artisanal',   2.70),
  ('Chorizo',                      17.50),
  ('Coppa',                        26.00),
  ('Jambon blanc a la coupe',      13.50),
  ('Jambon cru',                   25.00),
  ('Pate en croute',               19.50),
  ('Rosette a la coupe',           16.50),
  ('Saucisson sec',                18.00),
  ('Terrine de campagne',          14.50)
) as v(nom, cout)
where p.nom = v.nom and p.recette_id is null;

-- ── Temps de préparation des fiches (min, PAR BATCH, assemblage inclus) ─────
-- rendement 1 partout sauf Chouquette (x3) et Tomates farcies (x2) → le temps
-- est celui du batch (le /portion se déduit par ÷ rendement).
update recette r set temps_prepa_min = v.temps
from (values
  ('Bowl poulet', 7), ('Bowl saumon', 7), ('Bowl vegetarien', 6),
  ('Poke boeuf', 7), ('Salade Cesar', 6),
  ('Gratin de coquillettes au jambon (part)', 12), ('Gratin de courgettes', 12),
  ('Gratin de pommes de terre', 14), ('Lasagnes (part)', 15),
  ('Lasagnes bolognaise (part)', 15), ('Moussaka (part)', 15),
  ('Parmentier de boeuf (part)', 13), ('Quiche lorraine (part)', 12),
  ('Curry de legumes riz', 10), ('Paupiette sauce champignons', 12),
  ('Cordon bleu', 10), ('Croque-monsieur', 6), ('Sandwich poulet crudites', 5),
  ('Wrap saumon', 5), ('Riz pilaf', 8), ('Puree maison', 8),
  ('Poelee de legumes', 8), ('Ratatouille', 12), ('Lentilles mijotees', 10),
  ('Tian de legumes', 12), ('Artichauts a la barigoule', 12),
  ('Tomates farcies (x2)', 20), ('Champignons a l''ail', 6),
  ('Poivrons grilles', 6), ('Carottes rapees', 4), ('Salade piemontaise', 6),
  ('Taboule', 5),
  ('Arancini', 5), ('Beignet de courgette', 4),
  ('Blinis saumon creme citronnee', 4), ('Brochette de fruits', 3),
  ('Canape jambon cru', 3), ('Croquette de fromage', 4),
  ('Feuillete saucisse', 4), ('Gougere au fromage', 4), ('Mini bagel thon', 4),
  ('Mini brochette poulet curry', 4), ('Mini burger', 5),
  ('Mini club sandwich', 4), ('Mini croque-monsieur', 4), ('Mini hot dog', 4),
  ('Mini nem', 4), ('Mini pizza', 4), ('Mini quiche legumes', 4),
  ('Mini quiche lorraine', 4), ('Mini wrap poulet', 4), ('Oeuf mimosa', 3),
  ('Pique tomate mozzarella', 2), ('Roule au saumon', 3),
  ('Samoussa legumes', 4), ('Verrine avocat crevette', 4),
  ('Verrine houmous', 3), ('Verrine saumon', 4), ('Mini tartelette fruits', 5),
  ('Mini brownie', 3), ('Mini cheesecake', 4), ('Mini eclair chocolat', 5),
  ('Verrine panna cotta', 4), ('Verrine tiramisu', 4),
  ('Cannele', 6), ('Financier amande', 5), ('Chouquette (x3)', 6),
  ('Houmous', 4), ('Tzatziki', 4), ('Tapenade d''olives noires', 4),
  ('Caviar d''aubergine', 5), ('Rillettes de saumon', 5)
) as v(nom, temps)
where r.nom = v.nom and r.actif;
