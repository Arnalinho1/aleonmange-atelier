"use client";

import { useEffect, useState } from "react";
import { GA_ID, lireConsentement, ecrireConsentement, type Consent } from "@/lib/analytics";

declare global {
  interface Window {
    __almGaLoaded?: boolean;
  }
}

/**
 * Passerelle de consentement CNIL pour GA4.
 *
 * BUG CORRIGE (2026-07-21) : @next/third-parties <GoogleAnalytics> chargeait gtag.js
 * via next/script (strategie afterInteractive). Monte CONDITIONNELLEMENT apres
 * consentement (post-hydratation, non-SSR), next/script emet le preload (le fetch de
 * gtag.js visible dans l'onglet reseau) mais n'injecte PAS de facon fiable le <script>
 * EXECUTANT -> gtag.js fetche sans jamais s'executer, window.google_tag_manager reste
 * undefined, dataLayer jamais draine, zero /g/collect (constate sur 3 machines + 4G).
 * On charge donc GA par un <script> DOM NATIF : fetch ET execution garantis par le
 * contrat HTML, independamment du cycle React/next/script.
 *
 * Consent Mode v2 : le defaut analytics_storage=denied + la definition de window.gtag
 * / window.dataLayer sont poses beforeInteractive au layout -> AUCUNE requete avant
 * accord. Ordre garanti : default denied -> update granted -> js -> config, donc le
 * premier page_view part en GRANTED (ping complet, pas cookieless).
 */
function assureGtag(): (...args: unknown[]) => void {
  const w = window as Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
  w.dataLayer = w.dataLayer || [];
  if (typeof w.gtag !== "function") {
    w.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      (w.dataLayer as unknown[]).push(arguments);
    };
  }
  return w.gtag;
}

function pousserConsent(v: Consent) {
  if (typeof window === "undefined") return;
  assureGtag()("consent", "update", { analytics_storage: v === "granted" ? "granted" : "denied" });
}

/** Charge GA4 une seule fois/onglet : update granted AVANT config, puis <script> natif. */
function chargerGA() {
  if (typeof window === "undefined" || !GA_ID || window.__almGaLoaded) return;
  window.__almGaLoaded = true;
  const gtag = assureGtag();
  gtag("consent", "update", { analytics_storage: "granted" });
  gtag("js", new Date());
  gtag("config", GA_ID);
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);
}

export function Consentement() {
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);

  useEffect(() => {
    const c = lireConsentement();
    if (c === "granted") chargerGA(); // visiteur qui revient : injecte + execute
    else if (c === "denied") pousserConsent("denied");
    // Lecture localStorage au montage : setState-in-effect assume (impossible au SSR
    // sans mismatch d'hydratation ; un seul re-render, pas de cascade).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(c);
  }, []);

  useEffect(() => {
    const rouvrir = () => setConsent(null); // « Gerer les cookies » (footer)
    window.addEventListener("alm:cookies", rouvrir);
    return () => window.removeEventListener("alm:cookies", rouvrir);
  }, []);

  function choisir(v: Consent) {
    ecrireConsentement(v);
    if (v === "granted") chargerGA(); // 1er accord : injecte + execute, dans le bon ordre
    else pousserConsent("denied"); // refus / retrait
    setConsent(v);
  }

  return consent === null ? (
    <Banniere onAccept={() => choisir("granted")} onRefuse={() => choisir("denied")} />
  ) : null;
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
