-- Atelier ALM — 0038 : web_creer_precommande — nouvelle regle create-or-match (Vague 4).
-- MODIF de RPC EXISTANTE (0030) : STOP + dry-run des scenarios. SEULE la section
-- create-or-match change ; le reste (validation, vente, lignes, prix) est IDENTIQUE.
--
-- Regle : EMAIL prioritaire (inchange). Sur echec email, le TELEPHONE ne rattache QUE
-- si l'email du client trouve est VIDE ou IDENTIQUE (ou si la commande ne donne pas
-- d'email). Si le client trouve par telephone a un email DIFFERENT non vide -> on cree
-- un NOUVEAU client avec le nouvel email, SANS telephone (le telephone reste sur le
-- client d'origine ; l'email fait l'identite ; l'index unique telephone est preserve).
-- Consequences : plus jamais de confirmation au mauvais destinataire, zero ecrasement
-- d'identite. La resolution des DOUBLONS VOLONTAIRES (meme personne, deux emails) viendra
-- de l'espace client authentifie (rapprochement volontaire) ou du chef en fiche client.

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
  v_delai      int;
  v_email      text;
  v_tel_raw    text;
  v_tel        text;
  v_client_id  uuid;
  v_tel_client uuid;   -- 0038 : client trouve par telephone (avant decision de rattachement)
  v_tel_email  text;   -- 0038 : email (normalise) de ce client-la
  v_vente_id   uuid;
  v_total      numeric(10,2) := 0;
  v_n          int := 0;
  rec          record;
  v_prod       produit%rowtype;
  v_montant    numeric(10,2);
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

  -- Backstop delai LU DEPUIS LA CONFIG (fail-closed si la config manque).
  select delai_min_minutes into v_delai from creneau_retrait where actif order by created_at limit 1;
  if v_delai is null then raise exception 'config creneau_retrait absente'; end if;
  if p_due_at is null or p_due_at < now() + (v_delai * interval '1 minute') then
    raise exception 'creneau de retrait trop tot (delai minimum non respecte)';
  end if;

  -- create-or-match : normalisation IDENTIQUE a 0015 (email lower/trim, tel E.164)
  v_email := nullif(lower(trim(p_client->>'email')), '');
  v_tel_raw := regexp_replace(coalesce(p_client->>'telephone',''), '[^0-9+]', '', 'g');
  v_tel := case
    when v_tel_raw ~ '^0[1-9][0-9]{8}$' then '+33' || substr(v_tel_raw, 2)
    when v_tel_raw ~ '^\+[0-9]{8,15}$' then v_tel_raw
    else nullif(v_tel_raw, '')
  end;

  -- 1) EMAIL prioritaire (inchange)
  if v_email is not null then
    select id into v_client_id from client where email is not null and lower(email) = v_email limit 1;
  end if;
  -- 2) TELEPHONE en secours, mais rattachement CONDITIONNEL (pas d'ecrasement d'identite)
  if v_client_id is null and v_tel is not null then
    select id, nullif(lower(trim(email)),'') into v_tel_client, v_tel_email
      from client where telephone = v_tel limit 1;
    if v_tel_client is not null
       and not (v_email is not null and v_tel_email is not null and v_tel_email <> v_email) then
      v_client_id := v_tel_client;   -- email existant vide / identique / commande sans email
    end if;
  end if;
  -- 3) Creation. Si le telephone est DEJA pris (rattachement refuse pour email different),
  --    le nouveau client nait SANS telephone (email = identite ; index unique preserve).
  if v_client_id is null then
    begin
      insert into client (nom, type, email, telephone)
      values (
        coalesce(nullif(trim(p_client->>'nom'),''), 'Client web'), 'particulier', v_email,
        case when v_tel is not null and exists (select 1 from client where telephone = v_tel)
             then null else v_tel end
      )
      returning id into v_client_id;
    exception when unique_violation then     -- course : re-match email prioritaire, puis tel compatible
      if v_email is not null then select id into v_client_id from client where lower(email) = v_email limit 1; end if;
      if v_client_id is null and v_tel is not null then
        select id, nullif(lower(trim(email)),'') into v_tel_client, v_tel_email from client where telephone = v_tel limit 1;
        if v_tel_client is not null
           and not (v_email is not null and v_tel_email is not null and v_tel_email <> v_email) then
          v_client_id := v_tel_client;
        end if;
      end if;
      if v_client_id is null then raise; end if;
    end;
  end if;

  -- Vente (montant provisoire 0, mis a jour apres les lignes ; le tout atomique).
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

-- Rollback : recreer web_creer_precommande version 0030 (match telephone inconditionnel).
