#!/usr/bin/env node
/**
 * INJECTION DU JEU DE DÉMONSTRATION — Atelier ALM.
 *
 * ⚠ ARTEFACT DE DÉMO, HORS CHEMIN DE LANCEMENT : jamais référencé par les
 * migrations, le seed ou l'app. Le transactionnel de PROD naît vide (brief §6).
 * Réversible par coupure temporelle : voir purger.mjs et le T0 loggé en tête.
 *
 * Source : handoff/ALM_Carte_Demo.json (liste FERMÉE — 100 produits, 63
 * composants dont « sel » jamais utilisé). Écritures via l'API REST
 * AUTHENTIFIÉE OWNER (RLS active), avec les mêmes invariants que les server
 * actions de l'app : montants recalculés, montant_total = Σ lignes,
 * fulfillment dérivé du mode_vente, bowls dépliés (signature = recette_id,
 * libre = NULL), transitions journalisées dans fulfillment_event.
 *
 * Usage : OWNER_EMAIL=... OWNER_PWD=... node scripts/demo/injecter.mjs [--force]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// ── Config (jamais commitée) ─────────────────────────────────────────────
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
if (!URL_BASE || !ANON) throw new Error(".env.local incomplet (URL / clé anon).");
if (!OWNER_EMAIL || !OWNER_PWD) throw new Error("OWNER_EMAIL et OWNER_PWD requis en variables d'environnement.");

// ── RNG déterministe (reproductible) ─────────────────────────────────────
let graine = 20260712;
function alea() {
  graine |= 0; graine = (graine + 0x6d2b79f5) | 0;
  let t = Math.imul(graine ^ (graine >>> 15), 1 | graine);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const entre = (min, max) => min + alea() * (max - min);
const entier = (min, max) => Math.floor(entre(min, max + 1));
const choix = (arr) => arr[Math.floor(alea() * arr.length)];
const rond2 = (n) => Math.round(n * 100) / 100;

// ── REST authentifié owner (RLS active — mêmes droits que l'app) ─────────
let token = null;
let ownerId = null;
async function login() {
  const r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PWD }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error(`Login owner échoué: ${JSON.stringify(d).slice(0, 200)}`);
  token = d.access_token;
  ownerId = d.user?.id ?? null;
}
async function rest(method, chemin, corps) {
  const r = await fetch(`${URL_BASE}/rest/v1/${chemin}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: method === "GET" ? "" : "return=representation",
    },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const texte = await r.text();
  if (!r.ok) throw new Error(`${method} ${chemin} → ${r.status}: ${texte.slice(0, 300)}`);
  return texte ? JSON.parse(texte) : [];
}
const get = (c) => rest("GET", c);
const del = (c) => rest("DELETE", c);
/** Insert par lots de 200 (uniformise les clés — exigence PostgREST). */
async function inserer(table, lignes, lot = 200) {
  if (lignes.length === 0) return [];
  const cles = [...new Set(lignes.flatMap((l) => Object.keys(l)))];
  const uniformes = lignes.map((l) => Object.fromEntries(cles.map((k) => [k, l[k] ?? null])));
  const crees = [];
  for (let i = 0; i < uniformes.length; i += lot) {
    crees.push(...(await rest("POST", table, uniformes.slice(i, i + lot))));
  }
  return crees;
}

// ── Utilitaires temps (Europe/Paris, été = +02:00 sur toute la fenêtre) ──
const fmtJour = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });
const jourISO = (d) => fmtJour.format(d);
/** ISO à l'heure de Paris. hf = heure décimale (ex. 12.25 = 12h15). */
function parisISO(jour, hf) {
  const h = Math.floor(hf);
  const m = Math.floor((hf - h) * 60);
  return new Date(`${jour}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(entier(0, 59)).padStart(2, "0")}+02:00`).toISOString();
}
const jourSemaine = (jour) => {
  // 1=lundi … 7=dimanche pour une date YYYY-MM-DD
  const js = new Date(`${jour}T12:00:00Z`).getUTCDay();
  return js === 0 ? 7 : js;
};
const decale = (jour, n) => jourISO(new Date(new Date(`${jour}T12:00:00Z`).getTime() + n * 86400000));

