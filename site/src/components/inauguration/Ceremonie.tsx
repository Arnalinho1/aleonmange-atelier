"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Spotlight, type CibleSpec } from "./Spotlight";

/**
 * Cérémonie d'inauguration — séquence VERBATIM de la maquette CD
 * (docs/handoffs/inauguration-onboarding/inauguration.html) : accueil
 * (transition auto 3 s) -> ruban Rouge Léon satiné à ciseaux draggables
 * (+ fallback bouton, coupe auto 1,1 s) -> chute des pans 1,2 s (pan droit
 * +120 ms) + 90 confettis + fondu 0,9 s à 1,4 s -> feux d'artifice canvas
 * (4 bursts, ~70 particules, gravité +0,05/frame, friction 0,985, extinction
 * 3,6 s) -> visite en 4 chapitres (spotlight commun) -> bandeau horodaté
 * (client, décoratif, disparaît à 10 s ou premier scroll) -> certificat
 * imprimable. Purement front : AUCUN appel réseau, aucune collecte,
 * stateless, rejouable (recharger avec ?inauguration).
 *
 * Écarts assumés vs maquette (signalés au STOP Lot B) : la barre de chips de
 * démo n'existe pas ; « Revenir au site » depuis le certificat revient au
 * bandeau SANS relancer feux ni visite (la maquette relançait tout, artefact
 * de ses chips) ; ch3 et ch4 en plein écran (aucun lien Atelier au header
 * public, décision Arnaud) ; certificat « A Léon Mange » (règle nom de
 * marque, la maquette écrivait « À »).
 */

type Phase = "accueil" | "ruban" | "reveal" | "certif";

type Etat = {
  phase: Phase;
  prog: number;
  cutting: boolean;
  cut: boolean;
  fading: boolean;
  confetti: boolean;
  banner: boolean;
  ts: number | null;
  chap: number;
  tourDone: boolean;
};

const INITIAL: Etat = {
  phase: "accueil",
  prog: 0,
  cutting: false,
  cut: false,
  fading: false,
  confetti: false,
  banner: true,
  ts: null,
  chap: 0,
  tourDone: false,
};

/** Cibles spotlight de la révélation — ch3/ch4 : plein écran (décision Arnaud). */
const TOUR_TARGETS: CibleSpec[] = [
  { sel: '[data-tour="commande"]' },
  { sel: '[data-tour="compte"]' },
  { sel: null },
  { sel: null },
];

/** Textes des 4 chapitres — VERBATIM maquette. */
const CHAPS = [
  {
    titre: "Plus de clients",
    texte:
      "Votre boutique est désormais ouverte 24h sur 24. Les clients composent leur commande quand ils veulent, vous la préparez quand vous voulez.",
  },
  {
    titre: "Des clients qui reviennent",
    texte:
      "Chaque visite compte. La fidélité récompense vos habitués et leur donne une raison de plus de pousser votre porte.",
  },
  {
    titre: "Moins de charge, mieux organisé",
    texte:
      "Chaque commande arrive directement dans votre Atelier, en attente de votre confirmation. Rien à ressaisir, rien à perdre.",
  },
  {
    titre: "Une nouvelle expérience, boostée à l'IA",
    texte:
      "Ce site a été construit avec l'intelligence artificielle, pour vous faire gagner du temps là où ça compte : en cuisine, avec vos clients.",
  },
];

/** PONT CRITIQUE : seul lien entre la cérémonie et le guide de l'Atelier. */
const URL_GUIDE_ATELIER = "https://atelier.aleonmange.app/?guide=1";

/** Pièces de confettis générées au chargement du module (Math.random est impur en rendu). */
const CONFETTIS = Array.from({ length: 90 }, (_, i) => ({
  left: Math.random() * 100,
  w: 6 + Math.random() * 8,
  h: 10 + Math.random() * 8,
  duree: 2.2 + Math.random() * 1.8,
  delai: Math.random() * 0.7,
  couleur: ["#0e3947", "#f3ecdd", "#b0342c", "#f0c173"][i % 4],
  rond: i % 3 === 0,
}));

