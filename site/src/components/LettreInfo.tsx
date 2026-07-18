"use client";

import { useEffect, useState } from "react";

/**
 * Modale « lettre d'information » (d-lettre). L'INSCRIPTION est une ecriture
 * (newsletter_abonne + opt-in RGPD) : Vague 2. En Vague 1 le parcours existe
 * et aboutit a un etat clair « Ouverture prochainement » — pas de bouton
 * mort, pas de fausse promesse d'envoi.
 * S'ouvre via l'evenement global "alm:lettre" (en-tete + pied de page).
 */
export function LettreInfo() {
  const [ouverte, setOuverte] = useState(false);

  useEffect(() => {
    const ouvrir = () => setOuverte(true);
    window.addEventListener("alm:lettre", ouvrir);
    return () => window.removeEventListener("alm:lettre", ouvrir);
  }, []);

  if (!ouverte) return null;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center p-4 bg-canard/55"
      onClick={() => setOuverte(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Lettre d'information"
    >
      <div
        className="w-full max-w-[440px] bg-surface rounded-carte-lg border border-bord p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-mono text-[11px] uppercase tracking-[.14em] text-terracotta">Lettre d&apos;information</p>
        <h2 className="font-display font-extrabold text-[24px] text-canard leading-tight mt-2">
          Les nouvelles de la maison
        </h2>
        <p className="text-[14px] leading-relaxed text-texte-2 mt-3">
          Les plats de la semaine, les emplacements du food truck et les nouveautés de la boutique,
          directement dans votre boîte mail.
        </p>
        <div className="mt-5 rounded-carte border border-bord-2 bg-surface-2 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[.12em] text-vert bg-vert-fond inline-block px-2.5 py-1 rounded-pille">
            Ouverture prochainement
          </p>
          <p className="text-[13px] leading-relaxed text-texte-3 mt-2.5">
            L&apos;inscription en ligne arrive bientôt. En attendant, suivez-nous sur Instagram et Facebook,
            ou passez nous voir en boutique.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOuverte(false)}
          className="mt-5 w-full inline-flex items-center justify-center h-[46px] rounded-pille border border-bord-2 bg-surface text-canard font-display font-bold text-[14px]"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
