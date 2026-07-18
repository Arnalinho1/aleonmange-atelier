# À Léon Mange — Site public · Guide d'intégration (Handoff → Claude Code)

> **Statut :** dossier de passation destiné à Claude Code.
> **Objet :** réimplémenter le **site public** (vitrine + précommande + devis + espace client) à partir de la maquette HTML fournie.
> **Version :** V2 — 2026-07-12.

---

## ⚠ À lire avant tout — nature de la maquette

La maquette et **toutes ses données** sont un **artefact de démonstration**. Elle fixe la **forme** (mise en page, hiérarchie, ton) et le **comportement** (ce qui se passe quand on clique). Elle n'est **pas** une base à « brancher ».

- **Tu portes le _modèle_, pas les exemples.** Le catalogue (plats, prix, descriptions), les créneaux, les emplacements, les commandes du tableau de bord, les points de fidélité : tout est **inventé** pour illustrer. Le contenu réel sera saisi proprement par l'équipe (chefs + marketing) dans le CMS / la base.
- **Aucune** donnée de la maquette ne part en production telle quelle.
- Les deux fichiers HTML sont **autonomes** (images, polices et JS embarqués en base64) : tu peux les ouvrir hors-ligne pour étudier chaque écran. Ne les édite pas — ce sont des artefacts compilés. Étudie-les, réimplémente proprement.

---

## 00 · Les fichiers de la passation

| Fichier | Rôle |
|---|---|
| `A Leon Mange - Site desktop.html` | Maquette **desktop** complète, autonome. Référence de forme + comportement. |
| `A Leon Mange - Site mobile.html` | Maquette **mobile** complète, autonome. Même contenu et mêmes flux, adaptés au format téléphone. |
| `INTEGRATION.md` | Ce document. |

Les deux maquettes couvrent **exactement le même produit** — desktop et mobile ne sont pas deux périmètres différents mais deux rendus responsive de la même chose. Implémente **une seule application responsive** ; sers-toi du desktop pour les grilles larges et du mobile pour la nav (menu plein écran), les steppers de panier et l'empilement.

---

## 01 · Stack recommandée

Rien n'impose une stack, mais le design et les flux se prêtent à :

- **Next.js (App Router)** + **TypeScript** + **Tailwind** (ou CSS Modules). Le site est majoritairement statique (vitrine) avec quelques îlots interactifs (panier, formulaires) → RSC pour les pages, Client Components pour panier/formulaires.
- **Base + auth : Supabase** (Postgres + Auth + RLS) — cohérent avec le back-office « Atelier ». L'espace client (compte, commandes, fidélité) s'y branche naturellement.
- **Emails transactionnels** (confirmations précommande / devis / contact) : Resend, Postmark ou l'SMTP existant.
- **Contenu éditable** (catalogue, emplacements, horaires) : table Postgres pilotée depuis l'Atelier, **pas** de valeurs en dur.

