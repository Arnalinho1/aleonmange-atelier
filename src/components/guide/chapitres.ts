import type { CibleSpec } from "./Spotlight";

/**
 * Chapitres du guide — textes VERBATIM de la maquette v2 (handoff
 * docs/handoffs/inauguration-onboarding/atelier-onboarding.html), sélecteurs
 * câblés sur les VRAIS écrans (ancres data-g posées par ce chantier).
 *
 * Adaptations aux données réelles, validées au STOP état des lieux :
 * - B4 : « Lasagnes, 6,50 € » (maquette) -> « Lasagnes (part) », truck,
 *   8,50 € (produit réel du catalogue) ; la vente saisie est une VRAIE vente.
 * - B5 : « magret sauce miel » (maquette) -> « Bowl poulet » (n°1 des ventes
 *   de démo ; le magret n'existe qu'en brouillon traiteur importé, sans
 *   vente ni recette, absent de la table des marges). Le chapitre se joue
 *   sur /finance (la marge par plat y vit) ; l'étape « L'IA, concrètement »
 *   pointe l'entrée de menu Insight stratégique.
 * - B3 : le vrai écran Production est un plan PAR PRODUIT (prévision), pas
 *   une liste de commandes -> micro-action adaptée : cliquer une ligne du
 *   plan du jour (signalé au STOP Lot A).
 * - B6 : « Marie L. » = Marie Lambert (fiche réelle) ; l'étape « On facture »
 *   pointe l'entrée de menu Finances (le statut de paiement se suit sur
 *   /finance, pas sur /clients).
 *
 * Libellés verrouillés : « En attente de confirmation par l'atelier » (forme
 * complète, jamais « validée ») ; fidélité = boutique + camion, traiteur
 * exclu ; récompenses non monétaires ; AUCUN cadratin.
 */

export type ActionGuide = "click" | "vente";

export type EtapeGuide = {
  cible: CibleSpec;
  /** Ouvre le drawer de navigation mobile (<1024 px) pour montrer la cible. */
  drawer?: boolean;
  t: string;
  x: string;
  /**
   * Micro-action : le guide attend le geste RÉEL du chef sur la cible.
   * "click" = clic observé sur la cible ; "vente" = confirmation émise par la
   * saisie après un createVente réussi (événement alm:guide:vente-ok).
   * Cible absente au lancement -> mode démonstration (bouton Suivant),
   * AUCUNE écriture — on ne remet JAMAIS une commande confirmée en attente.
   */
  action?: ActionGuide;
  /** Préremplissage envoyé à la saisie de vente à l'entrée de l'étape (B4). */
  prefill?: { canal: "truck" | "boutique" | "traiteur"; produit: string; qte: number };
};

export type ChapitreGuide = {
  num: number;
  titre: string;
  duree: string;
  /** Écran porteur du chapitre (le guide y navigue au démarrage). */
  route: string | null;
  etapes: EtapeGuide[];
};

