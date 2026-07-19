# Conformite Vague 4 (refonte RLS + espace client & fidelite) · BACKEND · 2026-07-19

> Legende : ✅ fait et PROUVE (requetes sous role) · ☐ A CODER (Etage 2 code).
> Etat : **BACKEND fini, prouve, committe sur `site-vague-4`** (migrations 0034-0038 APPLIQUEES EN PROD). Branche **POUSSEE, NON mergee** ; main = Vagues 1-3 + hotfix + images. Modele de securite : `ARCHITECTURE.md` section Vague 4.

## Etage 1 — refonte RLS (semi-supervise strict, invariants respectes)

| Element | Etat | Preuve |
|---|---|---|
| 0034 : hook + `est_chef()` + trigger `handle_new_user` durci | ✅ | dry-run 6 preuves : hook stampe `app_role=equipe` pour un profil / null sinon ; est_chef true/false (fail-closed) ; trigger `kind=client` -> 0 profil, invitation -> 1 profil |
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

## Etage 2 — CODE (RESTE A FAIRE ; aucune migration, aucun STOP DB)

- ☐ **Auth Supabase site** : `@supabase/ssr`, route signup `kind='client'` (-> pas de profil) + rattachement `auth_user_id` par create-or-match email, middleware `/compte`.
- ☐ **4 ecrans client** : connexion/creation (opt-in fidelite + newsletter), tableau de bord + carte fidelite (tampons `N/seuil`), detail + re-commande 1-geste, profil + preferences (gouts, emplacement favori, frequence — stockees, non exploitees).
- ☐ **Atelier fiche client** : palier via `v_fidelite_client` + geste « appliquer recompense » (ecrit un `fidelite_redemption`).
- ☐ **E2E** (390/1440 ; compteur derive ; isolation client ; re-commande 1-geste ; opt-in date) + **STOP final avant merge**.
- **PREREQUIS Arnaud** : toggle Supabase Auth « Allow new users to sign up » (Authentication > Sign In / Providers).

## Migrations de la vague (toutes appliquees en prod, rollback en pied de fichier)

`0034_rls_appartenance_hook` · `0035_rls_est_chef` · `0036_espace_client` · `0037_fidelite` · `0038_precommande_match_email_prioritaire`.
