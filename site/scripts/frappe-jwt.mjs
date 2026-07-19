// Frappe du JWT site_lecteur — USAGE LOCAL UNIQUEMENT (docs/site/ARCHITECTURE.md).
// Le secret JWT legacy du projet (dashboard Supabase -> Settings -> API -> JWT
// Secret) est lu depuis la variable d'environnement SUPABASE_JWT_SECRET,
// JAMAIS commitee, jamais passee en argument (l'argv finit dans l'historique
// et la liste des processus). Le secret ne transite par aucune session agent.
//
// Commande recommandee (zsh, secret hors historique, purge apres) :
//   read -s "?Secret JWT du projet : " S && echo && \
//     SUPABASE_JWT_SECRET="$S" node site/scripts/frappe-jwt.mjs ; unset S
import { createHmac } from "node:crypto";

const REF = "yecxgmuryrmztymxjbxo";
const ROLE = "site_lecteur";
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
console.log("A coller dans site/.env.local (en remplacement du bloc SUPABASE_SERVICE_ROLE_KEY,");
console.log("valeur sur la MEME ligne que le nom — piege documente) :");
console.log("");
console.log(`# JWT site_lecteur frappe le ${jour(maintenant)}, echeance ${jour(echeance)} (${DUREE_ANNEES} ans). Rotation : ARCHITECTURE.md.`);
console.log(`SUPABASE_SITE_LECTEUR_JWT=${jwt}`);
