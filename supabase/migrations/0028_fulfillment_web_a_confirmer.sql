-- Atelier ALM — 0028 : fulfillment += 'web_a_confirmer' (enum du pipeline de vente).
-- Vague 2, migration SENSIBLE. Etat de creation d'une commande web : elle attend la
-- confirmation MANUELLE du chef (garde-fou anti-abus V1). Une commande web_a_confirmer
-- ne reserve pas de matiere et n'entre dans aucun agregat (exclusion en 0029).
--
-- Deux Record<Fulfillment> exhaustifs cassent a la COMPILATION cote Atelier
-- (OrdersQueue.tsx) : c'est VOULU (erreur bruyante, jamais silencieuse) — corrige en
-- Phase B. Aucune rupture SQL : v_vente_remise (WHERE remis) reste sur.
--
-- Meme NUANCE POSTGRES que 0027 (ADD VALUE utilisable seulement apres commit) : la
-- 0029, qui REFERENCE 'web_a_confirmer' dans la vue, exige CETTE migration DEJA COMMITEE.

alter type fulfillment add value if not exists 'web_a_confirmer';

-- Rollback : idem 0027 (pas de DROP VALUE sur un enum). Valeur inerte tant que rien
-- ne l'ecrit. Retour arriere reel = recreer le type (lourd). Ne rien ecrire avec
-- avant la fin de la serie.
