"use client";

import Link from "next/link";
import Image from "next/image";
import { COORDONNEES, HORAIRES_BOUTIQUE } from "@/lib/contenu";
import type { LigneHoraire } from "@/lib/data/horaires";
import { ouvrirLettre } from "./EnTete";

/**
 * Pied de page GLOBAL (refonte maquette CD "Notre Histoire", docs/handoffs/) :
 * bande beige claire (bg-bande = header), logo complet pose directement, 4
 * colonnes + barre legale. Composant client (CTA lettre d'info via ouvrirLettre).
 * CONFIG-SOURCE : adresse / plan / horaires / tel / email / reseaux lus de la
 * base (COORDONNEES + prop horaires pilotee par l'Atelier, 0023), jamais en dur.
 */
const PITCH = "Notre cuisine faite maison en Beaujolais. Des plats préparés au labo de Létra, trois façons d'en profiter.";

export function PiedDePage({ horaires = HORAIRES_BOUTIQUE as readonly LigneHoraire[] }: { horaires?: readonly LigneHoraire[] }) {
  return (
    <footer className="mt-16 bg-bande border-t border-[#e1d7c3]">
      <div className="mx-auto max-w-[1280px] px-4 md:px-8 pt-10 md:pt-11 pb-6">
        {/* Bandeau marque */}
        <div className="flex flex-wrap items-center gap-4 md:gap-[18px] pb-6 md:pb-[30px] border-b border-[#e1d7c3]">
          <Image src="/logo-alm.webp" alt="A Léon Mange" width={162} height={72} className="h-[60px] md:h-[72px] w-auto shrink-0" />
          <div className="flex-1 min-w-0 order-3 basis-full md:order-none md:basis-auto">
            <div className="font-mono text-[11px] uppercase tracking-[.16em] text-terracotta">Cuisine · Cœur · Convivialité</div>
          </div>
          <button
            type="button"
            onClick={ouvrirLettre}
            className="ml-auto md:ml-0 inline-flex items-center h-[44px] px-[22px] rounded-pille bg-[var(--accent)] text-white font-display font-bold text-[14px] shrink-0"
          >
            Restez informé
          </button>
        </div>

        {/* 4 colonnes */}
        <div className="grid gap-8 md:gap-[34px] sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] pt-8 md:pt-[30px]">
          <div>
            <p className="text-[13.5px] leading-[1.6] text-texte-3 max-w-[260px]">{PITCH}</p>
            <div className="flex gap-2.5 mt-4">
              <a href={COORDONNEES.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-[38px] h-[38px] rounded-[10px] border border-[#daceb6] bg-surface text-canard flex items-center justify-center transition-colors hover:border-canard">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" /></svg>
              </a>
              <a href={COORDONNEES.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-[38px] h-[38px] rounded-[10px] border border-[#daceb6] bg-surface text-canard flex items-center justify-center transition-colors hover:border-canard">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.8 3.7-3.8 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.5V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z" /></svg>
              </a>
            </div>
          </div>

          <div>
            <div className="font-mono text-[10.5px] uppercase tracking-[.14em] text-terracotta">Nous trouver</div>
            <p className="text-[14px] leading-[1.65] text-encre mt-[11px]">
              {COORDONNEES.adresse}
              <br />
              {COORDONNEES.region}
            </p>
            <a href={COORDONNEES.plan} target="_blank" rel="noopener noreferrer" className="inline-block mt-2.5 text-[13.5px] font-bold text-canard hover:underline underline-offset-4">
              Voir le plan d&apos;accès
            </a>
          </div>

          <div>
            <div className="font-mono text-[10.5px] uppercase tracking-[.14em] text-terracotta">Horaires boutique</div>
            <div className="mt-[11px] text-[13.5px] flex flex-col gap-1.5">
              {horaires.map((h) => (
                <div key={h.jours}>
                  <div className="font-bold text-encre">{h.jours}</div>
                  <div className="text-texte-3">{h.heures}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="font-mono text-[10.5px] uppercase tracking-[.14em] text-terracotta">Nous contacter</div>
            <div className="mt-[11px] text-[14px] leading-[1.5]">
              <a href={`tel:${COORDONNEES.telephoneLien}`} className="text-canard font-bold">
                {COORDONNEES.telephone}
              </a>
              <div className="mt-1.5">
                <a href={`mailto:${COORDONNEES.email}`} className="text-encre hover:underline underline-offset-4">
                  {COORDONNEES.email}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Barre legale */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-7 pt-[18px] border-t border-[#e1d7c3]">
          <div className="text-[13px] text-texte-2">
            © {new Date().getFullYear()} A Léon Mange
            <span className="mx-3 text-[#cfc3a9]">·</span>
            <Link href="/mentions-legales" className="text-texte-2 hover:underline underline-offset-4">
              Mentions légales
            </Link>
            <span className="mx-3 text-[#cfc3a9]">·</span>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("alm:cookies"))}
              className="text-texte-2 hover:underline underline-offset-4"
            >
              Gérer les cookies
            </button>
          </div>
          <div className="font-mono text-[9.5px] tracking-[.1em] text-[#a9a088]">BEAUJOLAIS · FAIT MAISON</div>
        </div>
      </div>
    </footer>
  );
}
