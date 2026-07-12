-- Atelier ALM — SEED MINIMAL (le seul autorisé et requis — HANDOFF §01-A).
-- Autorisé : enums (0001), les 3 emplacements truck RÉELS, un compte propriétaire.
-- INTERDIT : aucun produit, aucune vente, aucun stock, aucun insight. Le reste naît vide.

-- Les 3 emplacements truck réels (référentiel éditable — modifiables ensuite en Réglages).
insert into emplacement (code, libelle, jour_semaine, actif) values
  ('oingt',    'Marché du Bois d''Oingt', 2, true),  -- mardi
  ('tassin',   'Tassin-la-Demi-Lune',     3, true),  -- mercredi
  ('salvagny', 'La Tour-de-Salvagny',     4, true)   -- jeudi
on conflict (code) do nothing;

-- Compte propriétaire :
-- Le profil référence auth.users → il ne peut exister sans un compte Auth.
-- Le trigger handle_new_user (0002) crée automatiquement le profil au 1er
-- inscrit et lui attribue le rôle 'owner'. Donc : la 1re inscription via
-- Supabase Auth (Arnaud) devient le propriétaire. Rien à seeder ici pour Auth
-- (création d'un utilisateur auth.users à faire via l'app / le dashboard Supabase).
