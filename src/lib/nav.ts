import {
  LayoutDashboard,
  Bell,
  ShoppingBag,
  ClipboardList,
  History,
  Upload,
  BookOpen,
  ChefHat,
  Factory,
  ShieldCheck,
  Boxes,
  Lightbulb,
  Wallet,
  TrendingUp,
  Gauge,
  Users,
  Megaphone,
  UserCog,
  MapPin,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  /** Clé de badge dynamique (ex: notifications non lues, commandes ouvertes). */
  badge?: "notifs" | "orders";
}

export interface NavGroup {
  titre: string;
  items: NavItem[];
}

/** Groupes & items EXACTS de la sidebar (MOCKUP_DIGEST §1). */
export const NAV_GROUPS: NavGroup[] = [
  {
    titre: "Accueil",
    items: [
      { id: "dashboard", href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
      { id: "notifs", href: "/notifs", label: "Notifications", icon: Bell, badge: "notifs" },
    ],
  },
  {
    titre: "Activité",
    items: [
      { id: "sale", href: "/sale", label: "Saisie de vente", icon: ShoppingBag },
      { id: "orders", href: "/orders", label: "Commandes du jour", icon: ClipboardList, badge: "orders" },
      { id: "history", href: "/history", label: "Historique des ventes", icon: History },
      { id: "import", href: "/import", label: "Import caisse", icon: Upload },
    ],
  },
  {
    titre: "Cuisine",
    items: [
      { id: "catalog", href: "/catalog", label: "Catalogue", icon: BookOpen },
      { id: "recipes", href: "/recipes", label: "Recettes & plats", icon: ChefHat },
      { id: "prod", href: "/prod", label: "Production", icon: Factory },
      { id: "haccp", href: "/haccp", label: "HACCP", icon: ShieldCheck },
      { id: "stock", href: "/stock", label: "Stocks", icon: Boxes },
    ],
  },
  {
    titre: "Pilotage",
    items: [
      { id: "insight", href: "/insight", label: "Insight stratégique", icon: Lightbulb },
      { id: "finance", href: "/finance", label: "Finances", icon: Wallet },
      { id: "sales", href: "/sales", label: "Ventes & tendances", icon: TrendingUp },
      { id: "productivity", href: "/productivity", label: "Productivité", icon: Gauge },
      { id: "clients", href: "/clients", label: "Clients", icon: Users },
    ],
  },
  {
    titre: "Marketing",
    items: [{ id: "commu", href: "/commu", label: "Réseaux sociaux", icon: Megaphone }],
  },
  {
    titre: "Réglages",
    items: [
      { id: "settings", href: "/settings", label: "Emplacements", icon: MapPin },
      { id: "users", href: "/users", label: "Utilisateurs & rôles", icon: UserCog },
    ],
  },
];

/** Métadonnées d'en-tête d'écran (sur-titre = rubrique). */
export const SCREEN_META: Record<string, { rubrique: string; titre: string; desc: string }> = {
  dashboard: { rubrique: "Accueil", titre: "Tableau de bord", desc: "L'état du jour en un coup d'œil." },
  notifs: { rubrique: "Accueil", titre: "Notifications", desc: "Alertes et préférences." },
  sale: { rubrique: "Activité", titre: "Saisie de vente", desc: "Le point d'entrée de toutes les ventes." },
  orders: { rubrique: "Activité", titre: "Commandes du jour", desc: "La file de production des précommandes." },
  history: { rubrique: "Activité", titre: "Historique des ventes", desc: "Les ventes remises, par jour." },
  import: { rubrique: "Activité", titre: "Import caisse", desc: "Reconstituer les ventes boutique depuis un export." },
  catalog: { rubrique: "Cuisine", titre: "Catalogue", desc: "Les produits par canal." },
  recipes: { rubrique: "Cuisine", titre: "Recettes & plats", desc: "Les fiches techniques de production." },
  prod: { rubrique: "Cuisine", titre: "Production", desc: "Prévision de demande et plan de production." },
  haccp: { rubrique: "Cuisine", titre: "HACCP & traçabilité", desc: "Le registre réglementaire." },
  stock: { rubrique: "Cuisine", titre: "Stocks & traçabilité", desc: "Inventaire, lots et DLC." },
  insight: { rubrique: "Pilotage", titre: "Insight stratégique", desc: "Constat · chiffre · action." },
  finance: { rubrique: "Pilotage", titre: "Finances", desc: "CA, marges et coûts." },
  sales: { rubrique: "Pilotage", titre: "Ventes & tendances", desc: "Courbes, top produits, saisonnalité." },
  productivity: { rubrique: "Pilotage", titre: "Productivité", desc: "Cadence et rendement de production." },
  clients: { rubrique: "Pilotage", titre: "Clients", desc: "Fiches et récurrence." },
  commu: { rubrique: "Marque & marketing", titre: "Réseaux sociaux", desc: "Publications et attribution." },
  users: { rubrique: "Réglages", titre: "Utilisateurs & rôles", desc: "L'équipe et ses accès." },
  settings: { rubrique: "Réglages", titre: "Emplacements & réglages", desc: "Référentiels éditables." },
};

/** Libellés FR des enums (affichage uniquement — clés stockées inchangées). */
export const CANAL_LABEL: Record<string, string> = {
  truck: "Food truck",
  boutique: "Boutique",
  traiteur: "Traiteur",
};

export const CANAL_COLOR: Record<string, string> = {
  truck: "#d81020",
  boutique: "#1493be",
  traiteur: "#e9a23b",
};

export const CATEGORIE_COLOR: Record<string, string> = {
  proteine: "#d81020",
  feculent: "#e9a23b",
  legume: "#3fa8ce",
  sauce: "#1493be",
};

export const CATEGORIE_LABEL: Record<string, string> = {
  proteine: "Protéine",
  feculent: "Féculent",
  legume: "Légume",
  sauce: "Sauce",
};

export const PAIEMENT_LABEL: Record<string, string> = {
  especes: "Espèces",
  cb: "CB",
  ticket: "Ticket resto",
  virement: "Virement",
};

/** Jour de semaine des emplacements truck (1=lundi … 7=dimanche, cf. 0002_referentiel). */
export const JOUR_SEMAINE_LABEL: Record<number, string> = {
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
  7: "Dimanche",
};
