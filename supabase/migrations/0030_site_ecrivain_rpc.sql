-- Atelier ALM — 0030 : role site_ecrivain + RPC d'ecriture (mecanisme d'ecriture site).
-- Vague 2, migration SENSIBLE, EN DERNIER (reference les tables 0024-0026 et les
-- valeurs d'enum 0027-0028, toutes committees avant).
--
-- Posture (comme site_lecteur en 0019, cran au-dessus) : site_ecrivain n'a AUCUN droit
-- sur les tables — seulement EXECUTE sur 4 fonctions SECURITY DEFINER vetees. Un JWT
-- compromis ne peut donc rien inserer d'arbitraire : uniquement appeler ces 4 fonctions.
-- Ecritures ATOMIQUES (une fonction = une transaction). Le prix est RECALCULE en SQL
-- depuis produit (le prix client n'existe jamais). search_path fige (anti-hijack).

create role site_ecrivain nologin;
grant usage on schema public to site_ecrivain;
grant site_ecrivain to authenticator;

-- ── 1. Precommande (boutique + truck) → vente web_a_confirmer + lignes ──────────
create or replace function public.web_creer_precommande(
  p_canal          text,
  p_emplacement_id uuid,
  p_due_at         timestamptz,
  p_moyen_paiement text,
  p_client         jsonb,
  p_lignes         jsonb
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_delai     int;
  v_email     text;
  v_tel_raw   text;
  v_tel       text;
  v_client_id uuid;
  v_vente_id  uuid;
  v_total     numeric(10,2) := 0;
  v_n         int := 0;
  rec         record;
  v_prod      produit%rowtype;
  v_montant   numeric(10,2);
begin
  -- Validation scalaires
  if p_canal not in ('boutique','truck') then raise exception 'canal invalide'; end if;
  if p_moyen_paiement not in ('especes','cb','ticket','virement') then raise exception 'moyen_paiement invalide'; end if;
  if p_canal = 'truck' then
    if p_emplacement_id is null then raise exception 'emplacement requis pour le truck'; end if;
    perform 1 from emplacement where id = p_emplacement_id and actif;
    if not found then raise exception 'emplacement inconnu ou inactif'; end if;
  elsif p_emplacement_id is not null then
    raise exception 'emplacement interdit hors truck';
  end if;

  -- Backstop delai LU DEPUIS LA CONFIG (amendement 1 : jamais une constante en dur ;
  -- fail-closed si la config manque, plutot que retomber sur un nombre magique).
  select delai_min_minutes into v_delai from creneau_retrait where actif order by created_at limit 1;
  if v_delai is null then raise exception 'config creneau_retrait absente'; end if;
  if p_due_at is null or p_due_at < now() + (v_delai * interval '1 minute') then
    raise exception 'creneau de retrait trop tot (delai minimum non respecte)';
  end if;

  -- create-or-match client : normalisation IDENTIQUE a 0015 (email lower/trim, tel E.164)
  v_email := nullif(lower(trim(p_client->>'email')), '');
  v_tel_raw := regexp_replace(coalesce(p_client->>'telephone',''), '[^0-9+]', '', 'g');
  v_tel := case
    when v_tel_raw ~ '^0[1-9][0-9]{8}$' then '+33' || substr(v_tel_raw, 2)
    when v_tel_raw ~ '^\+[0-9]{8,15}$' then v_tel_raw
    else nullif(v_tel_raw, '')
  end;

  if v_email is not null then
    select id into v_client_id from client where email is not null and lower(email) = v_email limit 1;
  end if;
  if v_client_id is null and v_tel is not null then
    select id into v_client_id from client where telephone = v_tel limit 1;
  end if;
  if v_client_id is null then
    begin
      insert into client (nom, type, email, telephone)
      values (coalesce(nullif(trim(p_client->>'nom'),''), 'Client web'), 'particulier', v_email, v_tel)
      returning id into v_client_id;
    exception when unique_violation then       -- course : un autre insert a gagne
      if v_email is not null then select id into v_client_id from client where lower(email) = v_email limit 1; end if;
      if v_client_id is null and v_tel is not null then select id into v_client_id from client where telephone = v_tel limit 1; end if;
      if v_client_id is null then raise; end if;
    end;
  end if;

  -- Vente (montant provisoire 0, mis a jour apres les lignes ; le tout atomique).
  -- source_vente='web', fulfillment='web_a_confirmer', statut_paiement='regle' (B2C,
  -- JAMAIS 'du'), origine 'spontane' (le canal est porte par source_vente), aucun
  -- reglement / mouvement_stock ici (nait au retrait, cote Atelier).
  insert into vente (
    occurred_at, commande_le, encaisse_le, statut_paiement, canal, emplacement_id,
    montant_total, couverts, client_id, moyen_paiement, origine, mode_vente,
    fulfillment, source_vente, due_at
  ) values (
    p_due_at, now(), null, 'regle', p_canal::canal, p_emplacement_id,
    0, null, v_client_id, p_moyen_paiement::paiement, 'spontane'::origine, 'precommande'::mode_vente,
    'web_a_confirmer'::fulfillment, 'web'::source_vente, p_due_at
  ) returning id into v_vente_id;

  -- Lignes : prix RECALCULE depuis produit (actif ET visible_site ET meme canal).
  for rec in select * from jsonb_to_recordset(p_lignes) as x(produit_id uuid, qte int, poids_g int)
  loop
    select * into v_prod from produit
      where id = rec.produit_id and actif and visible_site and canal = p_canal::canal;
    if not found then raise exception 'produit indisponible: %', rec.produit_id; end if;

    if v_prod.mode = 'poids' then
      if rec.poids_g is null or rec.poids_g <= 0 or v_prod.prix_kg is null then raise exception 'poids invalide (%)', v_prod.nom; end if;
      v_montant := round(v_prod.prix_kg * (rec.poids_g / 1000.0), 2);
      insert into vente_ligne (vente_id, type, mode, recette_id, produit_id, libelle, poids_g, prix_kg, montant)
      values (v_vente_id, (case when v_prod.is_bowl then 'bowl' else 'produit' end)::ligne_type, 'poids'::ligne_mode,
              case when v_prod.is_bowl then v_prod.recette_id else null end, v_prod.id, v_prod.nom,
              rec.poids_g, v_prod.prix_kg, v_montant);
    else
      if rec.qte is null or rec.qte <= 0 or v_prod.prix_unitaire is null then raise exception 'quantite invalide (%)', v_prod.nom; end if;
      v_montant := round(v_prod.prix_unitaire * rec.qte, 2);
      insert into vente_ligne (vente_id, type, mode, recette_id, produit_id, libelle, qte, prix_unitaire, montant)
      values (v_vente_id, (case when v_prod.is_bowl then 'bowl' else 'produit' end)::ligne_type, 'unite'::ligne_mode,
              case when v_prod.is_bowl then v_prod.recette_id else null end, v_prod.id, v_prod.nom,
              rec.qte, v_prod.prix_unitaire, v_montant);
    end if;

    v_total := v_total + v_montant;
    v_n := v_n + 1;
  end loop;

  if v_n = 0 then raise exception 'panier vide'; end if;
  update vente set montant_total = v_total where id = v_vente_id;
  return v_vente_id;
end;
$$;

-- ── 2. Demande de devis → table dediee (contact inline, aucun client) ──────────
create or replace function public.web_creer_devis(p_devis jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  if nullif(trim(p_devis->>'contact_nom'),'') is null then raise exception 'nom requis'; end if;
  insert into demande_devis (
    type_evenement, date_evenement, nb_convives, budget_indicatif, description,
    contact_nom, contact_email, contact_telephone
  ) values (
    nullif(trim(p_devis->>'type_evenement'),''),
    (nullif(trim(p_devis->>'date_evenement'),''))::date,
    (nullif(trim(p_devis->>'nb_convives'),''))::int,
    nullif(trim(p_devis->>'budget_indicatif'),''),
    nullif(trim(p_devis->>'description'),''),
    trim(p_devis->>'contact_nom'),
    nullif(lower(trim(p_devis->>'contact_email')),''),
    nullif(trim(p_devis->>'contact_telephone'),'')
  ) returning id into v_id;
  return v_id;
end;
$$;

-- ── 3. Newsletter : inscription (double opt-in, token renvoye au SERVEUR) ───────
create or replace function public.web_inscrire_newsletter(p_email text)
returns table(token uuid, statut text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text;
  v_row   newsletter_abonne%rowtype;
begin
  v_email := nullif(lower(trim(p_email)), '');
  if v_email is null then raise exception 'email requis'; end if;

  select * into v_row from newsletter_abonne where lower(email) = v_email limit 1;
  if found then
    if v_row.statut = 'confirme' then
      return query select null::uuid, 'confirme'::text; return;
    end if;
    -- en_attente ou desabonne : re-armer et renvoyer le token pour un nouvel email
    update newsletter_abonne set statut = 'en_attente', demande_le = now() where id = v_row.id;
    return query select v_row.token, 'en_attente'::text; return;
  end if;

  insert into newsletter_abonne (email) values (v_email) returning * into v_row;
  return query select v_row.token, 'en_attente'::text;
end;
$$;

-- ── 4. Newsletter : confirmation (consentement date au clic) ───────────────────
create or replace function public.web_confirmer_newsletter(p_token uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_row newsletter_abonne%rowtype;
begin
  select * into v_row from newsletter_abonne where token = p_token limit 1;
  if not found then return 'inconnu'; end if;
  if v_row.statut = 'confirme' then return 'deja'; end if;
  update newsletter_abonne set statut = 'confirme', consentement_le = now(), confirme_le = now() where id = v_row.id;
  return 'confirme';
end;
$$;

-- ── 5. Grants : EXECUTE reserve a site_ecrivain, retire a public ────────────────
revoke all on function public.web_creer_precommande(text,uuid,timestamptz,text,jsonb,jsonb) from public;
revoke all on function public.web_creer_devis(jsonb) from public;
revoke all on function public.web_inscrire_newsletter(text) from public;
revoke all on function public.web_confirmer_newsletter(uuid) from public;
grant execute on function public.web_creer_precommande(text,uuid,timestamptz,text,jsonb,jsonb) to site_ecrivain;
grant execute on function public.web_creer_devis(jsonb) to site_ecrivain;
grant execute on function public.web_inscrire_newsletter(text) to site_ecrivain;
grant execute on function public.web_confirmer_newsletter(uuid) to site_ecrivain;

-- Rollback :
--   drop function public.web_creer_precommande(text,uuid,timestamptz,text,jsonb,jsonb);
--   drop function public.web_creer_devis(jsonb);
--   drop function public.web_inscrire_newsletter(text);
--   drop function public.web_confirmer_newsletter(uuid);
--   revoke site_ecrivain from authenticator;
--   revoke usage on schema public from site_ecrivain;
--   drop role site_ecrivain;