function horodatage(ts: number): string {
  const d = new Date(ts);
  const date = d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return `le ${date} à ${d.getHours()}h${String(d.getMinutes()).padStart(2, "0")}`;
}

const PAN_BASE = {
  position: "absolute" as const,
  top: "50%",
  height: 88,
  marginTop: -44,
  overflow: "hidden" as const,
  transition: "transform 1.2s cubic-bezier(.34,.05,.6,1), opacity 1.1s ease",
};

export default function Ceremonie() {
  const [s, setS] = useState<Etat>(INITIAL);
  const etatRef = useRef<Etat>(INITIAL);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Miroir de l'état pour les boucles RAF/timers (jamais de lecture périmée).
  useEffect(() => {
    etatRef.current = s;
  });

  const patch = useCallback((p: Partial<Etat>) => setS((prev) => ({ ...prev, ...p })), []);

  /* ── Feux d'artifice canvas (physique maquette) ─────────────────────────── */
  const startFireworks = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    c.style.opacity = "1";
    const colors = ["#0e3947", "#b0342c", "#f0c173", "#f3ecdd"];
    let parts: { x: number; y: number; vx: number; vy: number; life: number; col: string; r: number }[] = [];
    const burst = (x: number, y: number) => {
      const col = colors[Math.floor(Math.random() * 4)];
      for (let i = 0; i < 70; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 2 + Math.random() * 4.2;
        parts.push({
          x,
          y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          life: 1,
          col: i % 4 === 0 ? colors[Math.floor(Math.random() * 4)] : col,
          r: 1.5 + Math.random() * 2.2,
        });
      }
    };
    [0, 500, 1100, 1800].forEach((t) =>
      setTimeout(() => burst(c.width * (0.18 + Math.random() * 0.64), c.height * (0.14 + Math.random() * 0.34)), t)
    );
    const t0 = performance.now();
    const step = (t: number) => {
      ctx.clearRect(0, 0, c.width, c.height);
      parts.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.life -= 0.011;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 7);
        ctx.fill();
      });
      parts = parts.filter((p) => p.life > 0);
      if (t - t0 < 3600 && etatRef.current.phase === "reveal") requestAnimationFrame(step);
      else {
        c.style.opacity = "0";
        setTimeout(() => ctx.clearRect(0, 0, c.width, c.height), 650);
      }
    };
    requestAnimationFrame(step);
  }, []);

  /* ── Visite en 4 chapitres ──────────────────────────────────────────────── */
  const goChap = useCallback(
    (n: number) => {
      if (n > 4) {
        // Fin de visite : bandeau horodaté, retiré à 10 s ou au premier scroll.
        patch({ chap: 0, tourDone: true, banner: true });
        setTimeout(() => {
          const e = etatRef.current;
          if (e.phase === "reveal" && e.tourDone) patch({ banner: false });
        }, 10000);
        return;
      }
      if (!TOUR_TARGETS[n - 1].sel) window.scrollTo(0, 0);
      patch({ chap: n });
    },
    [patch]
  );

  const startReveal = useCallback(() => {
    patch({
      phase: "reveal",
      cut: true,
      banner: false,
      fading: false,
      confetti: false,
      chap: 0,
      tourDone: false,
      ts: etatRef.current.ts ?? Date.now(),
    });
    startFireworks();
    setTimeout(() => goChap(1), 600);
  }, [patch, startFireworks, goChap]);

  /* ── Coupe du ruban ─────────────────────────────────────────────────────── */
  const finishCut = useCallback(() => {
    if (etatRef.current.cut) return;
    patch({ cut: true, prog: 1, confetti: true, ts: Date.now() });
    setTimeout(() => patch({ fading: true }), 1400);
    setTimeout(() => startReveal(), 2300);
  }, [patch, startReveal]);

  const couperAuto = useCallback(() => {
    if (etatRef.current.cut) return;
    const t0 = performance.now();
    const p0 = etatRef.current.prog;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 1100);
      const val = p0 + (1 - p0) * (k * k * (3 - 2 * k));
      setS((prev) => ({ ...prev, prog: val }));
      if (k < 1) requestAnimationFrame(step);
      else finishCut();
    };
    requestAnimationFrame(step);
  }, [finishCut]);

  const pDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!etatRef.current.cut) {
      e.currentTarget.setPointerCapture(e.pointerId);
      patch({ cutting: true });
    }
  };
  const pMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const e0 = etatRef.current;
    if (!e0.cutting || e0.cut) return;
    const r = e.currentTarget.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, ((e.clientX - r.left) / r.width - 0.08) / 0.84));
    if (p > e0.prog) patch({ prog: p });
    if (p >= 0.985) finishCut();
  };
  const pUp = () => patch({ cutting: false });

  /* ── Effets globaux ─────────────────────────────────────────────────────── */
  // Accueil : transition automatique vers le ruban après 3 s.
  useEffect(() => {
    const t = setTimeout(() => setS((prev) => (prev.phase === "accueil" ? { ...prev, phase: "ruban" } : prev)), 3000);
    return () => clearTimeout(t);
  }, []);

  // Premier scroll après la visite : le bandeau décoratif s'efface.
  useEffect(() => {
    const onScroll = () =>
      setS((prev) => (prev.phase === "reveal" && prev.tourDone && prev.banner ? { ...prev, banner: false } : prev));
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Impression du certificat : seule la carte sort (règles @media print, globals.css).
  useEffect(() => {
    if (s.phase !== "certif") return;
    document.body.classList.add("alm-i-print");
    return () => document.body.classList.remove("alm-i-print");
  }, [s.phase]);

  /* ── Dérivés de rendu ───────────────────────────────────────────────────── */
  const pct = Math.round(s.prog * 100);
  const cutX = 8 + s.prog * 84; // % de la largeur (course utile des ciseaux)
  const fall = s.cut;
  const showBanner = s.phase === "reveal" && s.banner && s.chap === 0;
  const enTour = s.phase === "reveal" && s.chap > 0;
  const quand = s.ts != null ? horodatage(s.ts) : "";

  return (
    <div className="alm-i-racine" style={{ fontFamily: "var(--font-sans)", color: "#0e3947" }}>
      {/* ── Bandeau horodaté (décoratif, après la visite) ─────────────────── */}
      {showBanner && (
        <div
          className="alm-i-noprint alm-i-bandeau"
          style={{
            position: "fixed",
            top: 18,
            left: 0,
            right: 0,
            marginInline: "auto",
            width: "fit-content",
            maxWidth: "92vw",
            zIndex: 60,
            background: "#0e3947",
            color: "#f3ecdd",
            borderRadius: 100,
            padding: "12px 22px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            boxShadow: "0 24px 48px -20px rgba(14,57,71,.6)",
            animation: "alm-i-fadeup .5s ease both",
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f0c173", flex: "0 0 auto" }} />
          <span
            className="alm-i-bandeau-texte"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: ".02em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Site ouvert par Audrey Depouilly et Victorien Thebault, {quand}
          </span>
          <button
            type="button"
            onClick={() => patch({ phase: "certif" })}
            style={{
              flex: "0 0 auto",
              height: 30,
              padding: "0 13px",
              borderRadius: 100,
              border: "1px solid rgba(240,193,115,.5)",
              background: "transparent",
              color: "#f0c173",
              fontFamily: "var(--font-display)",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Garder un souvenir
          </button>
          <a
            href={URL_GUIDE_ATELIER}
            style={{
              flex: "0 0 auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 30,
              padding: "0 14px",
              borderRadius: 100,
              background: "#b0342c",
              color: "#fff",
              fontFamily: "var(--font-display)",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Découvrir votre Atelier
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        </div>
      )}

      {/* ── Écran 1 : accueil cérémonie ───────────────────────────────────── */}
      {s.phase === "accueil" && (
        <div
          className="alm-i-noprint"
          style={{ position: "fixed", inset: 0, zIndex: 70, background: "#f3ecdd", display: "grid", placeItems: "center", padding: 24 }}
        >
          <div style={{ textAlign: "center", maxWidth: 560, animation: "alm-i-fadeup .7s ease both" }}>
            <Image src="/alm-mark.png" alt="Léon" width={92} height={92} style={{ objectFit: "contain", display: "inline-block" }} />
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: ".2em",
                textTransform: "uppercase",
                color: "#b0704c",
                marginTop: 20,
              }}
            >
              Inauguration officielle
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "clamp(30px,6vw,48px)",
                lineHeight: 1.06,
                letterSpacing: "-.025em",
                margin: "14px 0 0",
              }}
            >
              Audrey, Victorien,
              <br />
              votre site vous attend.
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.65, color: "#5a6b62", margin: "16px 0 0" }}>
              Il ne manque plus qu&apos;un geste de vos mains, comme au labo.
            </p>
            <button
              type="button"
              onClick={() => patch({ phase: "ruban" })}
              style={{
                marginTop: 28,
                height: 50,
                padding: "0 28px",
                borderRadius: 100,
                border: "none",
                background: "#0e3947",
                color: "#f3ecdd",
                fontFamily: "var(--font-display)",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Entrer dans la cérémonie
            </button>
          </div>
        </div>
      )}

      {/* ── Écran 2 : le ruban ────────────────────────────────────────────── */}
      {s.phase === "ruban" && (
        <div
          className="alm-i-noprint"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            background: "#f3ecdd",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            transition: "opacity .9s ease",
            opacity: s.fading ? 0 : 1,
          }}
        >
          <div style={{ textAlign: "center", padding: "0 24px", animation: "alm-i-fadeup .6s ease both" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: "#b0704c" }}>
              À vous de jouer
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "clamp(22px,4vw,32px)",
                letterSpacing: "-.02em",
                margin: "10px 0 0",
              }}
            >
              Coupez le ruban
            </h2>
            <p style={{ fontSize: 14, color: "#5a6b62", margin: "8px 0 0" }}>Faites glisser les ciseaux le long du ruban.</p>
          </div>

          {/* zone ruban : drag des ciseaux (pointer events, touch-action none) */}
          <div
            onPointerDown={pDown}
            onPointerMove={pMove}
            onPointerUp={pUp}
            style={{ position: "relative", height: 220, marginTop: 40, touchAction: "none", cursor: "grab", userSelect: "none" }}
          >
            {/* pan gauche */}
            <div
              style={{
                ...PAN_BASE,
                left: 0,
                width: `${cutX}%`,
                clipPath: "polygon(0 0,100% 0,97% 18%,100% 36%,96% 55%,100% 74%,97% 100%,0 100%)",
                transformOrigin: "0 50%",
                transform: fall ? "translateY(58vh) rotate(9deg)" : `rotate(${s.prog * 2.5}deg) translateY(${s.prog * 8}px)`,
                opacity: fall ? 0 : 1,
              }}
            >
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#c74a42 0%,#b0342c 34%,#8e251f 78%,#b0342c 100%)" }} />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(100deg,transparent 30%,rgba(255,255,255,.28) 46%,transparent 60%)",
                  backgroundSize: "220% 100%",
                  animation: "alm-i-sheen 4.5s linear infinite",
                }}
              />
            </div>
            {/* pan droit (chute décalée de 120 ms) */}
            <div
              style={{
                ...PAN_BASE,
                right: 0,
                width: `${100 - cutX}%`,
                clipPath: "polygon(3% 0,100% 0,100% 100%,0 100%,4% 80%,0 60%,3% 40%,0 20%)",
                transformOrigin: "100% 50%",
                transform: fall ? "translateY(62vh) rotate(-12deg)" : "none",
                opacity: fall ? 0 : 1,
                transitionDelay: fall ? ".12s" : "0s",
              }}
            >
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#c74a42 0%,#b0342c 34%,#8e251f 78%,#b0342c 100%)" }} />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(100deg,transparent 30%,rgba(255,255,255,.28) 46%,transparent 60%)",
                  backgroundSize: "220% 100%",
                  animation: "alm-i-sheen 4.5s linear infinite",
                }}
              />
              {/* nœud à droite */}
              <div style={{ position: "absolute", right: "9%", top: "50%", transform: "translateY(-50%)" }}>
                <svg width="86" height="72" viewBox="0 0 86 72" aria-hidden>
                  <path d="M43 36 C28 12 8 10 6 26 C4 40 24 44 43 36 Z" fill="#8e251f" />
                  <path d="M43 36 C58 12 78 10 80 26 C82 40 62 44 43 36 Z" fill="#8e251f" />
                  <path d="M43 36 C30 16 12 15 10 27 C9 38 26 42 43 36 Z" fill="#b0342c" />
                  <path d="M43 36 C56 16 74 15 76 27 C77 38 60 42 43 36 Z" fill="#b0342c" />
                  <circle cx="43" cy="36" r="9" fill="#8e251f" />
                </svg>
              </div>
            </div>
            {/* ciseaux */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: `${cutX}%`,
                transform: "translate(-50%,-46%) rotate(90deg)",
                transition: "opacity .4s",
                pointerEvents: "none",
                opacity: fall ? 0 : 1,
              }}
            >
              <svg
                width="58"
                height="58"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0e3947"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: "drop-shadow(0 6px 10px rgba(14,57,71,.35))" }}
                aria-hidden
              >
                <circle cx="6" cy="6" r="3" />
                <circle cx="6" cy="18" r="3" />
                <path d="M8.1 8.1 20 20M8.1 15.9 20 4" />
              </svg>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 34 }}>
            <button
              type="button"
              onClick={couperAuto}
              style={{
                height: 44,
                padding: "0 22px",
                borderRadius: 100,
                border: "1.5px solid #daceb6",
                background: "#fbf8f1",
                color: "#0e3947",
                fontFamily: "var(--font-display)",
                fontSize: 13.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Couper le ruban
            </button>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                color: "#a9a088",
                marginTop: 12,
              }}
            >
              {s.cut ? "Ruban coupé · bienvenue" : `${pct}% coupé`}
            </div>
          </div>
        </div>
      )}

      {/* ── Confettis de la coupe ─────────────────────────────────────────── */}
      {s.confetti && (
        <div className="alm-i-noprint" style={{ position: "fixed", inset: 0, zIndex: 80, pointerEvents: "none", overflow: "hidden" }} aria-hidden>
          {CONFETTIS.map((p, i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                top: "-4vh",
                left: `${p.left}vw`,
                width: p.w,
                height: p.h,
                background: p.couleur,
                borderRadius: p.rond ? "50%" : 2,
                animation: `alm-i-fall ${p.duree}s cubic-bezier(.2,.5,.6,1) ${p.delai}s both`,
              }}
            />
          ))}
        </div>
      )}

      {/* ── Feux d'artifice (canvas, sous le spotlight) ───────────────────── */}
      <canvas
        ref={canvasRef}
        className="alm-i-noprint"
        style={{ position: "fixed", inset: 0, zIndex: 65, pointerEvents: "none", opacity: 0, transition: "opacity .6s ease" }}
        aria-hidden
      />

      {/* ── Écran 3 : visite en 4 chapitres ───────────────────────────────── */}
      {enTour && (
        <Spotlight
          cible={TOUR_TARGETS[s.chap - 1]}
          zIndex={66}
          onPasser={() => goChap(5)}
          carte={
            <div
              style={{
                background: "#fbf8f1",
                border: "1px solid #ece3d2",
                borderRadius: 20,
                padding: "22px 24px",
                boxShadow: "0 30px 60px -24px rgba(0,0,0,.55)",
                animation: "alm-i-fadeup .45s ease both",
              }}
            >
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "#b0704c" }}>
                Chapitre {s.chap} / 4
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 21, letterSpacing: "-.02em", color: "#0e3947", marginTop: 7 }}>
                {CHAPS[s.chap - 1].titre}
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: "#3a4a44", margin: "9px 0 0" }}>{CHAPS[s.chap - 1].texte}</p>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => goChap(s.chap + 1)}
                  style={{
                    height: 42,
                    padding: "0 22px",
                    borderRadius: 100,
                    border: "none",
                    background: "#0e3947",
                    color: "#f3ecdd",
                    fontFamily: "var(--font-display)",
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {s.chap < 4 ? "Suivant" : "Terminer"}
                </button>
              </div>
            </div>
          }
        />
      )}

      {/* ── Écran 4 : certificat imprimable ───────────────────────────────── */}
      {s.phase === "certif" && (
        <div
          className="alm-i-certif-scene"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 85,
            background: "rgba(14,57,71,.55)",
            display: "grid",
            placeItems: "center",
            padding: 20,
            overflow: "auto",
          }}
        >
          <div style={{ animation: "alm-i-fadeup .5s ease both" }}>
            <div
              className="alm-i-certif"
              style={{
                width: "min(440px,92vw)",
                aspectRatio: "3/4.15",
                background: "#f7f1e4",
                borderRadius: 6,
                padding: "34px 34px 28px",
                position: "relative",
                boxShadow: "0 40px 80px -30px rgba(0,0,0,.5)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div style={{ position: "absolute", inset: 12, border: "1.5px solid #0e3947", borderRadius: 3, pointerEvents: "none" }} />
              <div style={{ position: "absolute", inset: 17, border: "1px solid rgba(176,52,44,.45)", borderRadius: 2, pointerEvents: "none" }} />
              <Image src="/alm-mark.png" alt="Léon" width={74} height={74} style={{ objectFit: "contain", marginTop: 14 }} />
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: ".26em",
                  textTransform: "uppercase",
                  color: "#b0704c",
                  marginTop: 16,
                }}
              >
                Inauguration officielle
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: 25,
                  letterSpacing: "-.02em",
                  color: "#0e3947",
                  marginTop: 8,
                  lineHeight: 1.1,
                }}
              >
                du site
                <br />
                A Léon Mange
              </div>
              <div style={{ width: 44, height: 1.5, background: "#b0342c", margin: "16px 0" }} />
              <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "#5a6b62", margin: 0, maxWidth: 290 }}>
                Le ruban a été coupé et le site ouvert au public par
              </p>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: "#0e3947", marginTop: 10 }}>
                Audrey Depouilly
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#a9a088", margin: "3px 0" }}>
                et
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: "#0e3947" }}>Victorien Thebault</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#5a6b62", marginTop: 14 }}>{quand}</div>
              <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 10, paddingBottom: 8 }}>
                <span
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: "50%",
                    background: "#b0342c",
                    color: "#f7f1e4",
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: 15,
                    boxShadow: "inset 0 0 0 3px rgba(247,241,228,.35)",
                    transform: "rotate(-8deg)",
                  }}
                >
                  ALM
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    letterSpacing: ".18em",
                    textTransform: "uppercase",
                    color: "#b0704c",
                    textAlign: "left",
                  }}
                >
                  Cuisine · Cœur
                  <br />
                  Convivialité
                </span>
              </div>
            </div>
            <div className="alm-i-noprint" style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  height: 44,
                  padding: "0 22px",
                  borderRadius: 100,
                  border: "none",
                  background: "#b0342c",
                  color: "#fff",
                  fontFamily: "var(--font-display)",
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Imprimer
              </button>
              <button
                type="button"
                onClick={() => patch({ phase: "reveal", banner: true, chap: 0, tourDone: true })}
                style={{
                  height: 44,
                  padding: "0 22px",
                  borderRadius: 100,
                  border: "1px solid rgba(243,236,221,.5)",
                  background: "transparent",
                  color: "#f3ecdd",
                  fontFamily: "var(--font-display)",
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Revenir au site
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
