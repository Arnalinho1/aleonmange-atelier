import "server-only";
import { Resend } from "resend";
import { COORDONNEES } from "@/lib/contenu";
import { SITE_URL } from "@/lib/seo";

/**
 * Emails transactionnels (Resend) — BEST-EFFORT strict : l'ecriture en base prime,
 * l'email est tente APRES, en try/catch logue, et ne fait JAMAIS echouer la commande.
 *
 * Expediteur = contact@aleonmange.app (zone DNS Vercel, domaine VERIFIE chez Resend).
 * Reply-To = COORDONNEES.email (aleonmange@yahoo.com, la boite relevee par les chefs ;
 * source unique -> suit le mail du camion s'il change). Mode DEV (defaut, tant que
 * RESEND_PROD != "1") : envoi depuis le domaine de test Resend vers RESEND_DEST_TEST,
 * subject prefixe [DEV]. En PROD (RESEND_PROD=1) : vrai destinataire, from propre,
 * sans prefixe. Gabarit de marque email-safe (tables + CSS inline, cf. gabaritEmail).
 */

const EXPEDITEUR_EMAIL = "contact@aleonmange.app"; // cible prod (constante configurable)
const EXPEDITEUR_NOM = "A Leon Mange";
const REPLY_TO = COORDONNEES.email; // boite relevee par les chefs (source unique COORDONNEES)

const CLE = process.env.RESEND_API_KEY ?? "";
// Mode dev tant que le domaine .app n'est pas bascule en prod (defaut : true).
const MODE_DEV = process.env.RESEND_PROD !== "1";
const DEST_TEST = process.env.RESEND_DEST_TEST ?? "";

type Message = { to: string; subject: string; html: string };

/** Envoi best-effort : ne leve jamais. Retourne true si l'API a accepte l'envoi. */
async function envoyer(msg: Message): Promise<boolean> {
  if (!CLE) {
    console.warn("[site ALM] RESEND_API_KEY absente : email ignore (best-effort).", { to: msg.to, subject: msg.subject });
    return false;
  }
  try {
    const resend = new Resend(CLE);
    if (MODE_DEV) {
      // Domaine non bascule : envoi depuis le domaine de test Resend vers un destinataire de test.
      if (!DEST_TEST) {
        console.warn("[site ALM] mode dev Resend sans RESEND_DEST_TEST : email ignore.", { to: msg.to });
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
    console.error("[site ALM] Envoi email echoue (best-effort, commande non affectee) :", e);
    return false;
  }
}

// ── Gabarit de marque, EMAIL-SAFE ────────────────────────────────────────────────
// Tables imbriquees + CSS inline uniquement (pas de flex/grid), largeur max 600px,
// polices systeme, bgcolor explicite par cellule + color-scheme light (dark-mode-safe :
// jamais de texte clair sur fond suppose clair). Logo par URL absolue hebergee (pas de
// piece jointe) ; alt de secours si images bloquees. UN CTA rouge max (dans le corps).
const LOGO_URL = `${SITE_URL}/logo-alm.png`;
const PIED =
  `A Leon Mange · ${COORDONNEES.adresse} · ${COORDONNEES.telephone}<br>` +
  `<a href="mailto:${COORDONNEES.email}" style="color:#6b7469;text-decoration:underline;">${COORDONNEES.email}</a>` +
  ` · <a href="${SITE_URL}" style="color:#6b7469;text-decoration:underline;">aleonmange.app</a>`;
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
// (aucun envoi ; permet de generer les previews sans toucher a Resend).

/** Precommande (boutique + truck) : demande recue, JAMAIS "validee". */
export function renduPrecommandeRecue(o: { reference: string; retraitLabel: string }): { subject: string; html: string } {
  return {
    subject: "Votre demande de précommande a bien été reçue",
    html: gabaritEmail("Demande bien reçue", `
      <p>Merci ! Votre demande de précommande est <strong>en attente de confirmation par l'atelier</strong>. Nous revenons vers vous rapidement.</p>
      <p><strong>Retrait souhaité :</strong> ${o.retraitLabel}<br>
      Le montant est <strong>à régler au retrait</strong>.</p>
      <p style="font-size:13px;color:#6b7469">Référence : ${o.reference}</p>`),
  };
}

/** Demande de devis : envoyee, aucun paiement, reponse sous 48h. */
export function renduDevisRecu(o: { contactNom: string }): { subject: string; html: string } {
  return {
    subject: "Votre demande de devis a bien été envoyée",
    html: gabaritEmail("Demande envoyée", `
      <p>Bonjour ${o.contactNom}, votre demande de devis est bien arrivée. <strong>Aucun paiement maintenant</strong> : nous étudions votre projet et vous répondons <strong>sous 48h</strong>.</p>`),
  };
}

/** Newsletter : double opt-in, lien de confirmation. */
export function renduNewsletterConfirmer(o: { lien: string }): { subject: string; html: string } {
  return {
    subject: "Confirmez votre inscription à la lettre A Léon Mange",
    html: gabaritEmail("Une derniere etape", `
      <p>Pour recevoir nos nouvelles, confirmez votre inscription :</p>
      <p><a href="${o.lien}" style="display:inline-block;background:#D81020;color:#fff;padding:11px 18px;border-radius:999px;text-decoration:none;font-weight:700">Confirmer mon inscription</a></p>
      <p style="font-size:12px;color:#9a927f">Si vous n'etes pas a l'origine de cette demande, ignorez cet email.</p>`),
  };
}

/** Panier frais (teasing) : double opt-in. JAMAIS une reservation, juste une intention. */
export function renduPanierFraisConfirmer(o: { lien: string }): { subject: string; html: string } {
  return {
    subject: "Confirmez votre intérêt pour le Panier frais",
    html: gabaritEmail("Une dernière étape", `
      <p>Merci de votre intérêt pour le <strong>Panier frais du Beaujolais</strong> ! Pour être prévenu(e) du lancement, confirmez votre demande :</p>
      <p><a href="${o.lien}" style="display:inline-block;background:#D81020;color:#fff;padding:11px 18px;border-radius:999px;text-decoration:none;font-weight:700">Confirmer ma demande</a></p>
      <p style="font-size:12px;color:#9a927f">Ce n'est pas une réservation : vous nous aidez à préparer le lancement. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`),
  };
}

// ── Envois (signatures inchangees pour les appelants) ────────────────────────────────
export function emailPrecommandeRecue(to: string, o: { reference: string; retraitLabel: string }): Promise<boolean> {
  return envoyer({ to, ...renduPrecommandeRecue(o) });
}
export function emailDevisRecu(to: string, o: { contactNom: string }): Promise<boolean> {
  return envoyer({ to, ...renduDevisRecu(o) });
}
export function emailNewsletterConfirmer(to: string, o: { lien: string }): Promise<boolean> {
  return envoyer({ to, ...renduNewsletterConfirmer(o) });
}
export function emailPanierFraisConfirmer(to: string, o: { lien: string }): Promise<boolean> {
  return envoyer({ to, ...renduPanierFraisConfirmer(o) });
}
