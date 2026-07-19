-- Atelier ALM — 0027 : source_vente += 'web' (enum du pipeline de vente).
-- Vague 2, migration SENSIBLE (enum du pipeline d'un site EN PRODUCTION).
-- Ajout ADDITIF d'une valeur : les ventes web porteront source_vente='web'.
--
-- Aucun lecteur ne casse : aucun Record<SourceVente> exhaustif n'existe (verifie) ;
-- productivite.ts filtre `!= 'import'` → 'web' traite comme manuel (sans effet cette
-- vague, ces lecteurs lisant v_vente_remise = remis, jamais web_a_confirmer).
--
-- NUANCE POSTGRES : ALTER TYPE ADD VALUE est acceptee en transaction (PG12+) et le
-- rollback la retire, MAIS la valeur ne peut pas etre UTILISEE dans la meme
-- transaction. Le dry-run verifie donc seulement le DDL ; la verif « on peut caster
-- 'web'::source_vente » se fait APRES le commit.

alter type source_vente add value if not exists 'web';

-- Rollback : une valeur d'enum ne se retire pas via ALTER TYPE (pas de DROP VALUE).
-- La valeur est INERTE tant que rien ne l'ecrit. Retour arriere reel = recreer le
-- type source_vente sans 'web' (lourd : drop des dependances) — a n'envisager que si
-- rien ne l'a jamais utilisee. En pratique : ne rien ecrire avec avant que la serie
-- soit complete ; sinon Instant Rollback Vercel + non-usage suffisent.
