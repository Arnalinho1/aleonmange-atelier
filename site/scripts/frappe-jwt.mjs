// Frappe d'un JWT de role site (site_lecteur | site_ecrivain) — USAGE LOCAL
// UNIQUEMENT (docs/site/ARCHITECTURE.md). Le secret JWT legacy du projet
// (dashboard Supabase -> Settings -> API -> JWT Secret) est lu depuis la variable
// d'environnement SUPABASE_JWT_SECRET, JAMAIS commitee, jamais passee en argument
// (l'argv finit dans l'historique et la liste des processus). Le secret ne
// transite par aucune session agent.
//
// Commande recommandee (zsh, secret hors historique, purge apres) :
//   Lecture (defaut) :
//     read -s "?Secret JWT du projet : " S && echo && \
//       SUPABASE_JWT_SECRET="$S" node site/scripts/frappe-jwt.mjs ; unset S
//   Ecriture (Vague 2) :
//     read -s "?Secret JWT du projet : " S && echo && \
//       SUPABASE_JWT_ROLE=site_ecrivain SUPABASE_JWT_SECRET="$S" node site/scripts/frappe-jwt.mjs ; unset S
import { createHmac } from "node:crypto";

const REF = "yecxgmuryrmztymxjbxo";
// Role a frapper : SUPABASE_JWT_ROLE=site_lecteur (defaut) ou site_ecrivain (Vague 2).
const ROLE = (process.env.SUPABASE_JWT_ROLE ?? "site_lecteur").trim();
const ROLES_OK = { site_lecteur: "SUPABASE_SITE_LECTEUR_JWT", site_ecrivain: "SUPABASE_SITE_ECRIVAIN_JWT" };
if (!(ROLE in ROLES_OK)) {
  console.error(`SUPABASE_JWT_ROLE invalide : ${ROLE}. Attendu : site_lecteur ou site_ecrivain.`);
  process.exit(1);
}
const VAR_SORTIE = ROLES_OK[ROLE];
const DUREE_ANNEES = 10;

const secret = (process.env.SUPABASE_JWT_SECRET ?? "").trim();
if (!secret) {
  console.error("SUPABASE_JWT_SECRET absent. Voir la commande recommandee en tete de ce script.");
  process.exit(1);
}

const maintenant = new Date();
const echeance = new Date(maintenant);
echeance.setFullYear(echeance.getFullYear() + DUREE_ANNEES);

const b64url = (objOuBuf) =>
  (Buffer.isBuffer(objOuBuf) ? objOuBuf : Buffer.from(JSON.stringify(objOuBuf))).toString("base64url");

const entete = { alg: "HS256", typ: "JWT" };
const claims = {
  iss: "supabase",
  ref: REF,
  role: ROLE,
  iat: Math.floor(maintenant.getTime() / 1000),
  exp: Math.floor(echeance.getTime() / 1000),
};
const corps = `${b64url(entete)}.${b64url(claims)}`;
const jwt = `${corps}.${b64url(createHmac("sha256", secret).update(corps).digest())}`;

const jour = (d) => d.toISOString().slice(0, 10);
console.log("Claims frappees :", JSON.stringify(claims));
console.log("");
console.log("A coller dans site/.env.local (valeur sur la MEME ligne que le nom — piege documente) :");
console.log("");
console.log(`# JWT ${ROLE} frappe le ${jour(maintenant)}, echeance ${jour(echeance)} (${DUREE_ANNEES} ans). Rotation : ARCHITECTURE.md.`);
console.log(`${VAR_SORTIE}=${jwt}`);