export const CHAPITRES: ChapitreGuide[] = [
  {
    num: 1,
    titre: "Bienvenue dans votre Atelier",
    duree: "2 min",
    route: "/dashboard",
    etapes: [
      {
        cible: { sel: '[data-g="nav"]' },
        drawer: true,
        t: "Bienvenue dans votre Atelier",
        x: "Ici, vous voyez ce que le site ne montre pas : vos coûts, vos marges, vos clients. Tout se pilote depuis ce menu.",
      },
      {
        cible: { sel: '[data-g="nav-activite"]' },
        drawer: true,
        t: "Votre journée, de haut en bas",
        x: "Commandes, ventes, production : les sections suivent l'ordre réel de votre journée de travail.",
      },
      {
        cible: { sel: null },
        t: "Explorez librement",
        x: "Vous ne pouvez rien casser. Chaque écran se visite sans risque, et ce guide reste disponible à tout moment.",
      },
      {
        cible: { sel: '[data-g="nav-orders"]' },
        drawer: true,
        t: "À vous de jouer",
        x: "Cliquez sur Commandes du jour dans le menu pour y aller vous-même.",
        action: "click",
      },
    ],
  },
  {
    num: 2,
    titre: "La commande arrive",
    duree: "3 min",
    route: "/orders",
    etapes: [
      {
        cible: { sel: '[data-g="cmd-fondatrice"]' },
        t: "Une commande vous attend",
        x: "La voici : la toute première commande, passée pendant l'inauguration. Elle attend votre décision.",
      },
      {
        cible: { sel: '[data-g="cmd-statut"]' },
        t: "Le statut dit tout",
        x: "Une commande web reste en attente de confirmation par l'atelier tant que vous n'avez pas décidé. Le client est prévenu par email.",
      },
      {
        cible: { sel: '[data-g="cmd-confirmer"]' },
        t: "À vous de jouer",
        x: "Confirmez cette commande : elle passera en production.",
        action: "click",
      },
    ],
  },
  {
    num: 3,
    titre: "On produit",
    duree: "2 min",
    route: "/prod",
    etapes: [
      {
        cible: { sel: '[data-g="prod-plan"]' },
        t: "Votre plan du jour",
        x: "Le plan de production regroupe tout ce qu'il y a à cuisiner, canal par canal. Rien à ressaisir.",
      },
      {
        cible: { sel: '[data-g="prod-ligne"]' },
        t: "À vous de jouer",
        x: "Retrouvez le plat à produire dans le plan du jour et cliquez sur sa ligne.",
        action: "click",
      },
    ],
  },
  {
    num: 4,
    titre: "On vend",
    duree: "3 min",
    route: "/sale",
    etapes: [
      {
        cible: { sel: '[data-g="saisie-canaux"]' },
        t: "On vend",
        x: "Boutique ou camion : chaque vente saisie ici alimente vos chiffres, canal par canal.",
      },
      {
        cible: { sel: '[data-g="saisie-fidelite"]' },
        t: "La fidélité compte ici",
        x: "Les passages boutique et camion comptent pour la fidélité. Le traiteur en est exclu.",
      },
      {
        cible: { sel: '[data-g="saisie-encaisser"]' },
        t: "À vous de jouer",
        x: "Saisissez votre première vente : Lasagnes (part), 8,50 €. Tout est prérempli, il ne reste qu'à encaisser.",
        action: "vente",
        prefill: { canal: "truck", produit: "Lasagnes (part)", qte: 1 },
      },
    ],
  },
  {
    num: 5,
    titre: "On comprend",
    duree: "3 min",
    route: "/finance",
    etapes: [
      {
        cible: { sel: '[data-g="ana-ca"]' },
        t: "On comprend",
        x: "Votre chiffre d'affaires, par canal. Ce qui marche se voit tout de suite, sans tableur.",
      },
      {
        cible: { sel: '[data-g="ana-marge"]' },
        t: "Lire un chiffre pour décider",
        x: "Une marge faible n'est pas une faute : c'est une décision à prendre. Ajuster le prix, la portion ou la place à la carte.",
      },
      {
        cible: { sel: '[data-g="nav-insight"]' },
        drawer: true,
        t: "L'IA, concrètement",
        x: "Elle repère pour vous ce qui mérite un coup d'œil : un invendu qui revient, un plat qui décolle. Vous décidez, elle surveille.",
      },
      {
        cible: { sel: '[data-g="ana-marge-row"]', contains: "Bowl poulet" },
        t: "À vous de jouer",
        x: "Retrouvez la marge du bowl poulet et cliquez dessus.",
        action: "click",
      },
    ],
  },
  {
    num: 6,
    titre: "On fidélise et on facture",
    duree: "3 min",
    route: "/clients",
    etapes: [
      {
        cible: { sel: '[data-g="cli-fiche"]' },
        t: "On fidélise",
        x: "Vos habitués et leur historique. Les récompenses restent non monétaires : un extra, une priorité, une attention.",
      },
      {
        cible: { sel: '[data-g="nav-finance"]' },
        drawer: true,
        t: "On facture",
        x: "Un traiteur vit sur trois dates : commandé, livré, réglé. Le statut de paiement se suit ici, sans confusion avec la livraison.",
      },
      {
        cible: { sel: '[data-g="cli-row"]', contains: "Marie", inner: 'button[title="Éditer la fiche"]' },
        t: "À vous de jouer",
        x: "Ouvrez la fiche de Marie L., votre habituée de démonstration.",
        action: "click",
      },
    ],
  },
  {
    num: 7,
    titre: "Clôture",
    duree: "1 min",
    route: null,
    etapes: [],
  },
];

/** Chips du récap de clôture (B7) — verbatim maquette. */
export const RECAP_ETAPES = [
  "1 Bienvenue",
  "2 Commande",
  "3 Production",
  "4 Vente",
  "5 Comprendre",
  "6 Fidéliser",
  "7 Clôture",
];

/**
 * Aide contextuelle « ? » : écran -> chapitre à rejouer. /finance pointe B5
 * (la micro-action marge s'y joue — écart assumé vs « clients/finances=B6 »,
 * signalé au STOP) ; /sales et /insight pointent aussi B5 (le chapitre
 * « On comprend » couvre les trois écrans de pilotage).
 */
export const CHAPITRE_PAR_ROUTE: Record<string, number> = {
  "/dashboard": 1,
  "/orders": 2,
  "/prod": 3,
  "/sale": 4,
  "/sales": 5,
  "/insight": 5,
  "/finance": 5,
  "/clients": 6,
};
