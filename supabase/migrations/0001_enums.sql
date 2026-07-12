-- Atelier ALM — Enums (Contrat de données §04, valeurs figées)
-- Clés = valeurs stockées (stables, jamais traduites). Libellés FR = côté front.
-- Décision base (Contrat §06) : types Postgres natifs pour les jeux figés.
-- NOTE : `emplacement` n'est PAS un enum → table de référentiel éditable (0002).

create type canal as enum ('truck', 'boutique', 'traiteur');

create type mode_vente as enum ('instantane', 'precommande');

create type fulfillment as enum ('a_produire', 'en_prod', 'pret', 'remis');

create type paiement as enum ('especes', 'cb', 'ticket', 'virement');

create type origine as enum ('spontane', 'insta', 'tiktok', 'facebook', 'code');

create type ligne_type as enum ('bowl', 'produit', 'formule');

-- Exactement 2 modes de tarification (portion + tailles S/M/L retirés du modèle).
create type ligne_mode as enum ('unite', 'poids');

create type categorie_composant as enum ('proteine', 'feculent', 'legume', 'sauce');

create type source_vente as enum ('manuel', 'import');
