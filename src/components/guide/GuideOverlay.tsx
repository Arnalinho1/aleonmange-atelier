"use client";

import { useCallback, useEffect, useState } from "react";
import { CHAPITRES, RECAP_ETAPES } from "./chapitres";
import { Spotlight } from "./Spotlight";
import type { EtatChapitre, Progression } from "./progress";

/**
 * Moteur du guide (hub + chapitres spotlight + clôture) — chargé à la demande
 * (next/dynamic ssr:false depuis GuideContext) : zéro impact hors usage.
 * Styles fidèles à la maquette v2 (tokens CD : canard #0E3947, Rouge Léon
 * #B0342C, crèmes #F3ECDD/#FBF8F1, terracotta #B0704C, vert #2E6B4A).
 */

export type VueGuide = "hub" | "tour" | "recap";

export default function GuideOverlay({
  vue,
  chap,
  progression,
  onDemarrer,
  onFermerHub,
  onTerminer,
  onPasser,
  onFinirRecap,
  onDrawer,
}: {
  vue: VueGuide;
  chap: number;
  progression: Progression;
  onDemarrer: (n: number) => void;
  onFermerHub: () => void;
  onTerminer: (n: number, etat: EtatChapitre) => void;
  onPasser: (n: number) => void;
  onFinirRecap: () => void;
  onDrawer?: (open: boolean) => void;
}) {
  if (vue === "hub") return <Hub progression={progression} onDemarrer={onDemarrer} onFermer={onFermerHub} />;
  if (vue === "recap") return <Recap onFinir={onFinirRecap} />;
  return <Tour chap={chap} onTerminer={onTerminer} onPasser={onPasser} onDrawer={onDrawer} />;
}

/* ────────────────────────── Hub « Le guide de l'Atelier » ───────────────── */

const ETAT_LABEL: Record<EtatChapitre, string> = { fait: "fait", a_revoir: "à revoir", a_faire: "à faire" };
const BTN_LABEL: Record<EtatChapitre, string> = { fait: "Rejouer", a_revoir: "Reprendre", a_faire: "Commencer" };

function Hub({
  progression,
  onDemarrer,
  onFermer,
}: {
  progression: Progression;
  onDemarrer: (n: number) => void;
  onFermer: () => void;
}) {
  const faits = CHAPITRES.filter((c) => progression[c.num] === "fait").length;
  const pct = Math.round((faits / CHAPITRES.length) * 100);

  return (
    <div
      className="fz-scroll"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 72,
        background: "rgba(14,57,71,.6)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        overflow: "auto",
      }}
    >
      <div
        style={{
          width: "min(560px, 94vw)",
          background: "#f3ecdd",
          borderRadius: 22,
          padding: "26px 24px",
          margin: "auto",
          animation: "alm-g-fadeup .5s ease both",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div className="font-mono" style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "#b0704c" }}>
              Le guide de l&apos;Atelier
            </div>
            <h2 className="font-display" style={{ fontWeight: 800, fontSize: 24, letterSpacing: "-.02em", margin: "8px 0 0", color: "#0e3947" }}>
              Apprivoisez votre Atelier,
              <br />
              un chapitre à la fois
            </h2>
          </div>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1.5px solid #daceb6",
              background: "#fbf8f1",
              color: "#0e3947",
              fontSize: 16,
              cursor: "pointer",
              flex: "0 0 auto",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="font-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "#6b7469" }}>
            <span>{pct}% terminé</span>
            <span>{faits} / 7 chapitres</span>
          </div>
          <div style={{ height: 8, borderRadius: 100, background: "#e4dac6", marginTop: 7, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 100, background: "#b0342c", transition: "width .5s ease", width: `${pct}%` }} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
          {CHAPITRES.map((c) => {
            const etat: EtatChapitre = progression[c.num] ?? "a_faire";
            const numStyle =
              etat === "fait"
                ? { background: "#b0342c", color: "#f7f1e4" }
                : etat === "a_revoir"
                  ? { background: "#fdf3d7", color: "#8a6a1f" }
                  : { background: "#e4dac6", color: "#5a6b62" };
            return (
              <div
                key={c.num}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "#fbf8f1",
                  border: "1px solid #ece3d2",
                  borderRadius: 14,
                  padding: "12px 14px",
                }}
              >
                <span
                  className="font-mono"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    flex: "0 0 auto",
                    fontSize: 12,
                    fontWeight: 600,
                    ...numStyle,
                  }}
                >
                  {c.num}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-display" style={{ fontWeight: 700, fontSize: 14.5, color: "#0e3947" }}>{c.titre}</div>
                  <div className="font-mono" style={{ fontSize: 10.5, color: "#a9a088", marginTop: 2 }}>
                    {c.duree} · {ETAT_LABEL[etat]}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDemarrer(c.num)}
                  className="font-display"
                  style={{
                    height: 34,
                    padding: "0 15px",
                    borderRadius: 100,
                    border: "none",
                    background: "#0e3947",
                    color: "#f3ecdd",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    flex: "0 0 auto",
                  }}
                >
                  {BTN_LABEL[etat]}
                </button>
              </div>
            );
          })}
        </div>

        <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".08em", color: "#a9a088", textAlign: "center", marginTop: 14 }}>
          Progression enregistrée sur cet appareil.
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Tour (chapitres B1-B6) ─────────────────────── */

