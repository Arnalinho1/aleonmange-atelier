#!/usr/bin/env node
/**
 * PURGE DU JEU DE DÉMONSTRATION — coupure temporelle.
 *
 * Supprime TOUTES les lignes créées à partir de <T0> (created_at ≥ T0 —
 * l'horloge d'écriture, jamais occurred_at), dans l'ordre des dépendances.
 * Ne touche NI les 3 emplacements réels, NI le compte owner, NI les enums,
 * NI aucune ligne antérieure à T0.
 *
 * ⚠ Tout ce qui a été créé APRÈS T0 part aussi — y compris d'éventuelles
 * saisies manuelles faites pendant la démo.
 *
 * Usage : OWNER_EMAIL=... OWNER_PWD=... node scripts/demo/purger.mjs "<T0 ISO>"
 * (T0 est loggé en tête d'injection et dans scripts/demo/derniere-injection.txt)
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const env = Object.fromEntries(
  readFileSync(join(RACINE, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const OWNER_EMAIL = process.env.OWNER_EMAIL;
const OWNER_PWD = process.env.OWNER_PWD;
const T0 = process.argv[2];
if (!T0 || Number.isNaN(new Date(T0).getTime())) {
  throw new Error('Borne T0 requise, ex. : node scripts/demo/purger.mjs "2026-07-12T09:00:00.000000+00:00"');
}
if (!OWNER_EMAIL || !OWNER_PWD) throw new Error("OWNER_EMAIL et OWNER_PWD requis en variables d'environnement.");

let token = null;
async function login() {
  const r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PWD }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error("Login owner échoué.");
  token = d.access_token;
}
async function rest(method, chemin) {
  const r = await fetch(`${URL_BASE}/rest/v1/${chemin}`, {
    method,
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, Prefer: method === "DELETE" ? "return=representation" : "" },
  });
  const texte = await r.text();
  if (!r.ok) throw new Error(`${method} ${chemin} → ${r.status}: ${texte.slice(0, 300)}`);
  return texte ? JSON.parse(texte) : [];
}

async function principal() {
  await login();
  const borne = encodeURIComponent(new Date(T0).toISOString());
  console.log(`Purge de tout ce qui a été créé à partir de : ${T0}`);
  console.log("─".repeat(72));

  // Ordre des dépendances. vente_ligne + vente_ligne_composant CASCADENT avec
  // vente ; recette_composant CASCADE avec recette ; seuil_stock avec composant.
  const etapes = [
    ["fulfillment_event", `fulfillment_event?created_at=gte.${borne}`],
    ["vente (+ lignes & dépliages en cascade)", `vente?created_at=gte.${borne}`],
    ["mouvement_stock", `mouvement_stock?created_at=gte.${borne}`],
    ["releve_haccp", `releve_haccp?created_at=gte.${borne}`],
    ["lot", `lot?created_at=gte.${borne}`],
    ["social_post", `social_post?created_at=gte.${borne}`],
    ["notification", `notification?created_at=gte.${borne}`],
    ["insight", `insight?created_at=gte.${borne}`],
    ["produit", `produit?created_at=gte.${borne}`],
    ["recette (+ recette_composant en cascade)", `recette?created_at=gte.${borne}`],
    ["composant (+ seuil_stock en cascade)", `composant?created_at=gte.${borne}`],
    ["client", `client?created_at=gte.${borne}`],
    ["parametre_rentabilite (via updated_at)", `parametre_rentabilite?updated_at=gte.${borne}`],
  ];
  let total = 0;
  for (const [libelle, chemin] of etapes) {
    const supprimees = await rest("DELETE", chemin);
    total += supprimees.length;
    console.log(`  ${String(supprimees.length).padStart(5)} × ${libelle}`);
  }
  console.log("─".repeat(72));
  console.log(`Total : ${total} lignes supprimées.`);

  // Intégrité de ce qui doit SURVIVRE
  const emplacements = await rest("GET", "emplacement?select=code&order=jour_semaine");
  const profils = await rest("GET", "profil?select=nom,role");
  console.log(`Intacts — emplacements : ${emplacements.map((e) => e.code).join(", ")} · profils : ${profils.map((p) => `${p.nom} (${p.role})`).join(", ")}`);
  console.log("PURGE : OK");
}

principal().catch((e) => { console.error(String(e?.stack ?? e)); process.exit(1); });
