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
  actif: boolean;
  created_at: string;
};

export type Recette = {
  id: string;
  nom: string;
  rendement: number | null;
  etapes: unknown;
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
  is_bowl: boolean;
  recette_id: string | null;
  actif: boolean;
  created_at: string;
};

export type Client = {
  id: string;
  nom: string;
  type: string | null;
  email: string | null;
  telephone: string | null;
  code_postal: string | null;
  notes: string | null;
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

export type Vente = {
  id: string;
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
      vente: TableDef<Vente, MakeInsert<Vente, "occurred_at" | "canal" | "montant_total" | "moyen_paiement" | "mode_vente" | "fulfillment">>;
      vente_ligne: TableDef<VenteLigne, MakeInsert<VenteLigne, "vente_id" | "type" | "mode" | "libelle" | "montant">>;
      vente_ligne_composant: TableDef<VenteLigneComposant, MakeInsert<VenteLigneComposant, "ligne_id" | "composant_id" | "categorie">>;
      insight: TableDef<Insight, MakeInsert<Insight, "urgence" | "constat">>;
      notification: TableDef<Notification, MakeInsert<Notification, "categorie" | "titre">>;
    };
    Views: {
      v_vente_remise: { Row: Omit<Vente, "fulfillment" | "created_at">; Relationships: [] };
      v_commande_ouverte: { Row: Vente; Relationships: [] };
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