function Tour({
  chap,
  onTerminer,
  onPasser,
  onDrawer,
}: {
  chap: number;
  onTerminer: (n: number, etat: EtatChapitre) => void;
  onPasser: (n: number) => void;
  onDrawer?: (open: boolean) => void;
}) {
  const chapitre = CHAPITRES[chap - 1];
  const [etapeIdx, setEtapeIdx] = useState(0);
  const [succes, setSucces] = useState(false);
  const [cibleTrouvee, setCibleTrouvee] = useState(false);
  const etape = chapitre.etapes[Math.min(etapeIdx, chapitre.etapes.length - 1)];
  const derniere = etapeIdx >= chapitre.etapes.length - 1;

  // Drawer mobile : ouvre la sidebar quand la cible y vit, referme sinon.
  useEffect(() => {
    if (!onDrawer) return;
    onDrawer(Boolean(etape.drawer) && window.innerWidth < 1024);
  }, [etape, onDrawer]);
  useEffect(() => () => onDrawer?.(false), [onDrawer]);

  // Préremplissage (B4) à l'entrée de l'étape — remplit l'état contrôlé de la
  // saisie, AUCUNE écriture : le chef encaisse lui-même.
  useEffect(() => {
    if (etape.prefill) window.dispatchEvent(new CustomEvent("alm:guide:prefill-vente", { detail: etape.prefill }));
  }, [etape]);

  // Réussite « vente » : la saisie émet alm:guide:vente-ok après createVente OK.
  useEffect(() => {
    if (etape.action !== "vente" || succes) return;
    const ok = () => setSucces(true);
    window.addEventListener("alm:guide:vente-ok", ok);
    return () => window.removeEventListener("alm:guide:vente-ok", ok);
  }, [etape, succes]);

  const onCibleClick = useCallback(() => {
    if (etape.action === "click") setSucces(true);
  }, [etape]);
  const onCibleResolue = useCallback((t: boolean) => setCibleTrouvee(t), []);

  // Mode démonstration : cible de micro-action ABSENTE (ex : aucune commande
  // web en attente) -> spotlight simple + « Suivant », AUCUNE écriture. On ne
  // remet JAMAIS une commande confirmée en attente pour rejouer un chapitre.
  const enDemonstration = Boolean(etape.action) && !cibleTrouvee;

  const suivantOuFin = () => {
    if (derniere) onTerminer(chap, "fait");
    else {
      setSucces(false);
      setCibleTrouvee(false);
      setEtapeIdx((i) => i + 1);
    }
  };

  const boutonPill = {
    height: 42,
    padding: "0 22px",
    borderRadius: 100,
    border: "none",
    background: "#0e3947",
    color: "#f3ecdd",
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
  } as const;

  const carte = succes ? (
    <div
      style={{
        background: "#fbf8f1",
        border: "1px solid #ece3d2",
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 30px 60px -24px rgba(0,0,0,.55)",
        animation: "alm-g-fadeup .35s ease both",
        textAlign: "center",
      }}
    >
      <span
        style={{
          display: "inline-grid",
          placeItems: "center",
          width: 54,
          height: 54,
          borderRadius: "50%",
          background: "#2e6b4a",
          animation: "alm-g-popin .4s cubic-bezier(.34,1.4,.64,1) both",
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f7f1e4" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <div className="font-display" style={{ fontWeight: 800, fontSize: 21, letterSpacing: "-.02em", color: "#0e3947", marginTop: 12 }}>
        C&apos;est fait.
      </div>
      <p style={{ fontSize: 13.5, color: "#5a6b62", margin: "6px 0 0" }}>
        Chapitre {chap} terminé. Vous pourrez le rejouer quand vous voulez.
      </p>
      <button type="button" onClick={() => onTerminer(chap, "fait")} className="font-display" style={{ ...boutonPill, marginTop: 16, padding: "0 24px" }}>
        Continuer
      </button>
    </div>
  ) : (
    <div
      style={{
        background: "#fbf8f1",
        border: "1px solid #ece3d2",
        borderRadius: 20,
        padding: "22px 24px",
        boxShadow: "0 30px 60px -24px rgba(0,0,0,.55)",
        animation: "alm-g-fadeup .45s ease both",
      }}
    >
      <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "#b0704c" }}>
        Chapitre {chap} · étape {Math.min(etapeIdx, chapitre.etapes.length - 1) + 1} / {chapitre.etapes.length}
      </div>
      <div className="font-display" style={{ fontWeight: 800, fontSize: 21, letterSpacing: "-.02em", color: "#0e3947", marginTop: 7 }}>{etape.t}</div>
      <p style={{ fontSize: 14, lineHeight: 1.65, color: "#3a4a44", margin: "9px 0 0" }}>{etape.x}</p>
      {enDemonstration && (
        <p className="font-mono" style={{ fontSize: 10.5, color: "#a9a088", margin: "8px 0 0" }}>
          Mode démonstration : la cible n&apos;est pas disponible en ce moment.
        </p>
      )}
      {!etape.action || enDemonstration ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" onClick={suivantOuFin} className="font-display" style={boutonPill}>
            Suivant
          </button>
        </div>
      ) : (
        <div
          className="font-mono"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginTop: 14,
            background: "#f3e4d6",
            borderRadius: 100,
            padding: "8px 14px",
            fontSize: 10.5,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "#8a5537",
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#b0342c" }} />
          Cliquez sur la zone en surbrillance
        </div>
      )}
    </div>
  );

  return (
    <Spotlight
      cible={succes ? { sel: null } : etape.cible}
      zIndex={70}
      onPasser={() => onPasser(chap)}
      onCibleClick={succes ? undefined : onCibleClick}
      onCibleResolue={onCibleResolue}
      carte={carte}
    />
  );
}