> Les données commande/vente ont leur propre **Contrat de données — la Vente** (remis avec le handoff de l'Atelier). Réutilise-le comme source de vérité structurelle pour les précommandes ; ne réinvente pas le schéma.

---

## 02 · Design system (à extraire de la maquette)

**Polices** (Google Fonts, déjà liées dans la maquette) :
- `Bricolage Grotesque` — titres, prix, boutons (weights 400–800).
- `Hanken Grotesk` — texte courant, formulaires (400–800).
- `Spline Sans Mono` — sur-titres / labels / badges en capitales espacées (400–600).

**Couleurs :**
| Rôle | Hex |
|---|---|
| Fond crème (page) | `#EDE7DA` |
| Fond carte / surface | `#FBF8F1` / `#F6F1E7` |
| Bleu-canard (texte fort, primaire) | `#0E3947` |
| Rouge accent (CTA, prix, badges actifs) | `#D81020` — **exposé en prop `accent`, réglable** |
| Vert (badges secondaires, tel/email) | `#2E6B4A` sur fond `#E3EFE4` |
| Terracotta (sur-titres) | `#B0704C` |
| Bordures | `#ECE3D2` / `#E4DAC6` / `#DFD4BF` |
| Texte secondaire | `#5A6B62` / `#6B7469` |

**Motifs récurrents :** cartes à coins arrondis 16–20px, bordure 1px crème, boutons pilule (`border-radius:100px`), badges mono en capitales, steppers +/− pour les quantités.

> L'accent rouge est un **token de thème** (prop `accent`, défaut `#D81020`). Centralise-le en variable CSS (`--accent`) ; toute la maquette l'utilise déjà ainsi.

---

## 03 · Carte des écrans

Chaque écran de la maquette porte un id (`d-*` en desktop). En production ce seront des **routes** ou des **sections d'une page longue** — à toi de trancher selon le SEO souhaité (recommandé : vraies routes pour Boutique / Traiteur / Food truck / Contact, modales pour panier & auth).

| id maquette | Écran | Routes suggérées |
|---|---|---|
| `d-acc` | **Accueil** — hero + 3 cartes (Boutique / Food truck / Traiteur) | `/` |
| `d-lettre`, `d-lettre-ok` | Modale **lettre d'info** (inscription + confirmation) | modale |
| `d-btq` | **La Boutique** — présentation, horaires, carte (vitrine catalogue) | `/boutique` |
| `d-cc` | **Click & collect** — panier, créneau, confirmation | `/boutique/commander` ou modale |
| `d-trait` | **Le Traiteur** — offre, galerie, carte | `/traiteur` |
| `d-devis` | **Demande de devis** traiteur (≠ commande ferme) | `/traiteur/devis` |
| `d-truck` | **Le Food truck** — emplacements de la semaine + carte | `/food-truck` |
| `d-precmd` | **Précommande food truck** — panier, créneau, confirmation | `/food-truck/precommander` |
| `d-hist` | **Notre histoire** | section de `/` ou `/histoire` |
| `d-contact` | **Contact** — adresse, tel, email, plan, formulaire | `/contact` |
| `d-login` | **Création de compte** — opt-in RGPD | `/compte/connexion` |
| `d-compte` | **Tableau de bord** — fidélité + commandes | `/compte` |
| `d-cmd` | **Détail de commande** + re-commande en 1 geste | `/compte/commandes/[id]` |
| `d-profil` | **Profil** — consentements & préférences | `/compte/profil` |
| `d-mentions` | **Mentions légales** (placeholders juridiques) | `/mentions-legales` |

---

## 04 · Modèles de données (dérivés de la maquette)

Ces structures viennent des constantes JS de la maquette. Elles décrivent la **forme** attendue — les **valeurs** seront remplacées par du contenu réel éditable.

### Catalogue vitrine boutique (`boutiqueCarte`)
Regroupement par **famille**, affichage vitrine (sans prix, sans commande) :
```ts
type FamilleVitrine = {
  fam: string;        // ex. "Charcuteries artisanales"
  note: string;       // baseline courte de la famille
  items: string[];    // noms de produits
};
```
Familles présentes dans la démo : Charcuteries artisanales · Tartinables & apéritifs · Salades fraîches & entrées · Légumes cuisinés & accompagnements · Poissons & produits de la mer · Viandes cuisinées · Fromages · Desserts maison.

### Catalogue Click & Collect boutique (`ccCatalog`)
Produits **commandables** (avec clé + prix) :
```ts
type ProduitCC = {
  k: string;          // clé unique (s1, e2, c3…) → deviendra un product_id
  name: string;
  desc: string;
  price: number;      // EUR, nombre
};
type CategorieCC = { cat: string; items: ProduitCC[] };
```

### Carte Food truck (`truckCarte`)
```ts
type ItemTruck = { name: string; desc: string; price: string /* "11", "0,20" */ };
type FamilleTruck = { fam: string; note: string; items: ItemTruck[] };
```
Familles : Entrée · Plats & salades (du moment) · Bocaux (à emporter) · Desserts · Gourmandises (faites maison) · Boissons · Autres.

### Carte Traiteur (`traiteurCarte`)
```ts
type ItemTraiteur = { name: string; desc: string; price: string /* "40,00" */ };
type FamilleTraiteur = {
  fam: string;
  note: string;       // ex. "1 part · 400 g"
  foot?: string;      // ex. "Prévus pour 6 personnes minimum"
  items: ItemTraiteur[];
};
```
Familles : Pièces apéritives · Plats complets · Plats seuls · Garnitures · Desserts.

### Recettes signatures (carrousel, `signatures`)
```ts
type Signature = {
  name: string;
  desc: string;
  price: string;      // "1,99 €/100g"
  img: string;        // visuel produit
};
```
5 recettes en démo (Parmentier de bœuf, Blanquette de veau, Cordon bleu maison, Lasagnes maison, Paella valencienne).

### Emplacements food truck (`emplacements`)
```ts
type Emplacement = {
  ville: string;      // "Tassin-la-Demi-Lune"
  lieu: string;       // "Place Péragut"
  jour: string;       // "Mercredi"
  horaire: string;    // "11h30 – 14h"
  today: boolean;     // emplacement du jour → mis en avant
};
```
Démo : Le Bois-d'Oingt (Mardi, Place du Marché) · Tassin-la-Demi-Lune (Mercredi, Place Péragut) · La Tour-de-Salvagny (Jeudi, Parking du Casino).
> **En prod :** table éditable. Le flag `today` doit être **calculé** (jour courant vs `jour`), pas stocké. La précommande d'un emplacement pré-remplit le contexte (ville + jour) de l'écran `d-precmd`.

### Horaires boutique (`boutiqueHoraires`)
```ts
type Horaire = { j: string /* "Mardi – Vendredi" */; h: string /* "9h – 13h · 15h – 19h" */ };
```

---

## 05 · Actions & états (ce que le back doit faire)

La maquette simule les actions en `state` local. Voici ce qu'elles deviennent réellement :

| Action maquette (state) | Comportement attendu en prod |
|---|---|
| **Click & collect** (`ccQty`, `ccDay`, `ccSlot`, `ccSent`) | Panier → choix jour + créneau retrait → création d'une **commande de retrait boutique**. Confirmation à l'écran + email. |
| **Précommande food truck** (`tqty`, `tslot`, `tsent`, `tplace`) | Panier sur l'emplacement/jour choisi → créneau → **précommande food truck** rattachée à `emplacement + date`. Confirmation + email. |
| **Devis traiteur** (`dtype`, `dsent`) | Formulaire (type d'événement, date, convives, budget, projet) → **demande de devis** (≠ commande). Enregistrement + notification équipe. Message clair « pas un engagement ferme ». |
| **Lettre d'info** (`lettreOpen`, `lettreSent`) | Inscription newsletter avec **opt-in explicite** (RGPD). Double opt-in recommandé. |
| **Contact** | Formulaire (nom, email, message) → email vers la boutique. |
| **Compte** (`ecReco`, `ecNews`, `ecGouts`, `ecLieu`, `ecFreq`) | Auth Supabase. Préférences (goûts, lieu favori, fréquence), consentements newsletter, recommandations. Fidélité + historique de commandes + **re-commande en 1 geste** (recharge le panier depuis une commande passée). |

**Règles métier visibles dans la maquette (à conserver) :**
- Les prix de la carte food truck et traiteur sont des **chaînes** avec virgule décimale (format FR) → normaliser en `number` côté données, formater en `xx,xx €` à l'affichage.
- Un devis n'est **jamais** une commande ferme — le libellé et le parcours doivent l'expliciter.
- La précommande est **contextualisée** par l'emplacement : partir de la carte d'un emplacement pré-remplit ville + jour.
- Créneaux de retrait : listés en dur dans la démo (`12h00`, `18h00`…) → à rendre configurables (plage + pas) côté back-office.

---

## 06 · Coordonnées & liens réels (à conserver)

Ce sont les **vraies** infos du commerce — à reprendre telles quelles :

- **Adresse :** 1923 route de la vallée, 69620 Létra (Beaujolais)
- **Téléphone :** 06 75 36 23 26
- **Email :** contact@aleonmange.com
- **Instagram :** https://www.instagram.com/aleonmange/
- **Facebook :** https://www.facebook.com/aleonmange
- **Horaires boutique :** Mar–Ven 9h–13h · 15h–19h · Sam 9h–14h · Dim/Lun fermé

---

## 07 · Props de thème exposées par la maquette

| Prop | Type | Défaut | Effet |
|---|---|---|---|
| `accent` | couleur | `#D81020` | Couleur d'accent (CTA, prix, badges actifs) → variable `--accent`. |
| `truckAujourdhui` | booléen | `true` | Simule « le food truck est ouvert aujourd'hui » (met en avant l'emplacement du jour). En prod, **calculé** depuis la date + les emplacements. |

---

## 08 · Ce qu'il ne faut PAS porter

- ❌ Le **contenu du catalogue** (plats, descriptions, prix) — exemples inventés.
- ❌ Les **commandes / points de fidélité** du tableau de bord — fictifs.
- ❌ Les **créneaux et emplacements en dur** — à rendre éditables.
- ❌ Le flag `today`/`truckAujourdhui` stocké — doit être **calculé**.
- ✅ À porter : la **forme** (layouts, composants, hiérarchie), le **comportement** (flux panier/devis/contact/compte), le **design system** (polices, couleurs, motifs), et les **coordonnées réelles** (§06).

---

## 09 · Suggestion d'ordre d'implémentation

1. Design system (tokens + polices + composants de base : carte, bouton pilule, badge mono, stepper).
2. Pages vitrine statiques : Accueil, Boutique, Traiteur, Food truck, Histoire, Contact, Mentions.
3. Modèle de données + CMS/back-office pour catalogue, emplacements, horaires, créneaux.
4. Îlots interactifs : Click & collect, Précommande food truck (panier + créneau + confirmation + email).
5. Formulaires : Devis traiteur, Contact, Lettre d'info (avec opt-in RGPD).
6. Espace client : auth Supabase, tableau de bord fidélité, détail commande + re-commande, profil & consentements.
