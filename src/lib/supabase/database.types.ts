/**
 * Types de la base Atelier ALM — alignés sur supabase/migrations/*.
 * Écrits à la main (la base dédiée n'est pas encore branchée). À terme,
 * régénérables via `supabase gen types typescript`.
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

export interface Emplacement {
  id: string;
  code: string;
  libelle: string;
  jour_semaine: number | null;
  actif: boolean;
  created_at: string;
}

export interface Composant {
  id: string;
  nom: string;
  categorie: CategorieComposant;
  cout_matiere_kg: number | null;
  actif: boolean;
  created_at: string;
}

export interface Recette {
  id: string;
  nom: string;
  rendement: number | null;
  etapes: unknown;
  is_virtuelle: boolean;
  actif: boolean;
  created_at: string;
}

export interface RecetteComposant {
  id: string;
  recette_id: string;
  composant_id: string;
  quantite: number | null;
  categorie: CategorieComposant;
}

export interface Produit {
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
}

export interface Client {
  id: string;
  nom: string;
  type: string | null;
  email: string | null;
  telephone: string | null;
  code_postal: string | null;
  notes: string | null;
  actif: boolean;
  created_at: string;
}

export interface Profil {
  id: string;
  nom: string;
  role: RoleEquipe;
  actif: boolean;
  created_at: string;
}

export interface Vente {
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
}

export interface VenteLigne {
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
}

export interface VenteLigneComposant {
  id: string;
  ligne_id: string;
  composant_id: string;
  categorie: CategorieComposant;
}

export interface Insight {
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
}

export interface Notification {
  id: string;
  categorie: string;
  severite: string;
  titre: string;
  description: string | null;
  ecran: string | null;
  lu: boolean;
  occurred_at: string;
}

/** Helper générique pour un enregistrement Insert (champs auto optionnels). */
type Insertable<T, AutoKeys extends keyof T> = Omit<T, AutoKeys> &
  Partial<Pick<T, AutoKeys>>;

type Row<T> = { Row: T; Insert: Partial<T>; Update: Partial<T> };

export interface Database {
  public: {
    Tables: {
      emplacement: Row<Emplacement> & {
        Insert: Insertable<Emplacement, "id" | "created_at" | "actif">;
      };
      composant: Row<Composant> & {
        Insert: Insertable<Composant, "id" | "created_at" | "actif">;
      };
      recette: Row<Recette>;
      recette_composant: Row<RecetteComposant>;
      produit: Row<Produit> & {
        Insert: Insertable<Produit, "id" | "created_at" | "actif">;
      };
      client: Row<Client> & {
        Insert: Insertable<Client, "id" | "created_at" | "actif">;
      };
      profil: Row<Profil>;
      vente: Row<Vente> & {
        Insert: Insertable<Vente, "id" | "created_at" | "source_vente" | "origine">;
      };
      vente_ligne: Row<VenteLigne> & { Insert: Insertable<VenteLigne, "id"> };
      vente_ligne_composant: Row<VenteLigneComposant> & {
        Insert: Insertable<VenteLigneComposant, "id">;
      };
      insight: Row<Insight>;
      notification: Row<Notification>;
    };
    Views: {
      v_vente_remise: { Row: Omit<Vente, "fulfillment" | "created_at"> };
      v_commande_ouverte: { Row: Vente };
    };
  };
}
