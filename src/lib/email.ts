import { Resend } from "resend";

/**
 * Emails transactionnels de l'ATELIER (confirmation / refus d'une commande web) —
 * BEST-EFFORT strict : l'action du chef prime, l'email est tenté APRÈS et ne la
 * fait JAMAIS échouer. Module PROPRE à l'Atelier : le module du site
 * (site/src/lib/email.ts) n'est pas importable (apps isolées) -> constantes de marque
 * dupliquées ici (coordonnées, logo). Expéditeur contact@aleonmange.app (domaine VERIFIE
 * chez Resend), Reply-To aleonmange@yahoo.com (boite relevée par les chefs). Mode dev par
 * défaut tant que RESEND_PROD != "1". Gabarit de marque email-safe (tables + CSS inline).
 */

const EXPEDITEUR_EMAIL = "contact@aleonmange.app";
const EXPEDITEUR_NOM = "A Leon Mange";
const REPLY_TO = "aleonmange@yahoo.com"; // boite relevee par les chefs (cf. COORDONNEES.email du site)
const TELEPHONE = "06 75 36 23 26";
// Coordonnees de marque pour le pied d'email (dupliquees : apps isolees, pas de COORDONNEES au root).
const ADRESSE = "1923 route de la vallée, 69620 Létra";
const SITE = "https://aleonmange.app";
const LOGO_URL = "https://aleonmange.app/logo-alm.png";

const CLE = process.env.RESEND_API_KEY ?? "";
const MODE_DEV = process.env.RESEND_PROD !== "1";
const DEST_TEST = process.env.RESEND_DEST_TEST ?? "";

/** Phrases DOUCES exposées au client (jamais le détail interne du motif). */
const MOTIF_CLIENT: Record<string, string> = {
  rupture: "un ingrédient essentiel nous manque pour cette date",
  capacite: "nous sommes malheureusement complets sur ce créneau",
  fermeture: "nous serons exceptionnellement fermés ce jour-là",
  autre: "nous ne pouvons pas honorer cette commande cette fois-ci",
};

type Message = { to: string; subject: string; html: string };

async function envoyer(msg: Message): Promise<boolean> {
  if (!CLE) {
    console.warn("[Atelier ALM] RESEND_API_KEY absente : email ignore (best-effort).", { to: msg.to, subject: msg.subject });
    return false;
  }
  try {
    const resend = new Resend(CLE);
    if (MODE_DEV) {
      if (!DEST_TEST) {
        console.warn("[Atelier ALM] mode dev Resend sans RESEND_DEST_TEST : email ignore.", { to: msg.to });
        return false;
      }
      const { error } = await resend.emails.send({
        from: `${EXPEDITEUR_NOM} <onboarding@resend.dev>`,
        to: DEST_TEST,
        subject: `[DEV -> ${msg.to}] ${msg.subject}`,
        html: msg.html,
        replyTo: REPLY_TO,
      });
      if (error) throw error;
      return true;
    }
    const { error } = await resend.emails.send({
      from: `${EXPEDITEUR_NOM} <${EXPEDITEUR_EMAIL}>`,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      replyTo: REPLY_TO,
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("[Atelier ALM] Envoi email echoue (best-effort, action non affectee) :", e);
    return false;
  }
}

// ── Gabarit de marque, EMAIL-SAFE (identique au site : tables + CSS inline, 600px, ────
// polices systeme, bgcolor explicite, color-scheme light ; logo par URL absolue hebergee).
const PIED =
  `A Leon Mange · ${ADRESSE} · ${TELEPHONE}<br>` +
  `<a href="mailto:${REPLY_TO}" style="color:#6b7469;text-decoration:underline;">${REPLY_TO}</a>` +
  ` · <a href="${SITE}" style="color:#6b7469;text-decoration:underline;">aleonmange.app</a>`;
const POLICE = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function gabaritEmail(titre: string, corps: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${titre}</title>
</head>
<body style="margin:0;padding:0;background-color:#ede7da;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ede7da;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#fbf8f1;border:1px solid #e4dac6;border-radius:14px;overflow:hidden;">
        <tr>
          <td align="center" bgcolor="#efe6d2" style="background-color:#efe6d2;padding:22px 24px;">
            <img src="${LOGO_URL}" alt="A Leon Mange" height="48" style="display:block;height:48px;width:auto;border:0;outline:none;text-decoration:none;">
          </td>
        </tr>
        <tr>
          <td bgcolor="#d81020" style="background-color:#d81020;height:3px;line-height:3px;font-size:0;">&nbsp;</td>
        </tr>
        <tr>
          <td bgcolor="#fbf8f1" style="background-color:#fbf8f1;padding:28px 32px;font-family:${POLICE};color:#3a4a44;font-size:15px;line-height:1.6;">
            <h1 style="margin:0 0 14px;font-family:${POLICE};font-size:21px;line-height:1.25;color:#0e3947;font-weight:700;">${titre}</h1>
            ${corps}
          </td>
        </tr>
        <tr>
          <td bgcolor="#efe6d2" style="background-color:#efe6d2;padding:18px 32px;font-family:${POLICE};color:#6b7469;font-size:12px;line-height:1.6;">
            ${PIED}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ── Rendus PURS (subject + html) : reutilises par les envois ET par les apercus ──────
/** Confirmation : commande acceptee, a retirer le [date/creneau], a regler au retrait. */
export function renduCommandeConfirmee(o: { retraitLabel: string }): { subject: string; html: string } {
  return {
    subject: "Votre commande est confirmee",
    html: gabaritEmail("Commande confirmée", `
      <p>Bonne nouvelle : votre commande est <strong>confirmée</strong> par l'atelier.</p>
      <p><strong>À retirer :</strong> ${o.retraitLabel}<br>
      Le montant est <strong>à régler au retrait</strong>.</p>
      <p>À très bientôt !</p>`),
  };
}

/** Refus : doux, sans blame, expose seulement le motif utile, invite a appeler. */
export function renduCommandeRefusee(o: { motifCode: string }): { subject: string; html: string } {
  const raison = MOTIF_CLIENT[o.motifCode] ?? MOTIF_CLIENT.autre;
  return {
    subject: "Au sujet de votre commande",
    html: gabaritEmail("Nous sommes désolés", `
      <p>Merci pour votre commande. Nous ne pouvons malheureusement pas la préparer : ${raison}.</p>
      <p>Nous aimerions trouver une solution avec vous (une autre date, un autre produit) :
      appelez-nous au <strong>${TELEPHONE}</strong>, nous ferons au mieux.</p>
      <p>À très vite, nous l'espérons.</p>`),
  };
}

// ── Envois (signatures inchangees pour les appelants) ────────────────────────────────
export function emailCommandeConfirmee(to: string, o: { retraitLabel: string }): Promise<boolean> {
  return envoyer({ to, ...renduCommandeConfirmee(o) });
}
export function emailCommandeRefusee(to: string, o: { motifCode: string }): Promise<boolean> {
  return envoyer({ to, ...renduCommandeRefusee(o) });
}
