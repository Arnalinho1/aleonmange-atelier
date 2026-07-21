"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CHAPITRES, CHAPITRE_PAR_ROUTE } from "./chapitres";
import { loadProgress, saveProgress, type EtatChapitre, type Progression } from "./progress";

/**
 * Guide d'onboarding — provider LÉGER monté dans AppShell : entrée de menu
 * « Guide · X% » (via useGuide, consommée par la Sidebar), icône « ? » par
 * module, toast d'entrée douce, deeplink `?guide=1`. Le moteur (hub +
 * spotlight + clôture) est chargé à la demande (next/dynamic, ssr:false) :
 * zéro impact perf hors usage.
 *
 * CONTRAT D'URL FIGÉ : `?guide=1` ouvre le hub — c'est la cible du CTA
 * « Découvrir votre Atelier » de la cérémonie d'inauguration du site public
 * (et de l'email chefs). Ne jamais renommer ce paramètre.
 */

const GuideOverlay = dynamic(() => import("./GuideOverlay"), { ssr: false });

/** Flag « toast vu / refusé » — sessionStorage (portée session), HORS de la clé de progression. */
const CLE_TOAST = "alm_guide_toast";

type Vue = "libre" | "hub" | "tour" | "recap";

const GuideContexte = createContext<{ pct: string; ouvrirHub: () => void } | null>(null);

/** Accès Sidebar/Topbar à l'entrée de menu du guide (null hors provider). */
export function useGuide() {
  return useContext(GuideContexte);
}

export function GuideProvider({
  children,
  onDrawer,
}: {
  children: ReactNode;
  /** Pilotage du drawer de navigation mobile (spotlight d'un item de menu <1024 px). */
  onDrawer?: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [progression, setProgression] = useState<Progression>({});
  const [vue, setVue] = useState<Vue>("libre");
  const [chap, setChap] = useState(1);
  const [origine, setOrigine] = useState<"hub" | "module">("hub");
  const [toast, setToast] = useState(false);

  const marquerToast = () => {
    try {
      sessionStorage.setItem(CLE_TOAST, "1");
    } catch {
      // Portée session uniquement — dégradation silencieuse.
    }
  };

  // Montage : progression, deeplink ?guide=1, toast d'entrée douce.
  // Différé (timeout 0) : synchronisation avec des systèmes externes
  // (localStorage, URL) après le premier rendu, jamais pendant.
  useEffect(() => {
    const t = setTimeout(() => {
      const p = loadProgress();
      setProgression(p);
      const params = new URLSearchParams(window.location.search);
      if (params.get("guide") === "1") {
        setVue("hub");
        params.delete("guide");
        const reste = params.toString();
        window.history.replaceState(null, "", window.location.pathname + (reste ? `?${reste}` : "") + window.location.hash);
        return;
      }
      const vide = !CHAPITRES.some((c) => p[c.num]);
      let refuse = false;
      try {
        refuse = sessionStorage.getItem(CLE_TOAST) === "1";
      } catch {
        // sessionStorage indisponible : on retient le toast pour ne pas insister.
        refuse = true;
      }
      if (vide && !refuse) setToast(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const demarrer = useCallback(
    (n: number, org: "hub" | "module") => {
      setChap(n);
      setOrigine(org);
      if (n === 7) {
        setVue("recap");
        return;
      }
      const route = CHAPITRES[n - 1]?.route;
      if (route && route !== pathname) router.push(route);
      setVue("tour");
    },
    [pathname, router]
  );

  // Fin de chapitre : retour au hub, ou au module si lancé via l'icône « ? ».
  const retour = () => {
    onDrawer?.(false);
    setVue(origine === "module" ? "libre" : "hub");
  };

  const terminer = (n: number, etat: EtatChapitre) => {
    setProgression(saveProgress(n, etat));
    retour();
  };

  const passer = (n: number) => {
    if (progression[n] !== "fait") setProgression(saveProgress(n, "a_revoir"));
    retour();
  };

  const finirRecap = () => {
    setProgression(saveProgress(7, "fait"));
    setVue("hub");
  };

  const faits = CHAPITRES.filter((c) => progression[c.num] === "fait").length;
  const pct = `${Math.round((faits / CHAPITRES.length) * 100)}%`;
  const ouvrirHub = useCallback(() => setVue("hub"), []);
  const valeur = useMemo(() => ({ pct, ouvrirHub }), [pct, ouvrirHub]);

  const chapModule = CHAPITRE_PAR_ROUTE[pathname];

  return (
    <GuideContexte.Provider value={valeur}>
      {children}

      {/* Aide contextuelle « ? » — toujours visible sur les modules couverts. */}
      {vue === "libre" && chapModule && (
        <button
          type="button"
          onClick={() => demarrer(chapModule, "module")}
          aria-label="Rejouer le chapitre de ce module"
          title="Aide sur ce module"
          className="font-display alm-g-aide"
          style={{
            position: "fixed",
            top: 76,
            right: 18,
            zIndex: 30,
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "1.5px solid #0e3947",
            background: "#fbf8f1",
            color: "#0e3947",
            fontWeight: 800,
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          ?
        </button>
      )}

      {/* Toast d'entrée douce — progression vide, jamais imposé, refus mémorisé (session). */}
      {toast && vue === "libre" && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: 0,
            right: 0,
            marginInline: "auto",
            width: "min(460px, 92vw)",
            zIndex: 55,
            background: "#0e3947",
            color: "#f3ecdd",
            borderRadius: 18,
            padding: "15px 18px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            boxShadow: "0 24px 48px -20px rgba(14,57,71,.6)",
            animation: "alm-g-fadeup .5s ease both",
          }}
        >
          <p style={{ flex: 1, minWidth: 180, fontSize: 14, margin: 0 }}>Envie d&apos;une visite guidée de votre Atelier ?</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setToast(false);
                marquerToast();
                setVue("hub");
              }}
              className="font-display"
              style={{ height: 36, padding: "0 18px", borderRadius: 100, border: "none", background: "#b0342c", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              Oui
            </button>
            <button
              type="button"
              onClick={() => {
                setToast(false);
                marquerToast();
              }}
              className="font-display"
              style={{
                height: 36,
                padding: "0 15px",
                borderRadius: 100,
                border: "1px solid rgba(243,236,221,.4)",
                background: "transparent",
                color: "#f3ecdd",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Plus tard
            </button>
          </div>
        </div>
      )}

      {vue !== "libre" && (
        <GuideOverlay
          key={vue === "tour" ? `tour-${chap}` : vue}
          vue={vue}
          chap={chap}
          progression={progression}
          onDemarrer={(n) => demarrer(n, "hub")}
          onFermerHub={() => setVue("libre")}
          onTerminer={terminer}
          onPasser={passer}
          onFinirRecap={finirRecap}
          onDrawer={onDrawer}
        />
      )}
    </GuideContexte.Provider>
  );
}
