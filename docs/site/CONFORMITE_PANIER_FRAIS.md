# Conformité maquette-code — Bloc « Panier frais » (teasing), /boutique

Maquette de référence : `docs/handoffs/boutique-panier-frais-teasing.html` (autonome, desktop +
mobile côte à côte) + `docs/handoffs/boutique-panier-frais-INTEGRATION.md`. Phase TEASING : le
bloc collecte une INTENTION (email + vote facultatif), il ne vend rien. Affiché uniquement quand
le flag `parametre_site.panier_frais_teasing_actif` est ON (OFF par défaut → /boutique identique).

## Architecture (rappel)
- **Données** (migration 0043) : table autonome `panier_frais_intention` (email + taille/rythme/contenu
  nullables + double opt-in propre : `token`, `statut`, `consentement_le`), singleton `parametre_site`
  (flag OFF par défaut). RPC `web_intention_panier_frais` (upsert idempotent, votes coalesce) +
  `web_confirmer_panier_frais`. RLS `est_chef()` ; EXECUTE réservé à `site_ecrivain` ; `site_lecteur`
  lit le flag, JAMAIS les intentions.
- **Site** : `PanierFrais.tsx` (client) rendu par `boutique/page.tsx` derrière `panierFraisTeasingActif()`.
  Écriture via `/api/panier-frais` → RPC ; confirmation `/panier-frais/confirmer` ; email double opt-in.
- **Atelier** : `PanierFraisReglages` en Réglages (toggle + agrégat des votes CONFIRMÉS).
- **Mesure** : event GA4 `panier_frais_interet` au submit (consenti, zéro PII).

## Conformité DESKTOP (grille 2 colonnes)

| Élément | Maquette | Implémentation | Conforme |
|---|---|---|---|
| Conteneur | carte canard, radius 22px, grille `1.15fr / 1fr` | `bg-canard rounded-[22px] md:grid md:grid-cols-[1.15fr_1fr]` | ✅ |
| Badge « Bientôt » | pilule dorée, Spline mono 10px, #F0C173/#0E3947 | `bg-or text-canard font-mono text-[10px] rounded-pille` (dans le contenu) | ✅ |
| Surtitre | « Uniquement sur réservation », mono doré | `font-mono text-[10.5px] uppercase tracking-[.14em] text-or` | ✅ |
| Titre H2 | « Le Panier frais du Beaujolais », Bricolage 800, 36px, #F7F1E4 | `font-display font-extrabold text-[36px] text-[#f7f1e4]` (saut de ligne desktop) | ✅ |
| Paragraphe | 15px, #CDDCE0, max 460px | `text-[15px] text-[#cddce0] md:max-w-[460px]` | ✅ |
| Mini-vote — labels | 3 questions, mono 10.5px, #7FA3AD | `font-mono text-[10.5px] text-[#7fa3ad]` × 3 | ✅ |
| Mini-vote — pills | 38px, radius 100px, actif #F0C173/canard, inactif contour crème translucide | `h-[38px] rounded-pille` ; actif `bg-or text-canard` / inactif `border-[rgba(243,236,221,.3)] text-[#e7dfc9]` | ✅ |
| Champ email | 48px, pilule, fond crème translucide | `h-[48px] rounded-pille bg-[rgba(243,236,221,.08)] placeholder:text-[#a9a088]` | ✅ |
| CTA | « Prévenez-moi du lancement », rouge #D81020, 48px | `h-[48px] rounded-pille bg-[var(--accent)] text-white` | ✅ |
| Note RGPD | « Double confirmation par email · votre avis compte, ce n'est pas une réservation. » | idem, `text-[11.5px] text-[#7fa3ad]` | ✅ |
| État succès | encart doré « Presque terminé » remplace le formulaire, vote reste affiché | encart `bg-[rgba(240,193,115,.12)]` remplace le `<form>`, vote au-dessus intact | ✅ |
| Photo | pleine hauteur à droite, object-cover | `<Image fill className="object-cover">` en colonne 2, `md:h-full` | ✅ |
| Badge flottant | « Producteurs / 100% Beaujolais », bas-gauche, sur fond crème | `absolute left-5 bottom-5 bg-surface` (desktop uniquement) | ✅ |

