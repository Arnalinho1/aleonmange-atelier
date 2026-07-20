"use client";

import Link from "next/link";
import Image from "next/image";
import { COORDONNEES, HORAIRES_BOUTIQUE } from "@/lib/contenu";
import type { LigneHoraire } from "@/lib/data/horaires";
import { ouvrirLettre } from "./EnTete";

/**
 * Pied de page : coordonnees REELLES (§06), horaires, reseaux, mentions.
 * Composant client (bouton lettre d'info) : les horaires pilotes par
 * l'Atelier (0023) arrivent en prop du layout serveur.
 */
export function PiedDePage({ horaires = HORAIRES_BOUTIQUE as readonly LigneHoraire[] }: { horaires?: readonly LigneHoraire[] }) {
  return (
    <footer className="mt-16 bg-canard text-surface-2">
      <div className="mx-auto max-w-[1280px] px-4 md:px-8 py-12 grid gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <span className="inline-block rounded-xl bg-surface-2 p-2.5">
            <Image src="/logo-aleonmange.webp" alt="A Léon Mange" width={132} height={62} className="h-[44px] w-auto" />
          </span>
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-or mt-3">
            Boutique · Food truck · Traiteur
          </p>
          <p className="text-[13.5px] leading-relaxed text-surface-2/80 mt-4 max-w-[300px]">
            Cuisine artisanale du Beaujolais, par {"Audrey et Victorien"}. Des plats faits maison,
            des produits de producteurs, trois façons d&apos;en profiter.
          </p>
          <button
            type="button"
            onClick={ouvrirLettre}
            className="mt-5 inline-flex items-center h-[42px] px-[18px] rounded-pille bg-[var(--accent)] text-white font-display font-bold text-[13.5px]"
          >
            Restez informé
          </button>
        </div>

        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[.14em] text-or">Nous trouver</p>
          <p className="text-[13.5px] leading-relaxed text-surface-2/85 mt-3">
            {COORDONNEES.adresse}
            <br />
            {COORDONNEES.region}
          </p>
          <a href={COORDONNEES.plan} target="_blank" rel="noopener noreferrer" className="inline-block text-[13px] font-semibold underline underline-offset-4 mt-2 text-surface-2">
            Voir le plan d&apos;accès
          </a>
        </div>

        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[.14em] text-or">Horaires boutique</p>
          <ul className="mt-3 space-y-1.5 text-[13.5px] text-surface-2/85">
            {horaires.map((h) => (
              <li key={h.jours}>
                <span className="font-semibold text-surface-2">{h.jours}</span>
                <br />
                {h.heures}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[.14em] text-or">Nous contacter</p>
          <ul className="mt-3 space-y-1.5 text-[13.5px]">
            <li>
              <a href={`tel:${COORDONNEES.telephoneLien}`} className="text-surface-2 font-semibold">
                {COORDONNEES.telephone}
              </a>
            </li>
            <li>
              <a href={`mailto:${COORDONNEES.email}`} className="text-surface-2/85 underline underline-offset-4">
                {COORDONNEES.email}
              </a>
            </li>
            <li className="pt-2 flex gap-3">
              <a href={COORDONNEES.instagram} target="_blank" rel="noopener noreferrer" className="text-surface-2/85 underline underline-offset-4">
                Instagram
              </a>
              <a href={COORDONNEES.facebook} target="_blank" rel="noopener noreferrer" className="text-surface-2/85 underline underline-offset-4">
                Facebook
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-[1280px] px-4 md:px-8 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-surface-2/60">
          <span>© {new Date().getFullYear()} A Léon Mange</span>
          <Link href="/mentions-legales" className="underline underline-offset-4">
            Mentions légales
          </Link>
        </div>
      </div>
    </footer>
  );
}
