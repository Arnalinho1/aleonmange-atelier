import "server-only";
import { Resend } from "resend";

/**
 * Emails transactionnels (Resend) — BEST-EFFORT strict : l'ecriture en base prime,
 * l'email est tente APRES, en try/catch logue, et ne fait JAMAIS echouer la commande.
 *
 * Amendement 2 : expediteur = contact@aleonmange.app (zone DNS Vercel, sous controle),
 * en CONSTANTE configurable (source unique). Reply-To: contact@aleonmange.com = filet
 * temporaire tant que la boite .app n'existe pas (a retirer ensuite). Mode DEV Resend =
 * chemin PAR DEFAUT de la vague (domaine .app non encore verifie) : envoi depuis le
 * domaine de test Resend vers un destinataire de test unique (RESEND_DEST_TEST).
 */

const EXPEDITEUR_EMAIL = "contact@aleonmange.app"; // cible prod (constante configurable)
const EXPEDITEUR_NOM = "A Leon Mange";
const REPLY_TO_TEMPORAIRE = "contact@aleonmange.com"; // filet, a retirer quand la boite .app existe

const CLE = process.env.RESEND_API_KEY ?? "";
// Mode dev tant que le domaine .app n'est pas verifie dans Resend (defaut : true).
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
      // Domaine non verifie : Resend n'autorise que son domaine de test + un destinataire de test.
      if (!DEST_TEST) {
        console.warn("[site ALM] mode dev Resend sans RESEND_DEST_TEST : email ignore.", { to: msg.to });
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
    console.error("[site ALM] Envoi email echoue (best-effort, commande non affectee) :", e);
    return false;
  }
}

function enveloppe(titre: string, corps: string): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#0e3947">
  <h1 style="font-size:20px;color:#0e3947">${titre}</h1>
  ${corps}
  <hr style="border:none;border-top:1px solid #e6ddca;margin:24px 0">
  <p style="font-size:12px;color:#9a927f">A Leon Mange, Beaujolais. Cet email vous est envoye suite a votre demande sur aleonmange.app.</p>
</div>`;
}

/** Precommande (boutique + truck) : demande recue, JAMAIS "validee". */
export function emailPrecommandeRecue(to: string, o: { reference: string; retraitLabel: string }): Promise<boolean> {
  return envoyer({
    to,
    subject: "Votre demande de precommande a bien ete recue",
    html: enveloppe("Demande bien recue", `
      <p>Merci ! Votre demande de precommande est <strong>en attente de confirmation par l'atelier</strong>. Nous revenons vers vous rapidement.</p>
      <p><strong>Retrait souhaite :</strong> ${o.retraitLabel}<br>
      Le montant est <strong>a regler au retrait</strong>.</p>
      <p style="font-size:13px;color:#6b7469">Reference : ${o.reference}</p>`),
  });
}

/** Demande de devis : envoyee, aucun paiement, reponse sous 48h. */
export function emailDevisRecu(to: string, o: { contactNom: string }): Promise<boolean> {
  return envoyer({
    to,
    subject: "Votre demande de devis a bien ete envoyee",
    html: enveloppe("Demande envoyee", `
      <p>Bonjour ${o.contactNom}, votre demande de devis est bien arrivee. <strong>Aucun paiement maintenant</strong> : nous etudions votre projet et vous repondons <strong>sous 48h</strong>.</p>`),
  });
}

/** Newsletter : double opt-in, lien de confirmation. */
export function emailNewsletterConfirmer(to: string, o: { lien: string }): Promise<boolean> {
  return envoyer({
    to,
    subject: "Confirmez votre inscription a la lettre A Leon Mange",
    html: enveloppe("Une derniere etape", `
      <p>Pour recevoir nos nouvelles, confirmez votre inscription :</p>
      <p><a href="${o.lien}" style="display:inline-block;background:#D81020;color:#fff;padding:11px 18px;border-radius:999px;text-decoration:none;font-weight:700">Confirmer mon inscription</a></p>
      <p style="font-size:12px;color:#9a927f">Si vous n'etes pas a l'origine de cette demande, ignorez cet email.</p>`),
  });
}

/** Panier frais (teasing) : double opt-in. JAMAIS une reservation, juste une intention. */
export function emailPanierFraisConfirmer(to: string, o: { lien: string }): Promise<boolean> {
  return envoyer({
    to,
    subject: "Confirmez votre intérêt pour le Panier frais",
    html: enveloppe("Une dernière étape", `
      <p>Merci de votre intérêt pour le <strong>Panier frais du Beaujolais</strong> ! Pour être prévenu(e) du lancement, confirmez votre demande :</p>
      <p><a href="${o.lien}" style="display:inline-block;background:#D81020;color:#fff;padding:11px 18px;border-radius:999px;text-decoration:none;font-weight:700">Confirmer ma demande</a></p>
      <p style="font-size:12px;color:#9a927f">Ce n'est pas une réservation : vous nous aidez à préparer le lancement. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`),
  });
}
