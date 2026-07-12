/**
 * Types de la base Atelier ALM — alignés sur supabase/migrations/*.
 * Écrits à la main (la base dédiée n'est pas encore branchée). À terme,
 * régénérables via `supabase gen types typescript`.
 *
 * IMPORTANT : les lignes sont des alias `type` (et non `interface`). postgrest-js
 * exige que chaque Row/Insert soit assignable à `Record<string, unknown>` ; or une
 * `interface` n'a pas de signature d'index implicite et casse l'inférence (Insert
 * résolu en `never`). Les `type` l'ont — ne pas reconvertir en interface.
 */

export type Canal = "truck" | "boutique" | "traiteur";
export type ModeVente = "instantane" | "precommande";
export type Fulfillment = "a_produire" | "en_prod" | "pret" | "remis";
export type Paiement = "especes" | "cb" | "ticket" | "virement";
export type Origine = "spontane" | "insta" | "tiktok" | "facebook" | "code";
export type LigneType = "bowl" | "produit" | "formule";
export type LigneMode = "unite" | "poids";
export type CategorieComposant = "proteine" | "feculent" | "legume" | "sauce";
export type SourceVente = "manuel" | "import";
export type RoleEquipe = "owner" | "chef" | "equipe";

export type Emplacement = {
  id: string;
  code: string;
  libelle: string;
  jour_semaine: number | null;
  actif: boolean;
  created_at: string;
};

export type Composant = {
  id: string;
  nom: string;
  categorie: CategorieComposant;
  cout_matiere_kg: number | null;
  /** Unité de STOCK (kg | piece | l) — les coûts restent en €/kg (recettes en g). */
  unite: string;
  /** Poids d'UNE pièce en g (unite=piece) — conversion des sorties recettes ; NULL = non convertible (0012). */
  poids_piece_g: number | null;
  actif: boolean;
  created_at: string;
};

export type Recette = {
  id: string;
  nom: string;
  rendement: number | null;
  etapes: unknown;
  /** Temps du BATCH en minutes, assemblage inclus — DÉCLARATIF (métrique estimée) ; NULL = non défini (0014). */
  temps_prepa_min: number | null;
  is_virtuelle: boolean;
  actif: boolean;
  created_at: string;
};

export type RecetteComposant = {
  id: string;
  recette_id: string;
  composant_id: string;
  quantite: number | null;
  categorie: CategorieComposant;
};

export type Produit = {
  id: string;
  nom: string;
  categorie: string | null;
  canal: Canal;
  mode: LigneMode;
  prix_unitaire: number | null;
  prix_kg: number | null;
  /** Coût d'achat d'un REVENDU — €/pièce (unite) ou €/kg (poids) ; la fiche reste prioritaire (0013). */
  cout_achat: number | null;
  is_bowl: boolean;
  recette_id: string | null;
  actif: boolean;
  created_at: string;
};

export type Client = {
  id: string;
  nom: string;
  type: string | null;
  /** Identifiant de rapprochement PRIORITAIRE — unique si renseigné, normalisé minuscules/trim (0015). */
  email: string | null;
  /** Identifiant de rapprochement SECOURS — unique si renseigné, normalisé E.164 (0015). */
  telephone: string | null;
  code_postal: string | null;
  notes: string | null;
  /** Consentement marketing RGPD — toujours daté par consentement_le (0015). */
  consentement_marketing: boolean;
  consentement_le: string | null;
  /** Adresse postale — mentions de facturation B2B (0015). */
  adresse: string | null;
  /** SIRET (clients pro, facturation B2B) — optionnel (0015). */
  siret: string | null;
  actif: boolean;
  created_at: string;
};

export type Profil = {
  id: string;
  nom: string;
  role: RoleEquipe;
  actif: boolean;
  created_at: string;
};

/** Machine d'état du RÈGLEMENT — indépendante du fulfillment (livré ≠ réglé). 'du' = créance traiteur B2B uniquement. */
export type StatutPaiement = "regle" | "du" | "partiel";

export type Vente = {
  id: string;
  /** LIVRE_LE — instant de remise/prestation (0016). Porte le CA FACTURÉ et la saisonnalité de service. Précommande : provisoire à la saisie, RÉÉCRIT à la remise. */
  occurred_at: string;
  canal: Canal;
  emplacement_id: string | null;
  montant_total: number;
  couverts: number | null;
  client_id: string | null;
  moyen_paiement: Paiement;
  origine: Origine;
  mode_vente: ModeVente;
  fulfillment: Fulfillment;
  source_vente: SourceVente;
  /** Échéance de remise (précommande) — jour/créneau des Commandes. NULL si instantané. */
  due_at: string | null;
  /** Prise de commande (0016) — borne de départ du cycle de commande. */
  commande_le: string;
  /** Entrée d'argent — date du règlement SOLDANT. NULL tant que non soldé (0016). */
  encaisse_le: string | null;
  statut_paiement: StatutPaiement;
  /** Échéance de PAIEMENT (traiteur B2B : remise + 30 j) — DISTINCTE de due_at (0017). */
  echeance_paiement: string | null;
  created_at: string;
};

