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
 * - Consent Mode v2 : le defaut `analytics_storage=denied` est pose beforeInteractive
 *   au layout (script inline, AUCUNE requete). GA (<GoogleAnalytics>) n'est monte
 *   qu'apres accord -> gtag.js ne se charge qu'a « Accepter ».
 * - ORDRE (le bug corrige) : @next/third-parties emet `gtag('config')` (donc le
 *   page_view) des le montage. Il faut donc pousser le consent UPDATE granted dans
 *   window.dataLayer (la MEME file que GA) AVANT ce montage, sinon le page_view part
 *   en denied et aucune requete /g/collect exploitable ne sort. On le fait donc
 *   SYNCHRONEMENT (au clic ET au retour d'un visiteur deja consentant), puis on monte GA.
 */
function majConsentGtag(v: Consent) {
  if (typeof window === "undefined") return;
  const w = window as Window & { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  // gtag est defini par le script beforeInteractive du layout ; fallback defensif
  // (meme file dataLayer) au cas ou il n'aurait pas encore tourne.
  if (typeof w.gtag !== "function") {
    w.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      (w.dataLayer as unknown[]).push(arguments);
    };
  }
  w.gtag("consent", "update", { analytics_storage: v === "granted" ? "granted" : "denied" });
}

export function Consentement() {
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);

  // Chargement : lit le choix memorise. Deja accorde -> update granted AVANT
  // le montage de GA (visiteur qui revient) : default denied -> update -> config.
  useEffect(() => {
    const c = lireConsentement();
    if (c) majConsentGtag(c);
    // Lecture localStorage au montage : setState-in-effect assume (impossible au SSR
    // sans mismatch d'hydratation ; un seul re-render, pas de cascade).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(c);
  }, []);

  // « Gerer les cookies » (footer) rouvre la banniere.
  useEffect(() => {
    const rouvrir = () => setConsent(null);
    window.addEventListener("alm:cookies", rouvrir);
    return () => window.removeEventListener("alm:cookies", rouvrir);
  }, []);

  function choisir(v: Consent) {
    ecrireConsentement(v);
    majConsentGtag(v); // pousse l'update dans dataLayer AVANT setState (donc avant config GA)
    setConsent(v);
  }

  return (
    <>
      {consent === "granted" && GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null}
      {consent === null ? <Banniere onAccept={() => choisir("granted")} onRefuse={() => choisir("denied")} /> : null}
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