// ── Référentiels du script ───────────────────────────────────────────────
const CAT_ENUM = { legumes_fruits: "legume", proteines: "proteine", feculents_bases: "feculent", produits_laitiers: "sauce", epicerie: "sauce" };
const UNITE = { oeuf: "piece", citron: "piece", blinis: "piece", "pain burger mini": "piece", "pain sandwich": "piece", lait: "l" };
const COUTS = {
  "saumon frais": 22, "boeuf hache": 12.5, "poulet (escalope)": 9.5, "jambon blanc": 11, lardons: 10,
  "thon (boite)": 12, "chair a saucisse": 8, mozzarella: 8.5, parmesan: 18, "gruyere rape": 12,
  mascarpone: 7, "creme fraiche": 4.2, beurre: 8.5, lait: 1.2, "fromage frais": 6.5, "chocolat noir": 12,
  "amandes (poudre)": 14, farine: 1.2, sucre: 1.6, riz: 2.6, "pates (coquillettes)": 2.1, semoule: 1.9,
  boulgour: 2.8, "lentilles vertes": 3.2, "pois chiches": 2.6, "pate feuilletee": 4.2, "pate a pizza": 3.1,
  "pate a quiche": 3.4, "pate a choux": 4.0, "sauce tomate": 2.6, "huile d'olive": 8.5, mayonnaise: 4.1,
  moutarde: 3.6, tahini: 9.5, "olives noires": 6.2, curry: 15, poivre: 24, "herbes de Provence": 19,
  "vinaigre balsamique": 4.5, oeuf: 6.2, citron: 3.2, blinis: 7.5, "pain burger mini": 6.8, "pain sandwich": 4.4,
  "lasagne (plaques)": 3.4, chapelure: 2.4, "fruits de saison": 3.8, sel: 0.8,
};
const COUT_DEFAUT = { legumes_fruits: 2.8, proteines: 11, feculents_bases: 2.2, produits_laitiers: 4.5, epicerie: 5.5 };
const FAMILLE_LABEL = {
  charcuterie_aperitif: "Charcuterie & apéritif", plats_prepares: "Plats préparés", plats_composes: "Plats composés",
  libre_service: "Libre-service", pieces_salees_froides: "Pièces salées froides", pieces_salees_chaudes: "Pièces salées chaudes",
  pieces_sucrees: "Pièces sucrées", bowls: "Bowls", plats_prepares_truck: "Plats préparés", complementaires_truck: "Complémentaires",
};
const PRENOMS_CLIENTS = [
  ["Mairie de Theizé", "pro"], ["Cave du Bois d'Oingt", "pro"], ["Domaine des Pierres Dorées", "pro"],
  ["Comité des fêtes de Tassin", "pro"], ["Atelier Braud Architecture", "pro"], ["École de Salvagny", "pro"],
  ["Marie Lambert", "particulier"], ["Julien Perret", "particulier"], ["Sofia Nguyen", "particulier"],
  ["Claire Dubois", "particulier"], ["Antoine Rivière", "particulier"], ["Louise Charvet", "particulier"],
  ["Hugo Martin", "particulier"], ["Emma Girard", "particulier"], ["Nadia Belkacem", "particulier"],
];

