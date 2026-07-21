import { sendGAEvent } from "@next/third-parties/google";

/**
 * Mesure d'audience GA4 soumise au consentement (CNIL). Le Measurement ID est
 * PUBLIC par nature (NEXT_PUBLIC). Le choix accepte/refuse est memorise en
 * localStorage avec HORODATAGE : au-dela de 13 mois (recommandation CNIL) la
 * cle expire et la banniere se represente. Cle technique de consentement =
 * exemptee. Aucun evenement ne porte de donnee personnelle.
 */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export type Consent = "granted" | "denied";

const KEY = "alm-consent";
const MAX_AGE_MS = 13 * 30 * 24 * 60 * 60 * 1000; // ~13 mois

/** Lit le choix memorise. null = indecis OU expire (> 13 mois) -> banniere. */
export function lireConsentement(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const { v, t } = JSON.parse(raw) as { v: Consent; t: number };
    if ((v !== "granted" && v !== "denied") || !t || Date.now() - t > MAX_AGE_MS) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return v;
  } catch {
    return null;
  }
}

/** Memorise le choix + l'instant (base de l'expiration 13 mois). */
export function ecrireConsentement(v: Consent) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ v, t: Date.now() }));
  } catch {
    /* stockage indisponible : le choix vaut pour la session, la banniere reviendra */
  }
}

/**
 * Evenement de conversion. Envoye UNIQUEMENT si le consentement est accorde
 * (double garde : sans acceptation, GA n'est meme pas charge). snake_case,
 * jamais d'email/nom/telephone/reference client en parametre.
 */
export function trackEvent(nom: string, params?: Record<string, string | number>) {
  if (lireConsentement() !== "granted") return;
  sendGAEvent("event", nom, params ?? {});
}
