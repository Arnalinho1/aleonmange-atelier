"use client";

import { useEffect, useState } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";
import { GA_ID, lireConsentement, ecrireConsentement, type Consent } from "@/lib/analytics";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Passerelle de consentement CNIL pour GA4.
 * - Le defaut Consent Mode v2 (analytics_storage: denied) est pose
 *   beforeInteractive dans le layout : AUCUNE requete GA avant acceptation.
 * - GA (<GoogleAnalytics>) n'est monte QUE si le choix = accepte -> gtag.js ne
 *   se charge qu'a ce moment. Refus = rien, site pleinement fonctionnel.
 * - Choix memorise 13 mois (analytics.ts) ; re-ouvrable via "Gerer les cookies"
 *   du footer (evenement global "alm:cookies", meme pattern que la lettre d'info).
 */
export function Consentement() {
  // undefined = pas encore lu (evite le mismatch SSR) ; null = indecis ; sinon choix.
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);

  useEffect(() => setConsent(lireConsentement()), []);

  useEffect(() => {
    const rouvrir = () => setConsent(null);
    window.addEventListener("alm:cookies", rouvrir);
    return () => window.removeEventListener("alm:cookies", rouvrir);
  }, []);

  // Consent Mode update (le defaut denied est deja pose au layout).
  useEffect(() => {
    if (consent === "granted") window.gtag?.("consent", "update", { analytics_storage: "granted" });
    else if (consent === "denied") window.gtag?.("consent", "update", { analytics_storage: "denied" });
  }, [consent]);

  return (
    <>
      {consent === "granted" && GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null}
      {consent === null ? (
        <Banniere onAccept={() => { ecrireConsentement("granted"); setConsent("granted"); }} onRefuse={() => { ecrireConsentement("denied"); setConsent("denied"); }} />
      ) : null}
    </>
  );
}

function Banniere({ onAccept, onRefuse }: { onAccept: () => void; onRefuse: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 pointer-events-none" role="dialog" aria-label="Consentement aux cookies de mesure d'audience">
      <div className="pointer-events-auto mx-auto max-w-[1280px] bg-surface border border-bord-2 rounded-carte-lg shadow-[0_20px_50px_-24px_rgba(14,57,71,.55)] p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
        <p className="flex-1 text-[13.5px] leading-[1.6] text-encre">
          Nous utilisons Google Analytics pour mesurer l&apos;audience du site et améliorer nos services. Ces cookies de mesure ne sont déposés qu&apos;avec votre accord : le site fonctionne normalement si vous refusez. Votre choix est conservé 13 mois (puis la bannière réapparaît) et reste modifiable à tout moment via « Gérer les cookies » en bas de page.
        </p>
        <div className="flex gap-2.5 shrink-0">
          <button type="button" onClick={onRefuse} className="h-[42px] px-5 rounded-pille border border-bord-3 bg-surface text-canard font-display font-bold text-[13.5px] transition-colors hover:border-canard">
            Refuser
          </button>
          <button type="button" onClick={onAccept} className="h-[42px] px-5 rounded-pille bg-[var(--accent)] text-white font-display font-bold text-[13.5px] transition-opacity hover:opacity-90">
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
