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
export type Fulfillment = "a_produire" | "en_prod" | "pret" | "remis" | "web_a_confirmer";
export type Paiement = "especes" | "cb" | "ticket" | "virement";
export type Origine = "spontane" | "insta" | "tiktok" | "facebook" | "code";
export type LigneType = "bowl" | "produit" | "formule";
export type LigneMode = "unite" | "poids";
export type CategorieComposant = "proteine" | "feculent" | "legume" | "sauce";
export type SourceVente = "manuel" | "import" | "web";
export type RoleEquipe = "owner" | "chef" | "equipe";

export type Emplacement = {
  id: string;
  code: string;
  libelle: string;
  jour_semaine: number | null;
  /** Precisions affichees par le SITE PUBLIC (0022) — saisie Reglages, NULL = non renseigne. */
  ville: string | null;
  lieu: string | null;
  /** Horaire de service affiche par le site — NULL = amplitude par defaut du site (0022). */
  horaire_service: string | null;
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
  /** Description affichee par le SITE PUBLIC sous le nom du produit (0020) — NULL = rien d'affiche. */
  description: string | null;
  /** Visibilite sur le SITE PUBLIC (0020) — le site lit actif AND visible_site ; sans effet sur la vente. */
  visible_site: boolean;
  actif: boolean;
  created_at: string;
};

/** Famille de carte du SITE PUBLIC (0021) — ordre + note par canal, rapprochee de produit.categorie par (canal, nom). */
export type FamilleCarte = {
  id: string;
  canal: Canal;
  nom: string;
  note: string | null;
  ordre: number;
  actif: boolean;
  created_at: string;
};

/** Horaires boutique du SITE PUBLIC (0023) — 1 ligne par jour (1=lundi … 7=dimanche), plages nulles = ferme. */
export type HoraireBoutique = {
  id: string;
  jour: number;
  plage1_debut: string | null;
  plage1_fin: string | null;
  plage2_debut: string | null;
  plage2_fin: string | null;
  created_at: string;
};

/** Config du click & collect (0024) — creneaux derives : horaires d'ouverture INTERSECTES [now+delai, now+horizon] par pas. */
export type CreneauRetrait = {
  id: string;
  pas_minutes: number;
  delai_min_minutes: number;
  horizon_jours: number;
  plage_debut: string | null;
  plage_fin: string | null;
  actif: boolean;
  created_at: string;
};

/** Demande de devis traiteur depuis le site (0025) — contact INLINE, aucun client cree tant que non transformee (Vague 3). */
export type DemandeDevis = {
  id: string;
  type_evenement: string | null;
  date_evenement: string | null;
  nb_convives: number | null;
  budget_indicatif: string | null;
  description: string | null;
  contact_nom: string;
  contact_email: string | null;
  contact_telephone: string | null;
  statut: string;
  client_id: string | null;
  created_at: string;
};

/** Inscription newsletter (0026) — double opt-in : consentement_le NULL tant que statut='en_attente' (RGPD). */
export type NewsletterAbonne = {
  id: string;
  email: string;
  token: string;
  statut: string;
  consentement_le: string | null;
  demande_le: string;
  confirme_le: string | null;
  created_at: string;
};

/** Intention « Panier frais » teasing (0043) — double opt-in STRICT propre + vote facultatif. */
export type PanierFraisIntention = {
  id: string;
  email: string;
  taille: string | null;
  rythme: string | null;
  contenu: string | null;
  source: string;
  token: string;
  statut: string;
  consentement_le: string | null;
  demande_le: string;
  confirme_le: string | null;
  created_at: string;
};

/** Paramètres site (0043) — singleton, flag de pilotage du bloc « Panier frais » (OFF par défaut). */
export type ParametreSite = {
  id: boolean;
  panier_frais_teasing_actif: boolean;
  updated_le: string;
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
  /** Compte Supabase Auth rattaché (espace client, 0036) — NULL = pas de compte, UNIQUE. */
  auth_user_id: string | null;
  /** Opt-in fidélité RGPD (0037) — les passages comptent à partir de fidelite_opt_in_le. */
  fidelite_opt_in: boolean;
  fidelite_opt_in_le: string | null;
  actif: boolean;
  created_at: string;
};

/** Paramètres fidélité (0037) — singleton, seuil + récompense configurables. */
export type ParametreFidelite = {
  id: boolean;
  seuil: number;
  recompense: string;
  actif: boolean;
  updated_le: string;
};

/** Rachat de récompense (0037) — trace ; le compteur reste DÉRIVÉ. */
export type FideliteRedemption = {
  id: string;
  client_id: string;
  cree_le: string;
  operateur_id: string | null;
};

/** Vue dérivée (0037) : compteur fidélité, JAMAIS stocké. */
export type VFideliteClient = {
  client_id: string;
  passages: number;
  recompenses_utilisees: number;
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
  /** Rattachement manuel APRÈS COUP d'une vente anonyme à un client (0044) — documentaire : v_fidelite_client ignore les ventes marquées. NULL = client posé à la saisie. Seules les ventes marquées sont détachables. */
  client_rattache_le: string | null;
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
  /** Refus chef d'une commande web (0031). NULL = non refusée. Le fulfillment reste web_a_confirmer ; tout lecteur de web_a_confirmer filtre refuse_le. */
  refuse_le: string | null;
  /** Motif du refus (code + détail interne éventuel, 0031). L'email client n'expose qu'une phrase douce. */
  motif_refus: string | null;
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
      famille_carte: TableDef<FamilleCarte, MakeInsert<FamilleCarte, "canal" | "nom">>;
      horaire_boutique: TableDef<HoraireBoutique, MakeInsert<HoraireBoutique, "jour">>;
      creneau_retrait: TableDef<CreneauRetrait, MakeInsert<CreneauRetrait, never>>;
      demande_devis: TableDef<DemandeDevis, MakeInsert<DemandeDevis, "contact_nom">>;
      newsletter_abonne: TableDef<NewsletterAbonne, MakeInsert<NewsletterAbonne, "email">>;
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
      parametre_fidelite: TableDef<ParametreFidelite, MakeInsert<ParametreFidelite, never>>;
      fidelite_redemption: TableDef<FideliteRedemption, MakeInsert<FideliteRedemption, "client_id">>;
      panier_frais_intention: TableDef<PanierFraisIntention, MakeInsert<PanierFraisIntention, "email">>;
      parametre_site: TableDef<ParametreSite, MakeInsert<ParametreSite, never>>;
    };
    Views: {
      /** CA FACTURÉ — ventes remises, imputées à occurred_at (= livre_le). Colonnes 0016-0017 exposées en fin (0018), client_rattache_le en fin (0044). */
      v_vente_remise: { Row: Omit<Vente, "fulfillment" | "created_at">; Relationships: [] };
      v_commande_ouverte: { Row: Vente; Relationships: [] };
      /** Compteur fidélité DÉRIVÉ (0037) — passages remis boutique+truck depuis l'opt-in. */
      v_fidelite_client: { Row: VFideliteClient; Relationships: [] };
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