/** Un règlement = un événement de trésorerie (0017) — source de v_encaissement. */
export type Reglement = {
  id: string;
  vente_id: string;
  montant: number;
  encaisse_le: string;
  moyen_paiement: Paiement;
  note: string | null;
  created_at: string;
};

export type Lot = {
  id: string;
  composant_id: string;
  numero: string | null;
  dlc: string | null;
  quantite: number | null;
  recu_le: string | null;
  created_at: string;
};

/** Mouvement de stock — quantite SIGNÉE (réception +, sortie −, ajustement ±). */
export type MouvementStock = {
  id: string;
  composant_id: string;
  lot_id: string | null;
  type: string; // 'reception' | 'ajustement' | 'sortie'
  quantite: number;
  occurred_at: string;
  note: string | null;
  created_at: string;
};

export type SeuilStock = {
  composant_id: string;
  seuil_bas: number | null;
};

export type ReleveHaccp = {
  id: string;
  type: string; // 'temperature' | 'nettoyage' | 'controle'
  cible: string | null;
  valeur: number | null;
  conforme: boolean | null;
  lot_id: string | null;
  note: string | null;
  occurred_at: string;
  operateur_id: string | null;
  created_at: string;
};

/** Préférences PERSONNELLES (RLS owner-only) — une source, plusieurs lecteurs. */
export type UserPreference = {
  profil_id: string;
  canal_defaut: "ask" | Canal;
  ecran_accueil: "dashboard" | "sale" | "orders";
  updated_at: string;
};

/** Liste de courses persistée — une ligne vivante par composant (0011). */
export type ReapproLigne = {
  id: string;
  composant_id: string;
  qte_retenue: number | null;
  fournisseur: string | null;
  commande: boolean;
  date_liste: string;
  created_at: string;
};

export type NotificationPreference = {
  id: string;
  profil_id: string;
  categorie: string; // 'stock' | 'dlc' | 'seuil' | 'traiteur'
  in_app: boolean;
  email: boolean;
};

export type SocialPost = {
  id: string;
  reseau: string; // 'insta' | 'tiktok' | 'facebook'
  emplacement_id: string | null;
  contenu: string | null;
  statut: string; // 'brouillon' | 'programme' | 'publie'
  programme_le: string | null;
  publie_le: string | null;
  created_at: string;
};

export type ImportMapping = {
  id: string;
  nom: string;
  separateur: string;
  /** Mapping colonne CSV → champ modèle — entièrement paramétrable (jamais figé). */
  colonnes: unknown;
  actif: boolean;
  created_at: string;
};

export type ImportBatch = {
  id: string;
  mapping_id: string | null;
  fichier_nom: string | null;
  lignes_total: number | null;
  lignes_valides: number | null;
  statut: string; // 'brouillon' | 'valide'
  jour_exploitation: string | null;
  created_at: string;
};

/** Singleton (id=true) — charges par portion pour la marge nette (Finances). */
export type ParametreRentabilite = {
  id: boolean;
  mo_par_portion: number | null;
  transport_par_portion: number | null;
  updated_at: string;
};

/** Transition horodatée du cycle de production — source des cadences (Productivité). */
export type FulfillmentEvent = {
  id: string;
  vente_id: string;
  de: Fulfillment;
  vers: Fulfillment;
  occurred_at: string;
  operateur_id: string | null;
  created_at: string;
};

export type VenteLigne = {
  id: string;
  vente_id: string;
  type: LigneType;
  mode: LigneMode;
  recette_id: string | null;
  produit_id: string | null;
  libelle: string;
  poids_g: number | null;
  prix_kg: number | null;
  qte: number | null;
  prix_unitaire: number | null;
  montant: number;
};

export type VenteLigneComposant = {
  id: string;
  ligne_id: string;
  composant_id: string;
  categorie: CategorieComposant;
  /** Grammes TOTAUX de la ligne pour ce composant, figés à l'encaissement (0012). NULL avant B8. */
  quantite_g: number | null;
};

export type Insight = {
  id: string;
  urgence: string;
  impact: number | null;
  objectif: string | null;
  constat: string;
  chiffre: string | null;
  action: string | null;
  action_ecran: string | null;
  origine_calcul: string;
  statut: string;
  created_at: string;
};