/* ──────────────────────────── Clôture (B7) ──────────────────────────────── */

function Recap({ onFinir }: { onFinir: () => void }) {
  return (
    <>
      <Confetti />
      <div
        className="fz-scroll"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 76,
          background: "rgba(14,57,71,.6)",
          display: "grid",
          placeItems: "center",
          padding: 16,
          overflow: "auto",
        }}
      >
        <div
          style={{
            width: "min(480px, 94vw)",
            background: "#f3ecdd",
            borderRadius: 22,
            padding: "30px 28px",
            textAlign: "center",
            margin: "auto",
            animation: "alm-g-fadeup .5s ease both",
          }}
        >
          <span
            style={{
              display: "inline-grid",
              placeItems: "center",
              width: 88,
              height: 88,
              borderRadius: "50%",
              background: "#b0342c",
              color: "#f7f1e4",
              boxShadow: "inset 0 0 0 4px rgba(247,241,228,.35)",
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f7f1e4" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <div className="font-mono" style={{ fontSize: 10.5, letterSpacing: ".2em", textTransform: "uppercase", color: "#b0704c", marginTop: 16 }}>
            Badge débloqué
          </div>
          <h2 className="font-display" style={{ fontWeight: 800, fontSize: 27, letterSpacing: "-.02em", margin: "8px 0 0", color: "#0e3947" }}>
            Atelier apprivoisé
          </h2>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16, flexWrap: "wrap" }}>
            {RECAP_ETAPES.map((e) => (
              <span
                key={e}
                className="font-mono"
                style={{
                  fontSize: 10,
                  letterSpacing: ".06em",
                  background: "#fbf8f1",
                  border: "1px solid #e4dac6",
                  borderRadius: 100,
                  padding: "6px 11px",
                  color: "#3a4a44",
                }}
              >
                {e}
              </span>
            ))}
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: "#5a6b62", margin: "16px 0 0" }}>
            Ce guide reste là. Rejouez n&apos;importe quel chapitre quand vous voulez.
          </p>
          <button
            type="button"
            onClick={onFinir}
            className="font-display"
            style={{
              marginTop: 20,
              height: 46,
              padding: "0 26px",
              borderRadius: 100,
              border: "none",
              background: "#0e3947",
              color: "#f3ecdd",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Retour au guide
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * Pièces de confettis générées au chargement du module (hors rendu :
 * Math.random est impur en rendu React). Le motif est stable sur la session,
 * ce qui ne se voit pas — 70 pièces aléatoires.
 */
const CONFETTI_PIECES = Array.from({ length: 70 }, (_, i) => ({
  left: Math.random() * 100,
  w: 6 + Math.random() * 8,
  h: 10 + Math.random() * 8,
  duree: 2 + Math.random() * 1.4,
  delai: Math.random() * 0.6,
  couleur: ["#0e3947", "#f3ecdd", "#b0342c"][i % 3],
  rond: i % 3 === 0,
}));

/** Confettis de clôture ~3 s — canard / crème / Rouge Léon (physique maquette). */
function Confetti() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(t);
  }, []);
  const pieces = CONFETTI_PIECES;
  if (!visible) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, pointerEvents: "none", overflow: "hidden" }} aria-hidden>
      {pieces.map((p, i) => (
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
            animation: `alm-g-fall ${p.duree}s cubic-bezier(.2,.5,.6,1) ${p.delai}s both`,
          }}
        />
      ))}
    </div>
  );
}