// ═══════════════════════════════════════════════════════════════════════
async function principal() {
  const force = process.argv.includes("--force");
  await login();
  console.log(`Connecté en owner (${OWNER_EMAIL}).`);

  // ── Garde anti-double-injection
  const sentinelles = ["Bowl saumon", "Croque-monsieur", "Quiche lorraine (part)"];
  const deja = await get(`produit?select=nom&nom=in.(${sentinelles.map((s) => `"${s}"`).join(",")})`);
  if (deja.length > 0 && !force) {
    throw new Error(`Des produits de la démo existent déjà (${deja.map((x) => x.nom).join(", ")}). Purge d'abord, ou --force.`);
  }

  // ── T0 : horloge de la BASE (sonde insérée puis retirée — jamais l'horloge locale)
  const [sonde] = await inserer("client", [{ nom: "__SONDE_T0_DEMO__", type: "pro", actif: false }]);
  const T0 = sonde.created_at;
  await del(`client?id=eq.${sonde.id}`);
  console.log("═".repeat(72));
  console.log(`T0 (borne de purge, horloge base) : ${T0}`);
  console.log("═".repeat(72));
  writeFileSync(join(RACINE, "scripts/demo/derniere-injection.txt"), `${T0}\n`);

  // ── Charge la carte
  const carte = JSON.parse(readFileSync(join(RACINE, "handoff/ALM_Carte_Demo.json"), "utf8"));

  // ── a) Composants (63, liste fermée, dédup par nom)
  const composantsSrc = [];
  for (const [famille, items] of Object.entries(carte.composants_communs)) {
    if (famille === "_note") continue;
    for (const nom of items) {
      if (composantsSrc.some((c) => c.nom === nom)) continue; // dédup
      composantsSrc.push({
        nom,
        categorie: CAT_ENUM[famille],
        unite: UNITE[nom] ?? "kg",
        cout_matiere_kg: COUTS[nom] ?? COUT_DEFAUT[famille],
        famille_cc: famille,
      });
    }
  }
  const composants = await inserer("composant", composantsSrc.map((c) => ({ nom: c.nom, categorie: c.categorie, unite: c.unite, cout_matiere_kg: c.cout_matiere_kg })));
  const compParNom = new Map(composants.map((c) => [c.nom, c]));
  console.log(`composants créés : ${composants.length}`);

  // ── b) Fiches techniques (72 transformés) + c) 100 produits
  const produitsSrc = [];
  for (const [canal, cd] of Object.entries(carte.canaux)) {
    for (const [famille, fd] of Object.entries(cd.familles)) {
      for (const p of fd.produits) {
        produitsSrc.push({ ...p, canal, famille });
      }
    }
  }
  const transformes = produitsSrc.filter((p) => p.transforme);
  const recettes = await inserer(
    "recette",
    transformes.map((p) => {
      const multi = p.nom.match(/x\s?(\d+)/i);
      return { nom: p.nom, rendement: multi ? Number(multi[1]) : 1, etapes: [], is_virtuelle: false };
    })
  );
  const recetteParNom = new Map(recettes.map((r) => [r.nom, r]));
  const lignesRecette = transformes.flatMap((p) =>
    p.recette.map((r) => {
      const comp = compParNom.get(r.composant);
      if (!comp) throw new Error(`Composant introuvable: ${r.composant}`);
      return { recette_id: recetteParNom.get(p.nom).id, composant_id: comp.id, quantite: r.g, categorie: comp.categorie };
    })
  );
  await inserer("recette_composant", lignesRecette);
  console.log(`fiches techniques : ${recettes.length} (+${lignesRecette.length} lignes)`);

  const produits = await inserer(
    "produit",
    produitsSrc.map((p) => ({
      nom: p.nom,
      categorie: FAMILLE_LABEL[p.famille] ?? p.famille,
      canal: p.canal,
      mode: p.mode_tarif,
      prix_unitaire: p.mode_tarif === "unite" ? p.prix : null,
      prix_kg: p.mode_tarif === "poids" ? p.prix_kg : null,
      is_bowl: p.canal === "truck" && p.famille === "bowls",
      recette_id: p.transforme ? recetteParNom.get(p.nom).id : null,
    }))
  );
  const parCanal = { truck: [], boutique: [], traiteur: [] };
  for (const p of produits) parCanal[p.canal].push(p);
  console.log(`produits : ${produits.length} (truck ${parCanal.truck.length} · boutique ${parCanal.boutique.length} · traiteur ${parCanal.traiteur.length})`);

  // ── Clients (15)
  const clients = await inserer(
    "client",
    PRENOMS_CLIENTS.map(([nom, type], i) => ({
      nom, type,
      email: type === "pro" ? `contact@${nom.toLowerCase().replace(/[^a-z]+/g, "-").slice(0, 18)}.fr` : null,
      telephone: `06 ${String(entier(10, 99))} ${String(entier(10, 99))} ${String(entier(10, 99))} ${String(entier(10, 99))}`,
      code_postal: choix(["69620", "69160", "69890", "69400"]),
      notes: i === 0 ? "Commandes récurrentes pour les événements municipaux." : null,
    }))
  );
  const pros = clients.filter((c) => c.type === "pro");
  console.log(`clients : ${clients.length}`);

  // ── Paramètres de rentabilité (seulement si absents)
  const paramsExistants = await get("parametre_rentabilite?select=id");
  if (paramsExistants.length === 0) {
    await inserer("parametre_rentabilite", [{ id: true, mo_par_portion: 2.0, transport_par_portion: 0.5 }]);
    console.log("parametre_rentabilite : créé (2,00 + 0,50 €/portion)");
  } else {
    console.log("parametre_rentabilite : déjà présent — intouché");
  }

  // ── Emplacements réels (lecture seule)
  const emplacements = await get("emplacement?select=*&actif=eq.true&order=jour_semaine");
  const empParJour = new Map(emplacements.map((e) => [e.jour_semaine, e]));

  // ── Fenêtre métier : 35 jours pleins, J-35 → J-1
  const aujourdhui = jourISO(new Date());
  const jours = [];
  for (let i = 35; i >= 1; i--) jours.push(decale(aujourdhui, -i));

  // ── d) VENTES (mêmes invariants que l'app) ────────────────────────────
  const ventesSrc = []; // { vente, lignes: [{ligne, comps[]}] }
  const bowls = parCanal.truck.filter((p) => p.is_bowl);
  const truckAutres = parCanal.truck.filter((p) => !p.is_bowl);
  const recetteComps = new Map(); // recette_id -> [{composant_id, categorie}]
  for (const l of lignesRecette) {
    const arr = recetteComps.get(l.recette_id) ?? [];
    arr.push({ composant_id: l.composant_id, categorie: l.categorie });
    recetteComps.set(l.recette_id, arr);
  }
  /** Dépliage bowl : 1 composant par catégorie depuis la fiche (règle UI). */
  function compsSignature(recetteId) {
    const vus = new Set();
    return (recetteComps.get(recetteId) ?? []).filter((c) => !vus.has(c.categorie) && vus.add(c.categorie));
  }
  const protByCat = composants.filter((c) => c.categorie === "proteine");

  function ligneUnite(produit, qte) {
    return {
      type: produit.is_bowl ? "bowl" : "produit", mode: "unite", produit_id: produit.id,
      recette_id: produit.is_bowl ? produit.recette_id : null, libelle: produit.nom,
      qte, prix_unitaire: produit.prix_unitaire, poids_g: null, prix_kg: null,
      montant: rond2(produit.prix_unitaire * qte),
    };
  }
  function lignePoids(produit, g) {
    return {
      type: "produit", mode: "poids", produit_id: produit.id, recette_id: null, libelle: produit.nom,
      qte: null, prix_unitaire: null, poids_g: g, prix_kg: produit.prix_kg,
      montant: rond2((produit.prix_kg * g) / 1000),
    };
  }

  // Truck : sessions les jours de marché des 3 emplacements réels
  for (const jour of jours) {
    const emp = empParJour.get(jourSemaine(jour));
    if (!emp) continue;
    const semaine = Math.floor(jours.indexOf(jour) / 7);
    const n = entier(16, 24) + semaine; // légère croissance sur 5 semaines
    for (let i = 0; i < n; i++) {
      const lignes = [];
      const comps = [];
      if (alea() < 0.62) {
        const bowl = choix(bowls);
        const l = ligneUnite(bowl, 1);
        let cs = compsSignature(bowl.recette_id);
        if (alea() < 0.2) {
          // composition libre : change la protéine → recette_id NULL (reco §7.5)
          const autre = choix(protByCat);
          cs = cs.map((c) => (c.categorie === "proteine" ? { composant_id: autre.id, categorie: "proteine" } : c));
          l.recette_id = null;
        }
        lignes.push(l);
        comps.push(cs);
      } else {
        lignes.push(ligneUnite(choix(truckAutres.filter((p) => p.recette_id)), entier(1, 2)));
        comps.push([]);
      }
      if (alea() < 0.35) {
        lignes.push(ligneUnite(choix(truckAutres.filter((p) => !p.recette_id)), 1));
        comps.push([]);
      }
      ventesSrc.push({
        vente: {
          occurred_at: parisISO(jour, entre(11.5, 13.9)),
          canal: "truck", emplacement_id: emp.id,
          montant_total: rond2(lignes.reduce((a, l) => a + l.montant, 0)),
          couverts: null, client_id: null,
          moyen_paiement: alea() < 0.45 ? "especes" : alea() < 0.85 ? "cb" : "ticket",
          origine: alea() < 0.78 ? "spontane" : choix(["insta", "tiktok", "facebook", "code"]),
          mode_vente: "instantane", fulfillment: "remis", source_vente: "manuel", due_at: null,
        },
        lignes, comps, events: [],
      });
    }
  }

  // Boutique : mardi → samedi, vendredi/samedi plus chargés
  const produitsBoutiqueU = parCanal.boutique.filter((p) => p.mode === "unite");
  const produitsBoutiqueP = parCanal.boutique.filter((p) => p.mode === "poids");
  for (const jour of jours) {
    const js = jourSemaine(jour);
    if (js === 1 || js === 7) continue; // fermé dimanche/lundi
    const n = js >= 5 ? entier(15, 22) : entier(9, 15);
    for (let i = 0; i < n; i++) {
      const lignes = [];
      const nl = alea() < 0.55 ? 1 : alea() < 0.85 ? 2 : 3;
      for (let k = 0; k < nl; k++) {
        if (alea() < 0.38 && produitsBoutiqueP.length) {
          lignes.push(lignePoids(choix(produitsBoutiqueP), entier(180, 850))); // pesée réelle en g
        } else {
          lignes.push(ligneUnite(choix(produitsBoutiqueU), entier(1, 3)));
        }
      }
      ventesSrc.push({
        vente: {
          occurred_at: parisISO(jour, entre(9.5, 18.8)),
          canal: "boutique", emplacement_id: null,
          montant_total: rond2(lignes.reduce((a, l) => a + l.montant, 0)),
          couverts: null,
          client_id: alea() < 0.14 ? choix(clients).id : null,
          moyen_paiement: alea() < 0.68 ? "cb" : alea() < 0.9 ? "especes" : "ticket",
          origine: alea() < 0.88 ? "spontane" : choix(["insta", "facebook"]),
          mode_vente: "instantane", fulfillment: "remis", source_vente: "manuel", due_at: null,
        },
        lignes, comps: lignes.map(() => []), events: [],
      });
    }
  }

  // Ventes du JOUR de la démo — l'app doit paraître vivante le jour J
  // (occurred_at borné à l'heure courante, jamais dans le futur).
  {
    const partiesHeure = new Intl.DateTimeFormat("fr-FR", { hour: "numeric", minute: "numeric", hourCycle: "h23", timeZone: "Europe/Paris" })
      .format(new Date()).split(":").map(Number);
    const hMax = Math.min(18.8, partiesHeure[0] + partiesHeure[1] / 60 - 0.25);
    if (hMax > 9.8) {
      for (let i = 0, n = entier(8, 12); i < n; i++) {
        const lignes = [];
        const nl = alea() < 0.6 ? 1 : 2;
        for (let k = 0; k < nl; k++) {
          if (alea() < 0.35 && produitsBoutiqueP.length) lignes.push(lignePoids(choix(produitsBoutiqueP), entier(180, 850)));
          else lignes.push(ligneUnite(choix(produitsBoutiqueU), entier(1, 2)));
        }
        ventesSrc.push({
          vente: {
            occurred_at: parisISO(aujourdhui, entre(9.5, hMax)),
            canal: "boutique", emplacement_id: null,
            montant_total: rond2(lignes.reduce((a, l) => a + l.montant, 0)),
            couverts: null, client_id: null,
            moyen_paiement: alea() < 0.68 ? "cb" : "especes",
            origine: "spontane", mode_vente: "instantane", fulfillment: "remis", source_vente: "manuel", due_at: null,
          },
          lignes, comps: lignes.map(() => []), events: [],
        });
      }
      const empAuj = empParJour.get(jourSemaine(aujourdhui));
      if (empAuj && hMax > 12.2) {
        for (let i = 0, n = entier(5, 8); i < n; i++) {
          const bowl = choix(bowls);
          const l = ligneUnite(bowl, 1);
          ventesSrc.push({
            vente: {
              occurred_at: parisISO(aujourdhui, entre(11.5, Math.min(13.9, hMax))),
              canal: "truck", emplacement_id: empAuj.id,
              montant_total: l.montant, couverts: null, client_id: null,
              moyen_paiement: alea() < 0.5 ? "especes" : "cb",
              origine: alea() < 0.8 ? "spontane" : "insta",
              mode_vente: "instantane", fulfillment: "remis", source_vente: "manuel", due_at: null,
            },
            lignes: [l], comps: [compsSignature(bowl.recette_id)], events: [],
          });
        }
      }
    }
  }

  // Traiteur : 24 précommandes — 18 remises (cycle complet journalisé), 6 ouvertes
  const produitsTraiteur = parCanal.traiteur;
  for (let i = 0; i < 24; i++) {
    const ouverte = i >= 18;
    const saisieJour = ouverte ? decale(aujourdhui, -entier(1, 6)) : jours[entier(2, jours.length - 4)];
    const dueJour = ouverte ? decale(aujourdhui, entier(0, 6)) : decale(saisieJour, entier(2, 6));
    const occurredAt = parisISO(saisieJour, entre(9, 17.5));
    const dueAt = parisISO(dueJour, choix([9, 10.5, 11.5, 12, 15, 18]));
    const couverts = entier(10, 80);
    const lignes = [];
    const nl = entier(1, 3);
    for (let k = 0; k < nl; k++) {
      const produit = choix(produitsTraiteur);
      // Quantités À L'ÉCHELLE des couverts : ~1-2 pièces/couvert pour les
      // petites pièces, 1 plateau/plat pour ~8-15 couverts.
      const qte = produit.prix_unitaire < 5
        ? Math.max(4, Math.round(couverts * entre(0.8, 1.6)))
        : Math.max(1, Math.round(couverts / entier(8, 15)));
      lignes.push(ligneUnite(produit, qte));
    }
    const etat = ouverte ? choix2(i) : "remis";
    const events = [];
    const dueMs = new Date(dueAt).getTime();
    if (etat !== "a_produire") events.push({ de: "a_produire", vers: "en_prod", occurred_at: new Date(dueMs - entier(18, 30) * 3600000).toISOString() });
    if (etat === "pret" || etat === "remis") events.push({ de: "en_prod", vers: "pret", occurred_at: new Date(dueMs - entier(2, 5) * 3600000).toISOString() });
    if (etat === "remis") events.push({ de: "pret", vers: "remis", occurred_at: new Date(dueMs - entier(0, 30) * 60000).toISOString() });
    ventesSrc.push({
      vente: {
        occurred_at: occurredAt, canal: "traiteur", emplacement_id: null,
        montant_total: rond2(lignes.reduce((a, l) => a + l.montant, 0)),
        couverts, client_id: choix(pros.concat(clients.slice(6, 10))).id,
        moyen_paiement: "virement", origine: alea() < 0.7 ? "spontane" : "code",
        mode_vente: "precommande", fulfillment: etat, source_vente: "manuel", due_at: dueAt,
      },
      lignes, comps: lignes.map(() => []), events,
    });
  }
  function choix2(i) { return ["a_produire", "a_produire", "en_prod", "en_prod", "pret", "pret"][i - 18]; }

  // Insertion ventes → lignes → dépliages → événements
  const ventesCreees = await inserer("vente", ventesSrc.map((v) => v.vente));
  const lignesAplaties = [];
  const compsAplatis = [];
  ventesSrc.forEach((v, iv) => {
    v.lignes.forEach((l, il) => {
      lignesAplaties.push({ ...l, vente_id: ventesCreees[iv].id });
      compsAplatis.push(v.comps[il]);
    });
  });
  const lignesCreees = await inserer("vente_ligne", lignesAplaties);
  const vlc = lignesCreees.flatMap((l, i) => compsAplatis[i].map((c) => ({ ligne_id: l.id, ...c })));
  await inserer("vente_ligne_composant", vlc);
  const events = ventesSrc.flatMap((v, iv) =>
    v.events.map((e) => ({ vente_id: ventesCreees[iv].id, ...e, operateur_id: ownerId }))
  );
  await inserer("fulfillment_event", events);
  const remises = ventesSrc.filter((v) => v.vente.fulfillment === "remis");
  const caInjecte = rond2(remises.reduce((a, v) => a + v.vente.montant_total, 0));
  console.log(`ventes : ${ventesCreees.length} (remises ${remises.length} · ouvertes ${ventesCreees.length - remises.length}) · lignes ${lignesCreees.length} · dépliages ${vlc.length} · événements ${events.length}`);

  // ── Stock : usage des composants → seuils, réceptions par lots, ajustements
  const usage = new Map();
  for (const l of lignesRecette) usage.set(l.composant_id, (usage.get(l.composant_id) ?? 0) + 1);
  const topComps = [...usage.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => composants.find((c) => c.id === id));
  await inserer("seuil_stock", topComps.slice(0, 15).map((c) => ({ composant_id: c.id, seuil_bas: c.unite === "piece" ? entier(12, 30) : rond2(entre(1.5, 4)) })));

  const lotsSrc = [];
  const mouvementsSrc = [];
  for (let sem = 0; sem < 5; sem++) {
    const lundi = decale(aujourdhui, -(35 - sem * 7 - 1) - (jourSemaine(decale(aujourdhui, -(35 - sem * 7 - 1))) - 1));
    for (const c of topComps.slice(0, 20)) {
      const frais = ["legume", "proteine"].includes(c.categorie);
      const qte = c.unite === "piece" ? entier(30, 90) : rond2(entre(2, 12));
      lotsSrc.push({
        composant_id: c.id,
        numero: `LOT-S${sem + 1}-${String(lotsSrc.length + 1).padStart(3, "0")}`,
        dlc: decale(lundi, frais ? entier(4, 10) : entier(60, 180)),
        quantite: qte, recu_le: lundi,
      });
      mouvementsSrc.push({ composant_id: c.id, type: "reception", quantite: qte, occurred_at: parisISO(lundi, entre(7, 9)), note: "Réception hebdomadaire" });
    }
  }
  // Lots de production (composants préparés) + quelques DLC proches pour la FEFO
  for (let i = 0; i < 10; i++) {
    const c = choix(topComps.slice(0, 12));
    const jour = decale(aujourdhui, -entier(0, 4));
    const qte = rond2(entre(1.5, 5));
    lotsSrc.push({ composant_id: c.id, numero: `PROD-${jour.replaceAll("-", "")}-${i}`, dlc: decale(jour, entier(1, 3)), quantite: qte, recu_le: jour });
    mouvementsSrc.push({ composant_id: c.id, type: "reception", quantite: qte, occurred_at: parisISO(jour, entre(8, 11)), note: "Lot de production" });
  }
  // Sorties de consommation (le stock vit) + ajustements d'inventaire signés
  for (const c of topComps.slice(0, 20)) {
    const sortie = c.unite === "piece" ? -entier(60, 180) : -rond2(entre(4, 28));
    mouvementsSrc.push({ composant_id: c.id, type: "sortie", quantite: sortie, occurred_at: parisISO(decale(aujourdhui, -entier(1, 6)), entre(14, 18)), note: "Consommation période (cumul)" });
  }
  for (let i = 0; i < 10; i++) {
    const c = choix(topComps.slice(0, 15));
    mouvementsSrc.push({ composant_id: c.id, type: "ajustement", quantite: rond2(entre(-1.2, 0.8)), occurred_at: parisISO(decale(aujourdhui, -entier(0, 20)), entre(18, 19)), note: "Inventaire hebdo — écart de comptage" });
  }
  const lotsCrees = await inserer("lot", lotsSrc);
  await inserer("mouvement_stock", mouvementsSrc);
  console.log(`lots : ${lotsCrees.length} · mouvements : ${mouvementsSrc.length} · seuils : 15`);

  // ── HACCP : 2 températures/jour ouvré + nettoyages + contrôles, 2 non-conformités
  const relevesSrc = [];
  let ncPlaces = 0;
  const joursNC = new Set([decale(aujourdhui, -9), decale(aujourdhui, -3)]); // NC garanties (≥1 exigée)
  for (const jour of jours) {
    const js = jourSemaine(jour);
    if (js === 1 || js === 7) continue;
    for (const [cible, base] of [["Frigo positif n°1", 3.2], ["Congélateur n°1", -19.5]]) {
      const nc = ncPlaces < 2 && joursNC.has(jour) && cible === "Frigo positif n°1";
      relevesSrc.push({
        type: "temperature", cible,
        valeur: rond2(nc ? base + entre(4, 6) : base + entre(-1.2, 1.2)),
        conforme: !nc,
        note: nc ? "Température hors plage — denrées déplacées, maintenance appelée." : null,
        occurred_at: parisISO(jour, choix([8.5, 18.5])), operateur_id: ownerId, lot_id: null,
      });
      if (nc) ncPlaces++;
    }
    if (js === 6) relevesSrc.push({ type: "nettoyage", cible: choix(["Plan de travail", "Chambre froide", "Sols cuisine", "Hotte"]), valeur: null, conforme: true, note: null, occurred_at: parisISO(jour, 19.2), operateur_id: ownerId, lot_id: null });
    if (js === 2 && alea() < 0.5) relevesSrc.push({ type: "controle", cible: "Réception marchandises", valeur: null, conforme: true, note: null, occurred_at: parisISO(jour, 8.2), operateur_id: ownerId, lot_id: null });
  }
  await inserer("releve_haccp", relevesSrc);
  console.log(`relevés HACCP : ${relevesSrc.length} (dont ${ncPlaces} non-conformités avec action)`);

  // ── Posts sociaux : 8 publiés (jours de marché), 2 programmés
  const postsSrc = [];
  const joursMarche = jours.filter((j) => empParJour.get(jourSemaine(j))).slice(-8);
  for (const jour of joursMarche) {
    const emp = empParJour.get(jourSemaine(jour));
    postsSrc.push({
      reseau: choix(["insta", "insta", "facebook", "tiktok"]),
      emplacement_id: emp.id,
      contenu: `Le truck est à ${emp.libelle} ce midi — ${choix(["bowls maison", "plat du jour mijoté", "nouveautés de saison"])} jusqu'à 14h !`,
      statut: "publie", publie_le: parisISO(jour, 9.1), programme_le: null,
    });
  }
  postsSrc.push(
    { reseau: "insta", emplacement_id: empParJour.get(2)?.id ?? null, contenu: "Demain : marché du Bois d'Oingt, pensez à précommander vos plateaux !", statut: "programme", programme_le: parisISO(decale(aujourdhui, 1), 9), publie_le: null },
    { reseau: "facebook", emplacement_id: null, contenu: "Nouvelle carte traiteur en ligne — devis événements sous 48h.", statut: "programme", programme_le: parisISO(decale(aujourdhui, 3), 10), publie_le: null }
  );
  await inserer("social_post", postsSrc);
  console.log(`posts : ${postsSrc.length} (8 publiés, 2 programmés)`);

  // ── Notifications (8) + insights (6, tagués démo)
  await inserer("notification", [
    { categorie: "stock", severite: "critique", titre: "Rupture possible : saumon frais", description: "Stock sous le seuil avant le marché de demain.", ecran: "stock", lu: false, occurred_at: parisISO(decale(aujourdhui, -1), 18.5) },
    { categorie: "dlc", severite: "critique", titre: "DLC demain : lot de production", description: "Un lot PROD arrive à DLC — rotation FEFO.", ecran: "stock", lu: false, occurred_at: parisISO(aujourdhui, 7.8) },
    { categorie: "stock", severite: "alerte", titre: "Seuil bas : poulet (escalope)", description: null, ecran: "stock", lu: false, occurred_at: parisISO(decale(aujourdhui, -2), 17.0) },
    { categorie: "dlc", severite: "alerte", titre: "3 lots à consommer sous 3 jours", description: null, ecran: "stock", lu: false, occurred_at: parisISO(decale(aujourdhui, -1), 9.3) },
    { categorie: "traiteur", severite: "alerte", titre: "Commande traiteur à confirmer", description: "Devis en attente de validation client.", ecran: "orders", lu: false, occurred_at: parisISO(decale(aujourdhui, -1), 15.2) },
    { categorie: "traiteur", severite: "info", titre: "2 précommandes pour demain", description: null, ecran: "orders", lu: true, occurred_at: parisISO(decale(aujourdhui, -1), 8.0) },
    { categorie: "seuil", severite: "info", titre: "Seuils mis à jour sur 15 composants", description: null, ecran: "stock", lu: true, occurred_at: parisISO(decale(aujourdhui, -6), 11.4) },
    { categorie: "stock", severite: "info", titre: "Réceptions de la semaine enregistrées", description: null, ecran: "stock", lu: true, occurred_at: parisISO(decale(aujourdhui, -2), 9.0) },
  ]);
  await inserer("insight", [
    { urgence: "aujourdhui", impact: 320, objectif: "CA", constat: "Le marché du mercredi (Tassin) surperforme : +18 % vs les autres jours de truck.", chiffre: "+18 % de CA", action: "Prévoir 2 bowls de plus par service à Tassin", action_ecran: "prod", origine_calcul: "demo", statut: "ouvert" },
    { urgence: "aujourdhui", impact: 150, objectif: "Gaspi", constat: "Trois lots arrivent à DLC sous 72 h — rotation FEFO à surveiller.", chiffre: "3 lots", action: "Prioriser ces lots en production du jour", action_ecran: "stock", origine_calcul: "demo", statut: "ouvert" },
    { urgence: "semaine", impact: 240, objectif: "CA", constat: "Les bowls représentent 60 % des ventes truck mais 45 % de la marge brute matière.", chiffre: "60 % vol / 45 % marge", action: "Revoir le prix du Bowl saumon (+0,50 €)", action_ecran: "catalog", origine_calcul: "demo", statut: "ouvert" },
    { urgence: "semaine", impact: 180, objectif: "Traiteur", constat: "Deux clients pro concentrent la moitié du CA traiteur de la période.", chiffre: "50 % du CA traiteur", action: "Proposer un contrat récurrent aux 2 comptes", action_ecran: "clients", origine_calcul: "demo", statut: "ouvert" },
    { urgence: "structurel", impact: 420, objectif: "Marge", constat: "La marge nette boutique est diluée par les produits au poids à faible rotation.", chiffre: "−6 pts vs unité", action: "Resserrer l'assortiment pesée à 8 références", action_ecran: "finance", origine_calcul: "demo", statut: "ouvert" },
    { urgence: "structurel", impact: 260, objectif: "Commu", constat: "Les posts « emplacement du jour » corrèlent avec +12 % de ventes truck déclarées Insta.", chiffre: "+12 % origine insta", action: "Systématiser le post du matin les jours de marché", action_ecran: "commu", origine_calcul: "demo", statut: "ouvert" },
  ]);
  console.log("notifications : 8 · insights : 6 (origine_calcul='demo')");

  // ── e) PASSE DE VÉRIFICATION ──────────────────────────────────────────
  console.log("\n── Vérification ──");
  const vProduits = await get(`produit?select=id,nom,recette_id&created_at=gte.${encodeURIComponent(T0)}`);
  const vComposants = await get(`composant?select=id,nom&created_at=gte.${encodeURIComponent(T0)}`);
  const vRecettes = await get(`recette?select=id&created_at=gte.${encodeURIComponent(T0)}`);
  const nomsC = vComposants.map((c) => c.nom);
  const doublons = nomsC.filter((n, i) => nomsC.indexOf(n) !== i);
  const lies = vProduits.filter((p) => p.recette_id != null).length;
  const vVentesRemises = await get(`vente?select=id,montant_total&created_at=gte.${encodeURIComponent(T0)}&fulfillment=eq.remis`);
  const caBase = rond2(vVentesRemises.reduce((a, v) => a + Number(v.montant_total), 0));
  const idsRemises = new Set(vVentesRemises.map((v) => v.id));
  // La vue source unique doit exposer exactement ces ventes
  const vueRemises = await get(`v_vente_remise?select=id,montant_total&occurred_at=gte.${encodeURIComponent(new Date(Date.now() - 40 * 86400000).toISOString())}`);
  const vueDemo = vueRemises.filter((v) => idsRemises.has(v.id));
  const caVue = rond2(vueDemo.reduce((a, v) => a + Number(v.montant_total), 0));
  const vOuvertes = await get("v_commande_ouverte?select=id,fulfillment");
  const ouvertesDemo = vOuvertes.length;
  const echecs = [];
  const attendu = (ok, msg) => { console.log(`${ok ? "✓" : "✗"} ${msg}`); if (!ok) echecs.push(msg); };
  attendu(vProduits.length === 100, `100 produits créés (${vProduits.length})`);
  attendu(vComposants.length === 63, `63 composants créés (${vComposants.length})`);
  attendu(doublons.length === 0, `zéro doublon de composant (${doublons.join(", ") || "—"})`);
  attendu(vRecettes.length === 72 && lies === 72, `72 fiches créées et liées (fiches ${vRecettes.length}, produits liés ${lies})`);
  attendu(Math.abs(caInjecte - caBase) < 0.005, `CA injecté = CA en base (${caInjecte} € vs ${caBase} €)`);
  attendu(Math.abs(caBase - caVue) < 0.005 && vueDemo.length === vVentesRemises.length, `v_vente_remise expose exactement les remises démo (${vueDemo.length} ventes, ${caVue} €)`);
  attendu(ouvertesDemo >= 6, `v_commande_ouverte contient les précommandes ouvertes (${ouvertesDemo})`);
  // Coût/marge calculables sur un bowl signature (mêmes règles que lib/calculs.ts)
  const bowlSaumon = vProduits.find((p) => p.nom === "Bowl saumon");
  const rc = await get(`recette_composant?select=quantite,composant(cout_matiere_kg)&recette_id=eq.${bowlSaumon.recette_id}`);
  const cout = rc.reduce((a, r) => a + (r.quantite / 1000) * Number(r.composant.cout_matiere_kg), 0);
  attendu(cout > 0.5 && cout < 15, `coût matière calculable (Bowl saumon : ${rond2(cout)} €/portion → marge s'affiche au Catalogue/Recettes)`);
  const nc = await get(`releve_haccp?select=id,note&conforme=eq.false&created_at=gte.${encodeURIComponent(T0)}`);
  attendu(nc.length >= 1 && nc.every((r) => r.note), `≥1 non-conformité HACCP avec action corrective (${nc.length})`);

  console.log("\n" + "═".repeat(72));
  console.log(`T0 (borne de purge) : ${T0}`);
  console.log(`Purge : OWNER_EMAIL=... OWNER_PWD=... node scripts/demo/purger.mjs "${T0}"`);
  console.log("═".repeat(72));
  if (echecs.length) throw new Error(`Vérification en échec : ${echecs.length} point(s).`);
  console.log("INJECTION DÉMO : OK");
}

principal().catch((e) => { console.error(String(e?.stack ?? e)); process.exit(1); });