## Conformité MOBILE (390, empilé)

| Élément | Maquette | Implémentation | Conforme |
|---|---|---|---|
| Conteneur | carte canard, radius 20px, empilée | `rounded-[20px] flex flex-col` | ✅ |
| Photo | en tête, ratio 16/9, badge « Bientôt » superposé (haut-gauche) | `order-first aspect-[16/9]` + badge `md:hidden absolute top-[14px] left-[14px]` | ✅ |
| Contenu | sous la photo : surtitre, H2 27px, paragraphe 14px, vote, formulaire empilé | `px-5 pt-6 pb-[26px]`, H2 `text-[27px]`, para `text-[14px]` | ✅ |
| Formulaire | champ puis CTA empilés | `flex flex-col sm:flex-row` (empilé < 640px) | ✅ |
| Pills | mono 13px | `text-[13px]` | ✅ |
| Badge « Producteurs » | absent en mobile | masqué (`hidden md:block`) | ✅ |

## Écarts assumés (à valider au STOP visuel)
1. **Paragraphe & note RGPD** : une SEULE copie (version desktop, la plus explicite) sur les deux
   tailles, au lieu des deux variantes raccourcies de la maquette mobile. Même sens, copy non
   dupliquée (une source) ; le mobile est un peu plus dense. Réversible.
2. **Pills désélectionnables** : cliquer une pill active la remet à « non choisi » (le vote est
   FACULTATIF). La maquette ne fait que sélectionner ; on ajoute la désélection (meilleure UX pour
   un vote optionnel). Choix unique par question conservé.
3. **Sous-teintes canard hors système** : `#f3ecdd`, `#cddce0`, `#7fa3ad`, `#f7f1e4`, `#e7dfc9`
   posées en valeurs arbitraires INLINE (internes au bloc), pas ajoutées au `@theme` (globals.css :
   « ne pas inventer de teintes »). Fidèles à la maquette.
4. Route `/panier-frais/confirmer` et endpoint `/api/panier-frais` : nommage cohérent avec le site
   (kebab-case), pas dans la maquette (qui ne pilote pas le back).

## Wording verrouillé (respecté)
« Prévenez-moi du lancement » ; « ce n'est pas une réservation » ; **jamais** « réserver » ni
« commander » ; zéro cadratin (aucun tiret em dans le copy livré). Vérifié dans `PanierFrais.tsx`,
`email.ts` (`emailPanierFraisConfirmer`), `panier-frais/confirmer/page.tsx`.

## Dépendance PRODUCTION (bloquante pour l'activation)
Resend est en **mode DEV** (`RESEND_PROD` absent) : les emails de confirmation partent **`[DEV]`
vers `RESEND_DEST_TEST`**, pas au vrai destinataire → une intention réelle ne peut pas être
confirmée. **Le flag ne doit être activé en prod qu'APRÈS `RESEND_PROD=1`** (domaine `aleonmange.app`
vérifié DNS). Rappel affiché dans l'écran Réglages (encart d'avertissement). Backlog pré-ouverture.

## Preuves
- **Migration 0043** : dry-run `BEGIN/ROLLBACK` (asserts fonctionnels des 2 RPC : en_attente→confirmé,
  coalesce, idempotence, consentement NULL→daté, deja/inconnu, vote invalide rejeté) puis apply +
  vérif live (RLS active, index `lower(email)`, flag OFF, 0 policy anon, `site_lecteur` lit le flag
  et PAS les intentions).
- **Data-path au niveau des rôles** (JWT réels) : `site_lecteur` lit le flag ; `site_lecteur` refusé
  sur les intentions (`permission denied`) ; `site_ecrivain` crée + confirme ; re-submit email seul
  (payload réel du site) → même token, votes préservés (coalesce), 1 seule ligne. Données d'essai
  supprimées (par email, jamais de sweep ; `total=0`).
- **Build + lint verts** des 2 apps (site + Atelier).
- **Visuel 390 / 1440** : à valider par Arnaud (extension Chrome indispo côté CC).
