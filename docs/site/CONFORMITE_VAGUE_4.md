# Conformite Vague 4 (refonte RLS + espace client & fidelite) · EN PRODUCTION (merge `0223acd`) · 2026-07-20

> Legende : ✅ fait et PROUVE (requetes sous role / build) · ☐ RESTE.
> Etat : **EN PRODUCTION** (merge `--no-ff` `0223acd`, 2026-07-20 ; les 2 projets Vercel rebuildes ; **test prod E2E par Arnaud OK** = compte client reel sur aleonmange.app, parcours complet inscription -> mail -> rattachement -> fidelite -> re-commande -> profil, visuels conformes). Migrations **0034-0040** en prod ; 4 ecrans espace client + fiche client Atelier ; correctif securite Atelier (constat C, Fix C) deja hotfixe `1ba235a`, reconcilie sans doublon au merge. main = Vagues 1-4. Modele de securite : `ARCHITECTURE.md` section Vague 4.

## Etage 1 — refonte RLS (semi-supervise strict, invariants respectes)

| Element | Etat | Preuve |
|---|---|---|
| 0034 : hook `app_role` + `est_chef()` (fail-closed) | ✅ | hook stampe `app_role=equipe` pour un profil / null sinon ; est_chef true/false. NB : le trigger `handle_new_user` de 0034 etait fail-open -> **remplace par 0040** (cf. ci-dessous) |
| **0040 : `handle_new_user` FAIL-CLOSED (correctif securite)** | ✅ | Faille prouvee (inscription publique nue -> profil equipe = self-provision chef). Correctif applique + prouve live : nue -> 0 profil + `hook.app_role=null` ; `kind=client` -> 0 ; provisioning explicite chef -> profil equipe ; owner intact. Bascule : signups OFF -> 0040 -> signups ON (sains) |
| Invariant 1 : claim sur jeton FRAIS avant toute policy | ✅ | Arnaud reconnecte -> `app_role=equipe` decode dans son jeton |
| 0035 : bascule 60 policies (55 `using(true)`->`est_chef()` + 5 scoped durcies) | ✅ | dry-run + LIVE : chef == baseline sur 28 tables (0 regression), client/bidon = 0 partout ; rollback de fenetre arme |
| Invariant 3 : smoke Atelier complet post-bascule | ✅ | Arnaud : tous les ecrans chargent, ecriture Reglages testee |
| `site_lecteur` / `site_ecrivain` / 4 RPC / `service_role` / `anon` | ✅ INTOUCHES | site public 200, site_lecteur lit 101 produits ; 4 RPC executables par site_ecrivain |

## Etage 2 — donnees (additif direct + preuves)

| Element | Etat | Preuve |
|---|---|---|
| 0036 : isolation client (`auth_user_id`, `mon_client_id()`, policies client, `client_preference`) | ✅ | un client rattache voit 9 ventes (0 des autres), 1 client, 0 table interne, 8 reglements ; chef intact (738/15/72) |
| 0037 : fidelite (opt-in, `parametre_fidelite`, `fidelite_redemption`, vue `v_fidelite_client`) | ✅ | vue == compte direct (5 == 5) ; config seed 10 / « 1 plat offert » |
| 0038 : create-or-match email prioritaire strict | ✅ | 4 scenarios : email match ; tel + email vide -> rattache (email intact) ; tel + email different -> NOUVEAU client, tel nul (pas de mauvais destinataire) ; frais -> nouveau |
| **0039 : write-path client (RPC rattachement email verifie + opt-in date + maj profil)** | ✅ | SECURITY DEFINER self-scope, EXECUTE authenticated only, garde est_chef. Prouve (dry-run + live) : rattachement par email verifie -> mon_client_id + isolation 9/738 ; no-match -> particulier ; opt-in non retroactif (0 vs 5) ; maj self-scope (client B intact) |

## Etage 2 — CODE

> Premisse initiale « aucune migration » NON tenue, a raison : le backend livre n'avait aucun write-path client (policies `client` SELECT only, `mon_client_id()` NULL avant rattachement) -> **0039** (feu vert + dry-run) ; et l'activation des signups a expose une faille du trigger -> **0040** (correctif securite, feu vert + dry-run). Les deux appliquees + prouvees en prod.