export type Notification = {
  id: string;
  categorie: string;
  severite: string;
  titre: string;
  description: string | null;
  ecran: string | null;
  lu: boolean;
  occurred_at: string;
  created_at: string;
};

/**
 * Insert = colonnes `Req` obligatoires, tout le reste optionnel (auto / nullable /
 * à défaut base). Pratique et fidèle aux CHECK/defaults des migrations.
 */
type MakeInsert<Row, Req extends keyof Row> = { [K in Req]: Row[K] } & {
  [K in Exclude<keyof Row, Req>]?: Row[K] | undefined;
};

type TableDef<TRow, TInsert> = {
  Row: TRow;
  Insert: TInsert;
  Update: Partial<TInsert>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      emplacement: TableDef<Emplacement, MakeInsert<Emplacement, "code" | "libelle">>;
      composant: TableDef<Composant, MakeInsert<Composant, "nom" | "categorie">>;
      recette: TableDef<Recette, MakeInsert<Recette, "nom">>;
      recette_composant: TableDef<RecetteComposant, MakeInsert<RecetteComposant, "recette_id" | "composant_id" | "categorie">>;
      produit: TableDef<Produit, MakeInsert<Produit, "nom" | "canal" | "mode">>;
      client: TableDef<Client, MakeInsert<Client, "nom">>;
      profil: TableDef<Profil, MakeInsert<Profil, "id" | "nom">>;
      vente: TableDef<Vente, MakeInsert<Vente, "occurred_at" | "canal" | "montant_total" | "moyen_paiement" | "mode_vente" | "fulfillment" | "commande_le">>;
      reglement: TableDef<Reglement, MakeInsert<Reglement, "vente_id" | "montant" | "moyen_paiement">>;
      vente_ligne: TableDef<VenteLigne, MakeInsert<VenteLigne, "vente_id" | "type" | "mode" | "libelle" | "montant">>;
      vente_ligne_composant: TableDef<VenteLigneComposant, MakeInsert<VenteLigneComposant, "ligne_id" | "composant_id" | "categorie">>;
      fulfillment_event: TableDef<FulfillmentEvent, MakeInsert<FulfillmentEvent, "vente_id" | "de" | "vers">>;
      parametre_rentabilite: TableDef<ParametreRentabilite, MakeInsert<ParametreRentabilite, never>>;
      lot: TableDef<Lot, MakeInsert<Lot, "composant_id">>;
      mouvement_stock: TableDef<MouvementStock, MakeInsert<MouvementStock, "composant_id" | "type" | "quantite">>;
      seuil_stock: TableDef<SeuilStock, MakeInsert<SeuilStock, "composant_id">>;
      reappro_ligne: TableDef<ReapproLigne, MakeInsert<ReapproLigne, "composant_id">>;
      releve_haccp: TableDef<ReleveHaccp, MakeInsert<ReleveHaccp, "type">>;
      notification_preference: TableDef<NotificationPreference, MakeInsert<NotificationPreference, "profil_id" | "categorie">>;
      user_preference: TableDef<UserPreference, MakeInsert<UserPreference, "profil_id">>;
      social_post: TableDef<SocialPost, MakeInsert<SocialPost, "reseau">>;
      import_mapping: TableDef<ImportMapping, MakeInsert<ImportMapping, "nom">>;
      import_batch: TableDef<ImportBatch, MakeInsert<ImportBatch, never>>;
      insight: TableDef<Insight, MakeInsert<Insight, "urgence" | "constat">>;
      notification: TableDef<Notification, MakeInsert<Notification, "categorie" | "titre">>;
    };
    Views: {
      /** CA FACTURÉ — ventes remises, imputées à occurred_at (= livre_le). Colonnes 0016-0017 exposées en fin (0018). */
      v_vente_remise: { Row: Omit<Vente, "fulfillment" | "created_at">; Relationships: [] };
      v_commande_ouverte: { Row: Vente; Relationships: [] };
      /** CA ENCAISSÉ — un événement de trésorerie par règlement, imputé à encaisse_le (0018). */
      v_encaissement: {
        Row: Omit<Reglement, "created_at"> & Pick<Vente, "canal" | "emplacement_id" | "client_id" | "mode_vente" | "source_vente">;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      canal: Canal;
      mode_vente: ModeVente;
      fulfillment: Fulfillment;
      paiement: Paiement;
      origine: Origine;
      ligne_type: LigneType;
      ligne_mode: LigneMode;
      categorie_composant: CategorieComposant;
      source_vente: SourceVente;
      role_equipe: RoleEquipe;
    };
    CompositeTypes: Record<string, never>;
  };
};
