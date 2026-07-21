"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Grammaire spotlight COMMUNE (maquettes inauguration + onboarding, CD) :
 * assombrissement par box-shadow autour de la cible (padding 10 px, radius
 * 16 px), transition 0,5 s cubic-bezier(.4,0,.2,1), carte fixe en bas
 * min(440px, 92vw) mobile-first, « Passer » permanent, re-mesure au resize,
 * au scroll et en boucle courte (drawer en transition, cible qui apparaît
 * après coup). Cibles = sélecteurs paramétrables ; cible introuvable ->
 * spotlight plein écran, JAMAIS d'erreur. L'overlay est pointer-events:none :
 * l'app reste cliquable, les micro-actions observent le clic réel sans
 * jamais l'intercepter.
 *
 * Composant AUTONOME (aucune dépendance app) : il sera DUPLIQUÉ tel quel côté
 * site public pour la cérémonie d'inauguration (apps isolées du monorepo,
 * pas d'import partagé — même idiome que les modules email).
 */

export type CibleSpec = {
  /** Sélecteur CSS de la cible ; null = spotlight plein écran. */
  sel: string | null;
  /** Ne retient que le candidat dont le texte contient cette chaîne. */
  contains?: string;
  /** Affine vers un descendant du candidat retenu (ex : bouton d'une ligne). */
  inner?: string;
};

export function resoudreCible(spec: CibleSpec): HTMLElement | null {
  if (!spec.sel) return null;
  const candidats = Array.from(document.querySelectorAll<HTMLElement>(spec.sel));
  let el =
    (spec.contains
      ? candidats.find((c) => (c.textContent ?? "").includes(spec.contains as string))
      : candidats[0]) ?? null;
  if (el && spec.inner) el = el.querySelector<HTMLElement>(spec.inner) ?? el;
  return el;
}

type Zone = { t: number; l: number; w: number; h: number };
const MARGE = 10;

export function Spotlight({
  cible,
  zIndex = 70,
  onPasser,
  onCibleClick,
  onCibleResolue,
  carte,
}: {
  cible: CibleSpec;
  zIndex?: number;
  onPasser: () => void;
  /** Clic réel sur la cible (micro-actions) — observé, jamais intercepté. */
  onCibleClick?: () => void;
  /** Signale si la cible existe dans le DOM (pill « cliquez » vs démonstration). */
  onCibleResolue?: (trouvee: boolean) => void;
  carte: ReactNode;
}) {
  const [zone, setZone] = useState<Zone | null>(null);
  const scrolleeRef = useRef<HTMLElement | null>(null);

  const mesurer = useCallback(() => {
    const el = resoudreCible(cible);
    onCibleResolue?.(el !== null);
    if (!el) {
      setZone({ t: MARGE, l: MARGE, w: window.innerWidth - MARGE * 2, h: window.innerHeight - MARGE * 2 });
      return;
    }
    if (scrolleeRef.current !== el) {
      scrolleeRef.current = el;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    const r = el.getBoundingClientRect();
    setZone({ t: r.top - MARGE, l: r.left - MARGE, w: r.width + MARGE * 2, h: r.height + MARGE * 2 });
  }, [cible, onCibleResolue]);

  useEffect(() => {
    scrolleeRef.current = null;
    const raf = requestAnimationFrame(mesurer);
    const t1 = setTimeout(mesurer, 80);
    const t2 = setTimeout(mesurer, 350);
    const boucle = setInterval(mesurer, 300);
    window.addEventListener("resize", mesurer);
    document.addEventListener("scroll", mesurer, true);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(boucle);
      window.removeEventListener("resize", mesurer);
      document.removeEventListener("scroll", mesurer, true);
    };
  }, [mesurer]);

  // Clic réel : délégué au document (capture) — robuste aux re-rendus React
  // qui remplacent le nœud cible (ex : router.refresh après confirmation).
  useEffect(() => {
    if (!onCibleClick) return;
    const onClick = (e: MouseEvent) => {
      const el = resoudreCible(cible);
      if (el && e.target instanceof Node && el.contains(e.target)) onCibleClick();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [cible, onCibleClick]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex, pointerEvents: "none" }}>
      {zone && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: zone.t,
            left: zone.l,
            width: zone.w,
            height: zone.h,
            borderRadius: 16,
            boxShadow: "0 0 0 9999px rgba(9,38,48,.72)",
            transition: "all .5s cubic-bezier(.4,0,.2,1)",
            pointerEvents: "none",
          }}
        />
      )}
      <button
        type="button"
        onClick={onPasser}
        className="font-mono"
        style={{
          // 78px : sous la topbar de l'app (68px) — la maquette posait 16px
          // mais sa réplique n'avait pas d'actions en haut à droite.
          position: "fixed",
          top: 78,
          right: 16,
          pointerEvents: "auto",
          height: 34,
          padding: "0 15px",
          borderRadius: 100,
          border: "1px solid rgba(243,236,221,.45)",
          background: "rgba(14,57,71,.55)",
          color: "#f3ecdd",
          fontSize: 11,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        Passer
      </button>
      <div
        style={{
          position: "fixed",
          bottom: 22,
          left: 0,
          right: 0,
          marginInline: "auto",
          width: "min(440px, 92vw)",
          pointerEvents: "auto",
        }}
      >
        {carte}
      </div>
    </div>
  );
}