### Fait (Etage 2a — socle)
- ✅ **Write-path client (0039)** : rattachement par email VERIFIE (param-free) + opt-in date + maj profil self-scope. Applique + prouve.
- ✅ **Correctif securite (0040)** : trigger `handle_new_user` fail-closed. Applique + prouve. Etat final : trigger fail-closed + signups ON.
- ✅ **Infra auth site** : `@supabase/ssr` server-only (aucun nouveau secret, jamais NEXT_PUBLIC), `proxy.ts` cadre `/compte` (vitrine intacte), Server Actions inscription (`kind='client'`) / connexion / deconnexion, callback confirmation (PKCE `?code=` + `verifyOtp ?token_hash=`) -> rattachement + opt-in, ecrans SOCLE (connexion + /compte). **Build + lint verts des 2 apps.**
- ✅ **Atelier `/login`** : action `signUp` non cablee supprimee (aurait provisionne un chef) + commentaires corriges.
- ☐ **E2E socle A VALIDER** (test humain Arnaud) : inscription -> mail -> lien -> rattachement -> isolation, a 390/1440. Prerequis Arnaud : autoriser `.../compte/auth/callback` (localhost:3002 + aleonmange.app) dans Supabase Auth > Redirect URLs ; redemarrer le dev.

### Fait (Phase B) — cf. sections "Phase B" ci-dessous
- ✅ **4 ecrans maquette CD** (d-login, d-compte, d-cmd + re-commande 1-geste, d-profil) + entree « Mon compte » en-tete.
- ✅ **Atelier fiche client** : palier `v_fidelite_client` + geste « appliquer recompense » (`fidelite_redemption`).
- ✅ **E2E data-path** (compteur derive, re-commande attachee/chef-gated, opt-in non retroactif, isolation) + **tableau de conformite ecran par ecran**.
- ✅ **Correctif securite constat C** (garde Atelier exige `app_role=equipe`) HOTFIXE en prod (main) + **Fix B** (redirect/site_url separe site/Atelier).

### Reste
- ☐ **Validation visuelle 390/1440** + parcours re-commande live (Arnaud, compte reel).
- ✅ **STOP final FAIT (2026-07-20)** : merge `--no-ff` `0223acd` ; 2 deploiements Vercel READY ; test prod E2E Arnaud OK. Donnees de demo conservees (nettoyage = backlog pre-ouverture).

## Phase B — ecrans espace client + fiche client Atelier (conformite CD ecran par ecran)

> Legende : ✅ present/conforme · ⚠ ecart VOLONTAIRE signale · ☐ a valider (visuel).
> Reference : maquette CD `docs/handoff-site/A_Leon_Mange_-_Site_desktop.html` (ecrans d-login/d-compte/d-cmd/d-profil), extraite dans le detail. Build + lint verts des 2 apps.

**d-login (`/compte/connexion`)** : ✅ onglets Creer/Se connecter (creation par defaut, comme la maquette) · ✅ champs Prenom/Nom/Email (helper "cle fidelite")/Mot de passe · ✅ 2 consentements (fidelite -> opt-in au rattachement ; newsletter -> double opt-in) + note RGPD · ✅ panneau sombre "Pourquoi un compte" (3 atouts + "aucun paiement en ligne, donnees jamais revendues") · ✅ CTA "Creer mon compte".

**d-compte (`/compte`)** : ✅ Bonjour {prenom} + avatar initiales · ✅ carte fidelite a tampons (compteur DERIVE `v_fidelite_client`, gros nombre = passages, tampons = cycle) · ✅ conditionnel "Plus que X avant recompense" / "Recompense disponible" · ✅ info "comptes au retrait, boutique+truck, traiteur exclu" + exemple seuil parametrable · ✅ nav Tableau de bord/Mon profil/Mes preferences · ✅ Mes commandes (chips Toutes/Boutique/Food truck, filtre client-side) · ✅ cartes (canal+date, resume articles, badge statut + "+1 passage", Recommander) · ✅ carte web en attente (pointillee) "A confirmer par le chef" + note V2 · ✅ statut VERROUILLE "En attente de confirmation par l'atelier". ⚠ avatar image (demo) -> initiales (jamais de photo client). ⚠ reference = 8 premiers de l'id (comme la confirmation de precommande), pas le "ALM-XXXX" de demo.

