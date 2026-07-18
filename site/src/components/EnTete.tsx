"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * En-tete du site : nav horizontale (desktop) + menu PLEIN ECRAN (mobile,
 * reference maquette mobile). « Mon compte » de la maquette est
 * volontairement ABSENT en Vague 1 : l'espace client authentifie attend la
 * refonte RLS — ne rien promettre d'authentifie (relais §5).
 */

const LIENS = [
  { href: "/", label: "Accueil" },
  { href: "/boutique", label: "La Boutique" },
  { href: "/traiteur", label: "Le Traiteur" },
  { href: "/food-truck", label: "Le Food truck" },
  { href: "/histoire", label: "Notre histoire" },
  { href: "/contact", label: "Contact" },
];

export function ouvrirLettre() {
  window.dispatchEvent(new CustomEvent("alm:lettre"));
}

export function EnTete() {
  const chemin = usePathname();
  const [menuOuvert, setMenuOuvert] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOuvert ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOuvert]);

  return (
    <header className="sticky top-0 z-40 bg-page/95 backdrop-blur border-b border-bord">
      <div className="mx-auto max-w-[1280px] flex items-center gap-4 px-4 md:px-8 h-[68px]">
        <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="A Léon Mange, accueil">
          <span className="grid place-items-center w-10 h-10 rounded-full overflow-hidden bg-surface-2 ring-1 ring-bord-2">
            <Image src="/alm-mark.png" alt="" width={40} height={40} className="object-cover" />
          </span>
          <span className="leading-tight">
            <span className="block font-display font-extrabold text-[17px] text-canard">A Léon Mange</span>
            <span className="block font-mono text-[9px] uppercase tracking-[.18em] text-terracotta">Beaujolais</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6 mx-auto" aria-label="Navigation principale">
          {LIENS.map((l) => {
            const actif = chemin === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`text-[14px] ${actif ? "font-bold text-[var(--accent)]" : "font-semibold text-canard hover:text-[var(--accent)]"} transition-colors`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto lg:ml-0 flex items-center gap-2.5">
          <button
            type="button"
            onClick={ouvrirLettre}
            className="hidden sm:inline-flex items-center h-[42px] px-[18px] rounded-pille bg-[var(--accent)] text-white font-display font-bold text-[13.5px] transition-opacity hover:opacity-90"
          >
            Restez informé
          </button>
          <button
            type="button"
            onClick={() => setMenuOuvert(true)}
            className="lg:hidden grid place-items-center w-[42px] h-[42px] rounded-pille border border-bord-2 bg-surface text-canard"
            aria-label="Ouvrir le menu"
            aria-expanded={menuOuvert}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Menu mobile plein ecran */}
      {menuOuvert && (
        <div className="fixed inset-0 z-50 bg-page flex flex-col lg:hidden">
          <div className="flex items-center justify-between px-4 h-[68px] border-b border-bord">
            <span className="font-display font-extrabold text-[17px] text-canard">A Léon Mange</span>
            <button
              type="button"
              onClick={() => setMenuOuvert(false)}
              className="grid place-items-center w-[42px] h-[42px] rounded-pille border border-bord-2 bg-surface text-canard"
              aria-label="Fermer le menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="flex-1 flex flex-col justify-center gap-1 px-6" aria-label="Navigation mobile">
            {LIENS.map((l) => {
              const actif = chemin === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOuvert(false)}
                  className={`py-3.5 font-display font-extrabold text-[28px] leading-tight ${actif ? "text-[var(--accent)]" : "text-canard"}`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="px-6 pb-10">
            <button
              type="button"
              onClick={() => {
                setMenuOuvert(false);
                ouvrirLettre();
              }}
              className="w-full inline-flex items-center justify-center h-[52px] rounded-pille bg-[var(--accent)] text-white font-display font-bold text-[15px]"
            >
              Restez informé
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
