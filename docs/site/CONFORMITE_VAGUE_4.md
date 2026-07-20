# Conformite Vague 4 (refonte RLS + espace client & fidelite) · BACKEND + SOCLE AUTH · 2026-07-19

> Legende : ✅ fait et PROUVE (requetes sous role / build) · ☐ RESTE.
> Etat : **BACKEND + SOCLE AUTH faits** sur `site-vague-4` (migrations **0034-0040** APPLIQUEES EN PROD ; infra auth `@supabase/ssr` buildee). Reste la **Phase B** (4 ecrans maquette + fiche client Atelier + E2E + conformite). Branche **POUSSEE, NON mergee** ; main = Vagues 1-3 + hotfix + images. Modele de securite : `ARCHITECTURE.md` section Vague 4.

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

### Reste (Phase B — apres validation du socle)
- ☐ **4 ecrans maquette CD** : d-login (panneau « Pourquoi un compte »), d-compte (carte fidelite a tampons `N/seuil`, chips, re-commande 1-geste), d-cmd (detail + re-commande), d-profil (coordonnees Email=cle lecture seule, consentements, preferences gouts/emplacement/frequence stockees). + entree « Mon compte » dans l'en-tete.
- ☐ **Atelier fiche client** : palier via `v_fidelite_client` + geste « appliquer recompense » (insert `fidelite_redemption`).
- ☐ **E2E complet** (compteur derive, isolation, re-commande 1-geste, opt-in date) + **tableau de conformite ecran par ecran** + **STOP final avant merge**.

## Migrations de la vague (toutes appliquees en prod, rollback en pied de fichier)

`0034_rls_appartenance_hook` · `0035_rls_est_chef` · `0036_espace_client` · `0037_fidelite` · `0038_precommande_match_email_prioritaire` · `0039_espace_client_rpc` · `0040_handle_new_user_fail_closed`.