**d-cmd (`/compte/commande/[ref]`)** : ✅ retour "Mes commandes" · ✅ titre "Commande du {date}" + "CANAL · #ref" · ✅ liste articles (libelle, xqte/poids, montant) · ✅ Total + "paiement au retrait ; V2 non actif" · ✅ panneau "Envie de la meme chose ?" + "Recommander cette commande" -> recompose le panier (memes produit_id/qte, produits indisponibles filtres) + choix du creneau -> `/api/commande` (web_a_confirmer) · ✅ etat succes "Demande envoyee" + note retrait/confirmation. ⚠ la maquette suggere un 1-clic ; j'ajoute le choix du creneau, CONFORME au texte "vous choisissez juste le creneau".

**d-profil (`/compte/profil`)** : ✅ header avatar + nom + "Membre fidelite depuis {mois annee}" + retour tableau de bord · ✅ Coordonnees : Prenom/Nom/Telephone EDITABLES (`web_maj_profil_client`), Email lecture seule (badge cle fidelite), Code postal · ✅ Consentements : Programme fidelite (toggle fonctionnel, date non retroactive), Newsletter · ✅ Se deconnecter · ✅ Preferences (Gouts multi, Emplacement favori = emplacements reels, Frequence) + Enregistrer, STOCKEES `client_preference` non exploitees + note "pas de personnalisation encore". ⚠ **Code postal en lecture seule** (le write-path 0039 couvre nom/telephone/opt-in ; CP editable = evolution RPC si souhaitee). ⚠ **Newsletter = action "S'abonner"** (l'etat d'abonnement n'est pas lu cote client en V1 ; desinscription via le lien des emails). ⚠ **"Supprimer mon compte" = demande par email** (`aleonmange@yahoo.com`) : pas de write-path de suppression (necessiterait une RPC SECURITY DEFINER, hors scope Phase B code-only) ; a cabler en migration si souhaite.

**Atelier fiche client (`/clients`)** : ✅ palier `v_fidelite_client` (passages, cycle/seuil, disponibles) affiche (badge "recompense" dans la table + section dans le drawer d'edition) · ✅ geste chef "Appliquer une recompense" (insert `fidelite_redemption`, operateur_id = chef, RLS est_chef, recompense NON monetaire, compteur reste derive). ⚠ integre a l'ecran /clients existant (table + drawer), pas un nouvel ecran.

**Ecarts volontaires globaux** : tirets cadratins retires de TOUTE la copie CD (regle zero cadratin) ; catalogue/exemples de la maquette = demo, non portes (transactionnel reel).

## Phase B — E2E (preuves)

- ✅ **Compteur DERIVE + opt-in non retroactif** (dry-run BEGIN/ROLLBACK) : opt-in date=maintenant -> passages 0 malgre 5 retraits passes ; seuil=5 -> disponibles 1 ; apres `fidelite_redemption` -> disponibles 0 (jamais stocke).
- ✅ **Re-commande 1-geste** (dry-run) : `web_creer_precommande` avec l'email du client connecte -> vente attachee au bon client, `web_a_confirmer`, source `web`, montant RECALCULE (4.50), AUCUN passage credite.
- ✅ **Isolation client** : prouvee (0039 + test manuel Arnaud : un compte ne voit que ses donnees).
- ✅ **Build + lint + tsc verts** des 2 apps ; routes `/compte/*` dynamiques, vitrine publique intacte.
- ✅ **VALIDE (2026-07-20)** : rendu 390/1440 des 4 ecrans + parcours re-commande live par Arnaud (compte reel) OK, visuels conformes. Responsive (grilles `md:`/`sm:` empilees en mobile).

## Migrations de la vague (toutes appliquees en prod, rollback en pied de fichier)

`0034_rls_appartenance_hook` · `0035_rls_est_chef` · `0036_espace_client` · `0037_fidelite` · `0038_precommande_match_email_prioritaire` · `0039_espace_client_rpc` · `0040_handle_new_user_fail_closed`.
