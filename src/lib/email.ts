import { Resend } from "resend";

/**
 * Emails transactionnels de l'ATELIER (confirmation / refus d'une commande web) —
 * BEST-EFFORT strict : l'action du chef prime, l'email est tenté APRÈS et ne la
 * fait JAMAIS échouer. Module PROPRE à l'Atelier : le module du site
 * (site/src/lib/email.ts) n'est pas importable (apps isolées, resend hors des deps
 * du site côté racine). Même mécanique : expéditeur contact@aleonmange.app
 * (constante configurable), Reply-To contact@aleonmange.com temporaire, mode dev
 * par défaut tant que le domaine .app n'est pas vérifié chez Resend.
 */

const EXPEDITEUR_EMAIL = "contact@aleonmange.app";
const EXPEDITEUR_NOM = "A Leon Mange";
const REPLY_TO_TEMPORAIRE = "contact@aleonmange.com";
const TELEPHONE = "06 75 36 23 26";

const CLE = process.env.RESEND_API_KEY ?? "";
const MODE_DEV = process.env.RESEND_PROD !== "1";
const DEST_TEST = process.env.RESEND_DEST_TEST ?? "";

/** Phrases DOUCES exposées au client (jamais le détail interne du motif). */
const MOTIF_CLIENT: Record<string, string> = {
  rupture: "un ingredient essentiel nous manque pour cette date",
  capacite: "nous sommes malheureusement complets sur ce creneau",
  fermeture: "nous serons exceptionnellement fermes ce jour-la",
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
        replyTo: REPLY_TO_TEMPORAIRE,
      });
      if (error) throw error;
      return true;
    }
    const { error } = await resend.emails.send({
      from: `${EXPEDITEUR_NOM} <${EXPEDITEUR_EMAIL}>`,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      replyTo: REPLY_TO_TEMPORAIRE,
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("[Atelier ALM] Envoi email echoue (best-effort, action non affectee) :", e);
    return false;
  }
}

function enveloppe(titre: string, corps: string): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#0e3947">
  <h1 style="font-size:20px;color:#0e3947">${titre}</h1>
  ${corps}
  <hr style="border:none;border-top:1px solid #e6ddca;margin:24px 0">
  <p style="font-size:12px;color:#9a927f">A Leon Mange, Beaujolais. Une question ? Appelez-nous au ${TELEPHONE}.</p>
</div>`;
}

/** Confirmation : commande acceptee, a retirer le [date/creneau], a regler au retrait. */
export function emailCommandeConfirmee(to: string, o: { retraitLabel: string }): Promise<boolean> {
  return envoyer({
    to,
    subject: "Votre commande est confirmee",
    html: enveloppe("Commande confirmee", `
      <p>Bonne nouvelle : votre commande est <strong>confirmee</strong> par l'atelier.</p>
      <p><strong>A retirer :</strong> ${o.retraitLabel}<br>
      Le montant est <strong>a regler au retrait</strong>.</p>
      <p>A tres bientot !</p>`),
  });
}

/** Refus : doux, sans blame, expose seulement le motif utile, invite a appeler. */
export function emailCommandeRefusee(to: string, o: { motifCode: string }): Promise<boolean> {
  const raison = MOTIF_CLIENT[o.motifCode] ?? MOTIF_CLIENT.autre;
  return envoyer({
    to,
    subject: "Au sujet de votre commande",
    html: enveloppe("Nous sommes desoles", `
      <p>Merci pour votre commande. Nous ne pouvons malheureusement pas la preparer : ${raison}.</p>
      <p>Nous aimerions trouver une solution avec vous (une autre date, un autre produit) :
      appelez-nous au <strong>${TELEPHONE}</strong>, nous ferons au mieux.</p>
      <p>A tres vite, nous l'esperons.</p>`),
  });
}
